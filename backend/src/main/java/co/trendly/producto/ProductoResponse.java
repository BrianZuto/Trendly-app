package co.trendly.producto;

import java.math.BigDecimal;
import java.time.Instant;

/** Producto tal como lo ve su dueño, con el margen actual calculado (en porcentaje). */
public record ProductoResponse(Long id, String nombre, String sku, BigDecimal costo, BigDecimal precioVenta,
        BigDecimal margenObjetivo, BigDecimal margenActual, Instant creadoEn) {

    public static ProductoResponse de(Producto producto) {
        return new ProductoResponse(producto.getId(), producto.getNombre(), producto.getSku(), producto.getCosto(),
                producto.getPrecioVenta(), producto.getMargenObjetivo(), producto.getMargenActual(),
                producto.getCreadoEn());
    }
}
