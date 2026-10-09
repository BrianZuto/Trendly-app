package co.trendly.seguridad;

/**
 * Cuerpo JSON de los errores 401 y 403. El frontend muestra el campo "message".
 */
public record RespuestaError(int status, String error, String message, String path) {
}
