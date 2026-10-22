package co.trendly.usuario;

/** El email ya pertenece a otra cuenta. Se responde 409. */
public class EmailYaRegistradoException extends RuntimeException {

    public static final String MENSAJE = "El email ya está registrado";

    public EmailYaRegistradoException() {
        super(MENSAJE);
    }
}
