package co.trendly.alerta;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import co.trendly.historico.CapturaGuardada;
import co.trendly.sugerencia.SugerenciaService;

/**
 * Analiza cada captura después del commit y en otro hilo, para no frenar la recolección: primero recalcula la
 * sugerencia (SCRUM-46), porque la alerta la incluye, y luego evalúa las alertas (SCRUM-47). Un solo hilo mantiene las
 * capturas en orden; un fallo en la sugerencia no impide la alerta.
 */
@Component
public class AnalisisCapturaListener {

    private static final Logger log = LoggerFactory.getLogger(AnalisisCapturaListener.class);

    private final SugerenciaService sugerencias;
    private final AlertaService alertas;
    private final Executor ejecutor;

    @Autowired
    public AnalisisCapturaListener(SugerenciaService sugerencias, AlertaService alertas) {
        this(sugerencias, alertas, Executors.newSingleThreadExecutor(Thread.ofPlatform().name("analisis").daemon().factory()));
    }

    AnalisisCapturaListener(SugerenciaService sugerencias, AlertaService alertas, Executor ejecutor) {
        this.sugerencias = sugerencias;
        this.alertas = alertas;
        this.ejecutor = ejecutor;
    }

    @TransactionalEventListener
    void alGuardarCaptura(CapturaGuardada captura) {
        ejecutor.execute(() -> analizar(captura));
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
