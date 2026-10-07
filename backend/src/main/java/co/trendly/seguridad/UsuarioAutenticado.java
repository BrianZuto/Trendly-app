package co.trendly.seguridad;

/**
 * Datos del usuario que viajan dentro del JWT.
 *
 * @param id    id del usuario (claim "sub")
 * @param email email del usuario (claim "email")
 * @param rol   ADMIN o VENDEDOR (claim "rol")
 */
public record UsuarioAutenticado(Long id, String email, String rol) {
}
