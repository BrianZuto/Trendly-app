package co.trendly.sugerencia;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.time.Instant;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;

import co.trendly.historico.PrecioActualizado;

class SugerenciaListenerTest {

    private final SugerenciaService servicio = mock(SugerenciaService.class);
    private final SugerenciaListener listener = new SugerenciaListener(servicio, Runnable::run);

    private static PrecioActualizado evento() {
        return new PrecioActualizado(1L, 2L, 3L, "MCO-1", null, BigDecimal.TEN, null, true, Instant.EPOCH);
    }

    @Test
    void unPrecioNuevoRecalculaElProducto() {
        listener.alActualizarPrecio(evento());

        verify(servicio).recalcular(3L);
    }

    @Test
    void unFalloAlRecalcularNoSePropaga() {
        doThrow(new IllegalStateException("sin comisión")).when(servicio).recalcular(any());

        Assertions.assertThatCode(() -> listener.alActualizarPrecio(evento())).doesNotThrowAnyException();
    }
}
