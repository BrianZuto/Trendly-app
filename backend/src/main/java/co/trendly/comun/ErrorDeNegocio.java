package co.trendly.comun;

import org.springframework.http.HttpStatus;

/**
 * Regla del negocio que no se cumple. Cada error trae su código HTTP y el mensaje que ve el usuario;
 * {@link ManejadorErrores} los convierte en JSON.
 */
public class ErrorDeNegocio extends RuntimeException {

    private final HttpStatus estado;

    public ErrorDeNegocio(HttpStatus estado, String mensaje) {
        super(mensaje);
        this.estado = estado;
    }

    public HttpStatus getEstado() {
        return estado;
    }
}
