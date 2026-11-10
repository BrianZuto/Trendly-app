package co.trendly.monitoreo;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** La solicitud no cumple una regla del monitoreo (tipo, marketplace, palabra, Top N o frecuencia). Se responde 400. */
public class SolicitudMonitoreoInvalidaException extends ErrorDeNegocio {

    public SolicitudMonitoreoInvalidaException(String mensaje) {
        super(HttpStatus.BAD_REQUEST, mensaje);
    }
}
