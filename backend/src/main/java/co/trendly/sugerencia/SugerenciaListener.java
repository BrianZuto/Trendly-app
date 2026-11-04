package co.trendly.sugerencia;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import co.trendly.historico.PrecioActualizado;

/**
 * Recalcula la sugerencia cuando entra un precio nuevo, después del commit y en otro hilo para no frenar la recolección.
 * Un solo hilo: una búsqueda trae varias publicaciones del mismo producto y así no se pisan entre ellas.
 */
@Component
public class SugerenciaListener {

    private static final Logger log = LoggerFactory.getLogger(SugerenciaListener.class);

    private final SugerenciaService sugerencias;
    private final Executor ejecutor;

    @Autowired
    public SugerenciaListener(SugerenciaService sugerencias) {
        this(sugerencias, Executors.newSingleThreadExecutor(Thread.ofPlatform().name("sugerencias").daemon().factory()));
    }

    SugerenciaListener(SugerenciaService sugerencias, Executor ejecutor) {
        this.sugerencias = sugerencias;
        this.ejecutor = ejecutor;
    }

    @TransactionalEventListener
    void alActualizarPrecio(PrecioActualizado evento) {
        ejecutor.execute(() -> recalcular(evento.productoId()));
    }

    private void recalcular(Long productoId) {
        try {
            sugerencias.recalcular(productoId);
        } catch (RuntimeException e) {
            log.error("No se pudo recalcular la sugerencia del producto {}", productoId, e);
        }
    }
}
