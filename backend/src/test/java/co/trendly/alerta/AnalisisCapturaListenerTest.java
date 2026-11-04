package co.trendly.alerta;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import co.trendly.historico.CapturaGuardada;
import co.trendly.sugerencia.SugerenciaService;

class AnalisisCapturaListenerTest {

    private final SugerenciaService sugerencias = mock(SugerenciaService.class);
    private final AlertaService alertas = mock(AlertaService.class);
    private final AnalisisCapturaListener listener = new AnalisisCapturaListener(sugerencias, alertas, Runnable::run);
    private final CapturaGuardada captura = new CapturaGuardada(2L, 3L, Instant.EPOCH, List.of());

    @Test
    void primeroRecalculaLaSugerenciaYLuegoEvaluaLasAlertas() {
        listener.alGuardarCaptura(captura);

        InOrder orden = inOrder(sugerencias, alertas);
        orden.verify(sugerencias).recalcular(3L);
        orden.verify(alertas).evaluar(captura);
    }

    @Test
    void unFalloEnLaSugerenciaNoImpideLaAlerta() {
        doThrow(new IllegalStateException("sin comisión")).when(sugerencias).recalcular(any());

        assertThatCode(() -> listener.alGuardarCaptura(captura)).doesNotThrowAnyException();

        verify(alertas).evaluar(captura);
    }

    @Test
    void unFalloEnLasAlertasNoSePropaga() {
        doThrow(new IllegalStateException("BD")).when(alertas).evaluar(any());

        assertThatCode(() -> listener.alGuardarCaptura(captura)).doesNotThrowAnyException();
    }
}
