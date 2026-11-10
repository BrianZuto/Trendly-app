package co.trendly.monitoreo;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** El monitoreo no existe o es de un producto de otro vendedor. Se responde 404 en los dos casos. */
public class MonitoreoNoEncontradoException extends ErrorDeNegocio {

    public static final String MENSAJE = "Monitoreo no encontrado";

    public MonitoreoNoEncontradoException() {
        super(HttpStatus.NOT_FOUND, MENSAJE);
    }
}
