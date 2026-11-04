package co.trendly.alerta;

import java.util.List;

/** Un correo: todas las alertas pendientes de un vendedor. */
record CorreoVendedor(Long usuarioId, String email, String nombre, List<Fila> filas) {

    /** Una alerta, con los textos ya listos para la plantilla. */
    record Fila(Long alertaId, String producto, Long productoId, String competidor, String publicacion, String tipo,
            boolean alta, String precioAnterior, String precioNuevo, String variacion, String precioSugerido) {
    }

    List<Long> alertaIds() {
        return filas.stream().map(Fila::alertaId).toList();
    }
}
