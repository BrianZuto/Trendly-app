package co.trendly.recoleccion;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.seguridad.RespuestaError;
import jakarta.servlet.http.HttpServletRequest;

/**
 * {@code POST /api/v1/interno/recoleccion/ejecutar} (SCRUM-39). Lo llama la Azure Function cada 6 horas con la API
 * key en {@code X-Api-Key}. Arranca el ciclo en segundo plano y responde 202 de inmediato; si ya hay un ciclo en
 * curso, el disparo se ignora (200).
 */
@RestController
@RequestMapping("/api/v1/interno/recoleccion")
public class RecoleccionController {

    static final String SIN_API_KEY = "El job de recolección no está configurado (falta RECOLECCION_API_KEY)";
    static final String API_KEY_INVALIDA = "API key inválida";
    static final String INICIADO = "Ciclo de recolección iniciado";
    static final String EN_CURSO = "Ya hay un ciclo de recolección en curso; este disparo se ignora";

    /** Respuesta del disparo. */
    public record RespuestaDisparo(String estado, String message) {
    }

    private final RecoleccionService recoleccion;
    private final RecoleccionProperties propiedades;

    public RecoleccionController(RecoleccionService recoleccion, RecoleccionProperties propiedades) {
        this.recoleccion = recoleccion;
        this.propiedades = propiedades;
    }

    @PostMapping("/ejecutar")
    public ResponseEntity<?> ejecutar(@RequestHeader(name = "X-Api-Key", required = false) String apiKey,
            HttpServletRequest request) {
        if (!propiedades.tieneApiKey()) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, SIN_API_KEY, request);
        }
        if (!coincide(apiKey, propiedades.apiKey())) {
            return error(HttpStatus.UNAUTHORIZED, API_KEY_INVALIDA, request);
        }
        return recoleccion.iniciar()
                .<ResponseEntity<?>>map(ciclo -> ResponseEntity.status(HttpStatus.ACCEPTED)
                        .body(new RespuestaDisparo("INICIADO", INICIADO)))
                .orElseGet(() -> ResponseEntity.ok(new RespuestaDisparo("EN_CURSO", EN_CURSO)));
    }

    /** Comparación en tiempo constante, para no dar pistas de la clave por cuánto tarda la respuesta. */
    static boolean coincide(String recibida, String esperada) {
        if (recibida == null) {
            return false;
        }
        return MessageDigest.isEqual(recibida.getBytes(StandardCharsets.UTF_8), esperada.getBytes(StandardCharsets.UTF_8));
    }

    private static ResponseEntity<RespuestaError> error(HttpStatus estado, String mensaje, HttpServletRequest request) {
        return ResponseEntity.status(estado)
                .body(new RespuestaError(estado.value(), estado.getReasonPhrase(), mensaje, request.getRequestURI()));
    }
}
