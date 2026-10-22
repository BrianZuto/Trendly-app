package co.trendly.producto;

/** El vendedor ya tiene otro producto con ese SKU. Se responde 409. */
public class SkuRepetidoException extends RuntimeException {

    public static final String MENSAJE = "Ya tienes un producto con ese SKU";

    public SkuRepetidoException() {
        super(MENSAJE);
    }
}
