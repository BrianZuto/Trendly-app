package co.trendly.alerta;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** La alerta no existe o es de otro vendedor. Se responde 404 en los dos casos. */
public class AlertaNoEncontradaException extends ErrorDeNegocio {

    public static final String MENSAJE = "Alerta no encontrada";

    public AlertaNoEncontradaException() {
        super(HttpStatus.NOT_FOUND, MENSAJE);
    }
}
