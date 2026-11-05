package co.trendly.alerta;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import co.trendly.historico.CapturaGuardada;
import co.trendly.recoleccion.CicloTerminado;
import co.trendly.sugerencia.SugerenciaService;

/**
 * Analiza cada captura después del commit y en otro hilo, para no frenar la recolección: primero recalcula la
 * sugerencia (SCRUM-46), porque la alerta la incluye, y luego evalúa las alertas (SCRUM-47). Un solo hilo mantiene las
 * capturas en orden; un fallo en la sugerencia no impide la alerta. Los correos (SCRUM-48) van en la misma cola al
 * terminar el ciclo: así salen después de analizar todas sus capturas, en un solo correo por vendedor. Las notificaciones
 * push (SCRUM-52) salen en el mismo momento que el correo; si una de las dos falla, la otra sale igual.
 */
@Component
public class AnalisisCapturaListener {

    private static final Logger log = LoggerFactory.getLogger(AnalisisCapturaListener.class);

    private final SugerenciaService sugerencias;
    private final AlertaService alertas;
    private final CorreoAlertasService correos;
    private final PushAlertasService push;
    private final Executor ejecutor;

    @Autowired
    public AnalisisCapturaListener(SugerenciaService sugerencias, AlertaService alertas, CorreoAlertasService correos,
            PushAlertasService push) {
        this(sugerencias, alertas, correos, push, Executors.newSingleThreadExecutor(Thread.ofPlatform().name("analisis").daemon().factory()));
    }

    AnalisisCapturaListener(SugerenciaService sugerencias, AlertaService alertas, CorreoAlertasService correos,
            PushAlertasService push, Executor ejecutor) {
        this.sugerencias = sugerencias;
        this.alertas = alertas;
        this.correos = correos;
        this.push = push;
        this.ejecutor = ejecutor;
    }

    @TransactionalEventListener
    void alGuardarCaptura(CapturaGuardada captura) {
        ejecutor.execute(() -> analizar(captura));
    }

    @EventListener
    void alTerminarCiclo(CicloTerminado ciclo) {
        ejecutor.execute(this::avisar);
    }

    private void avisar() {
        try {
            correos.enviarPendientes();
        } catch (RuntimeException e) {
            log.error("No se pudieron enviar los correos de alertas", e);
        }
        try {
            push.enviarPendientes();
        } catch (RuntimeException e) {
            log.error("No se pudieron enviar las notificaciones push de alertas", e);
        }
    }

    private void analizar(CapturaGuardada captura) {
        try {
            sugerencias.recalcular(captura.productoId());
        } catch (RuntimeException e) {
            log.error("No se pudo recalcular la sugerencia del producto {}", captura.productoId(), e);
        }
        try {
            alertas.evaluar(captura);
        } catch (RuntimeException e) {
            log.error("No se pudieron evaluar las alertas del monitoreo {}", captura.monitoreoId(), e);
        }
    }
}
