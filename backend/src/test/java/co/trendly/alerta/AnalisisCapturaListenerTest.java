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
import co.trendly.recoleccion.CicloTerminado;
import co.trendly.recoleccion.ResumenCiclo;
import co.trendly.sugerencia.SugerenciaService;

class AnalisisCapturaListenerTest {

    private final SugerenciaService sugerencias = mock(SugerenciaService.class);
    private final AlertaService alertas = mock(AlertaService.class);
    private final CorreoAlertasService correos = mock(CorreoAlertasService.class);
    private final PushAlertasService push = mock(PushAlertasService.class);
    private final AnalisisCapturaListener listener = new AnalisisCapturaListener(sugerencias, alertas, correos, push,
            Runnable::run);
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

    @Test
    void alTerminarElCicloEnviaLosCorreosYUnFalloNoSePropaga() {
        CicloTerminado ciclo = new CicloTerminado(new ResumenCiclo(Instant.EPOCH, Instant.EPOCH, 1, 1, 0, 1));

        listener.alTerminarCiclo(ciclo);
        verify(correos).enviarPendientes();

        doThrow(new IllegalStateException("SMTP")).when(correos).enviarPendientes();
        assertThatCode(() -> listener.alTerminarCiclo(ciclo)).doesNotThrowAnyException();
    }

    @Test
    void alTerminarElCicloEnviaLasNotificacionesPushAunqueFalleElCorreo() {
        CicloTerminado ciclo = new CicloTerminado(new ResumenCiclo(Instant.EPOCH, Instant.EPOCH, 1, 1, 0, 1));
        doThrow(new IllegalStateException("SMTP")).when(correos).enviarPendientes();

        listener.alTerminarCiclo(ciclo);

        InOrder orden = inOrder(correos, push);
        orden.verify(correos).enviarPendientes();
        orden.verify(push).enviarPendientes();

        doThrow(new IllegalStateException("Expo")).when(push).enviarPendientes();
        assertThatCode(() -> listener.alTerminarCiclo(ciclo)).doesNotThrowAnyException();
    }
}
