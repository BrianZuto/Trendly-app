package co.trendly.seguridad;

/** El token es válido, pero su usuario ya no existe o está inactivo. Se responde 401. */
public class TokenSinUsuarioException extends RuntimeException {

    public TokenSinUsuarioException() {
        super(SecurityConfig.MENSAJE_401);
    }
}
