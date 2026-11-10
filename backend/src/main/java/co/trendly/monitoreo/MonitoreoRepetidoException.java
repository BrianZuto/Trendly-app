package co.trendly.monitoreo;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** El producto ya vigila esa publicación o esa palabra clave. Se responde 409. */
public class MonitoreoRepetidoException extends ErrorDeNegocio {

    public MonitoreoRepetidoException(String mensaje) {
        super(HttpStatus.CONFLICT, mensaje);
    }
}
