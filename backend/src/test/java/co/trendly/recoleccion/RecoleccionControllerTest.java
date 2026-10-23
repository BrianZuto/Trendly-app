package co.trendly.recoleccion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import co.trendly.seguridad.RespuestaError;

/** Casos del endpoint interno y del disparador local que no necesitan Spring (SCRUM-39). */
class RecoleccionControllerTest {

    @Test
    void sinApiKeyConfiguradaElEndpointQuedaCerradoCon503() {
        RecoleccionService servicio = mock(RecoleccionService.class);
        RecoleccionController controlador = new RecoleccionController(servicio, new RecoleccionProperties(" ", 20));

        ResponseEntity<?> respuesta = controlador.ejecutar("cualquier-cosa", new MockHttpServletRequest("POST", "/x"));

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(((RespuestaError) respuesta.getBody()).message()).isEqualTo(RecoleccionController.SIN_API_KEY);
        verifyNoInteractions(servicio);
        assertThat(new RecoleccionProperties(null, 20).tieneApiKey()).isFalse();
    }

    @Test
    void comparaLaApiKeyCompleta() {
        assertThat(RecoleccionController.coincide("abc123", "abc123")).isTrue();
        assertThat(RecoleccionController.coincide("abc12", "abc123")).isFalse();
        assertThat(RecoleccionController.coincide(null, "abc123")).isFalse();
    }

    @Test
    void elDisparadorLocalCorreElMismoCiclo() {
        RecoleccionService servicio = mock(RecoleccionService.class);

        new RecoleccionLocal(servicio).disparar();

        verify(servicio).ejecutarAhora();
    }
}
