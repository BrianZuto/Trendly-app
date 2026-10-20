package co.trendly.producto;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** El producto no existe o es de otro vendedor. Se responde 404 en los dos casos. */
public class ProductoNoEncontradoException extends ErrorDeNegocio {

    public static final String MENSAJE = "Producto no encontrado";

    public ProductoNoEncontradoException() {
        super(HttpStatus.NOT_FOUND, MENSAJE);
    }
}
