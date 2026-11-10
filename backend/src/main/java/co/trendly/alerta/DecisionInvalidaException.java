package co.trendly.alerta;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** La decisión o el filtro de la bandeja no cumplen una regla (acción, precio o motivo). Se responde 400. */
public class DecisionInvalidaException extends ErrorDeNegocio {

    public DecisionInvalidaException(String mensaje) {
        super(HttpStatus.BAD_REQUEST, mensaje);
    }
}
