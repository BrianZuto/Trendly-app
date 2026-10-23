package co.trendly.producto;

import java.math.BigDecimal;
import java.time.Instant;

import co.trendly.monitoreo.ResumenCompetencia;

/**
 * Producto tal como lo ve su dueño, con el margen actual calculado (en porcentaje). En la lista y en el detalle trae
 * además el resumen de su competencia; en las demás respuestas va en {@code null}.
 */
public record ProductoResponse(Long id, String nombre, String sku, BigDecimal costo, BigDecimal precioVenta,
        BigDecimal margenObjetivo, BigDecimal margenActual, Instant creadoEn, ResumenCompetencia competencia) {

    public static ProductoResponse de(Producto producto) {
        return new ProductoResponse(producto.getId(), producto.getNombre(), producto.getSku(), producto.getCosto(),
                producto.getPrecioVenta(), producto.getMargenObjetivo(), producto.getMargenActual(),
                producto.getCreadoEn(), null);
    }

    public ProductoResponse conCompetencia(ResumenCompetencia resumen) {
        return new ProductoResponse(id, nombre, sku, costo, precioVenta, margenObjetivo, margenActual, creadoEn, resumen);
    }
}
