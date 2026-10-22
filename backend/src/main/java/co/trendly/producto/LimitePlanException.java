package co.trendly.producto;

/** El vendedor ya tiene el máximo de productos de su plan. Se responde 422. */
public class LimitePlanException extends RuntimeException {

    public static final String MENSAJE = "Alcanzó el límite de su plan";

    public LimitePlanException() {
        super(MENSAJE);
    }
}
