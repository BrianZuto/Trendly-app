package co.trendly.seguridad;

/**
 * Respuesta del login. El frontend usa {@code token} y lo envía como {@code Authorization: Bearer <token>}.
 *
 * @param token            JWT firmado
 * @param tipo             siempre "Bearer"
 * @param expiraEnSegundos vigencia del token
 */
public record LoginResponse(String token, String tipo, long expiraEnSegundos) {
}
