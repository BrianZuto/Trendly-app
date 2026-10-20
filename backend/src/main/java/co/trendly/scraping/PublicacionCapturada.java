package co.trendly.scraping;

import java.math.BigDecimal;

/**
 * Una publicación tal como se leyó del marketplace (SCRUM-40). El precio va en su moneda original;
 * la conversión a pesos se hace al guardar el histórico (SCRUM-42).
 *
 * @param idPublicacion identificador en el marketplace (MCO-… o el número del ítem de AliExpress)
 * @param titulo        título de la publicación
 * @param vendedor      vendedor o tienda; {@code null} si la página no lo muestra
 * @param posicion      posición en los resultados de búsqueda; {@code null} en modo URL
 * @param precio        precio de venta, mayor que 0
 * @param moneda        código ISO 4217 (USD, COP…)
 * @param disponible    si se puede comprar en este momento
 */
public record PublicacionCapturada(String idPublicacion, String titulo, String vendedor, Integer posicion,
        BigDecimal precio, String moneda, boolean disponible) {
}
