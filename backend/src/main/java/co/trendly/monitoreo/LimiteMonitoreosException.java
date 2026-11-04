package co.trendly.monitoreo;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** El producto ya tiene el máximo de competidores ({@link MonitoreoService#MAX_POR_PRODUCTO}). Se responde 422. */
public class LimiteMonitoreosException extends ErrorDeNegocio {

    public static final String MENSAJE = "Alcanzó el límite de competidores para este producto";

    public LimiteMonitoreosException() {
        super(HttpStatus.UNPROCESSABLE_CONTENT, MENSAJE);
    }
}
