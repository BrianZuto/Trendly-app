package co.trendly.alerta;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** La alerta ya tiene una decisión registrada: se decide una sola vez. Se responde 409. */
public class AlertaYaDecididaException extends ErrorDeNegocio {

    public static final String MENSAJE = "Esta alerta ya tiene una decisión registrada";

    public AlertaYaDecididaException() {
        super(HttpStatus.CONFLICT, MENSAJE);
    }
}
