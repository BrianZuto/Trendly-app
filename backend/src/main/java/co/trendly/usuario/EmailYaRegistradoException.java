package co.trendly.usuario;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** El email ya pertenece a otra cuenta. Se responde 409. */
public class EmailYaRegistradoException extends ErrorDeNegocio {

    public static final String MENSAJE = "El email ya está registrado";

    public EmailYaRegistradoException() {
        super(HttpStatus.CONFLICT, MENSAJE);
    }
}
