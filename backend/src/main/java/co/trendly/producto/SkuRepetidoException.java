package co.trendly.producto;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** El vendedor ya tiene otro producto con ese SKU. Se responde 409. */
public class SkuRepetidoException extends ErrorDeNegocio {

    public static final String MENSAJE = "Ya tienes un producto con ese SKU";

    public SkuRepetidoException() {
        super(HttpStatus.CONFLICT, MENSAJE);
    }
}
