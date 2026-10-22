package co.trendly.producto;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** El vendedor ya tiene el máximo de productos de su plan. Se responde 422. */
public class LimitePlanException extends ErrorDeNegocio {

    public static final String MENSAJE = "Alcanzó el límite de su plan";

    public LimitePlanException() {
        super(HttpStatus.UNPROCESSABLE_CONTENT, MENSAJE);
    }
}
