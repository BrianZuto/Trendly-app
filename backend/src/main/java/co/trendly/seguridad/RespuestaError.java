package co.trendly.seguridad;

public record RespuestaError(int status, String error, String message, String path) {
}