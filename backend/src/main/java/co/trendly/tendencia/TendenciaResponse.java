package co.trendly.tendencia;

import java.math.BigDecimal;

/**
 * Un producto del ranking de tendencias (SCRUM-53). Los montos van en COP; las variables y el puntaje, de 0 a 100.
 *
 * @param posicion         puesto en el ranking (1 es el mejor)
 * @param titulo           nombre del producto en MercadoLibre
 * @param publicacionId    la mejor oferta del producto en la última captura
 * @param productoId       producto propio en cuya búsqueda apareció
 * @param palabraClave     búsqueda en la que apareció
 * @param precioVenta      precio de la mejor oferta en MercadoLibre
 * @param costo            costo en AliExpress o, si el producto no lo vigila, el costo registrado del producto
 * @param vendedores       vendedores que ofrecen el mismo producto en MercadoLibre
 * @param posicionBusqueda puesto promedio en la búsqueda durante los últimos 30 días
 * @param demanda          entre más alta, mejor
 * @param margen           margen potencial; entre más alto, mejor
 * @param competencia      entre más baja, mejor
 * @param puntaje          0,4 × demanda + 0,3 × margen + 0,3 × (100 − competencia)
 */
public record TendenciaResponse(int posicion, String titulo, String publicacionId, Long productoId, String palabraClave,
        BigDecimal precioVenta, BigDecimal costo, int vendedores, BigDecimal posicionBusqueda, BigDecimal demanda,
        BigDecimal margen, BigDecimal competencia, BigDecimal puntaje) {

    TendenciaResponse enPuesto(int puesto) {
        return new TendenciaResponse(puesto, titulo, publicacionId, productoId, palabraClave, precioVenta, costo,
                vendedores, posicionBusqueda, demanda, margen, competencia, puntaje);
    }
}
