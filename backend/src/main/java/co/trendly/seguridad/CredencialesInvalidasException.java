package co.trendly.seguridad;

/**
 * Email inexistente, contraseña incorrecta o cuenta inactiva. Siempre con el mismo mensaje,
 * para no revelar cuál de las tres falló.
 */
public class CredencialesInvalidasException extends RuntimeException {

    public static final String MENSAJE = "Credenciales inválidas";

    public CredencialesInvalidasException() {
        super(MENSAJE);
    }
}
