package co.trendly.producto;

/** El producto no existe o es de otro vendedor. Se responde 404 en los dos casos. */
public class ProductoNoEncontradoException extends RuntimeException {

    public static final String MENSAJE = "Producto no encontrado";

    public ProductoNoEncontradoException() {
        super(MENSAJE);
    }
}
