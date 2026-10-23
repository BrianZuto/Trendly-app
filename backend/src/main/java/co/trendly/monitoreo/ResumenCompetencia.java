package co.trendly.monitoreo;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resumen de la competencia de un producto para la lista de productos.
 *
 * @param monitoreos    cuántos competidores (monitoreos) tiene
 * @param publicaciones cuántas publicaciones disponibles hay en la última captura de los monitoreos activos
 * @param marketplaces  dónde se vigila
 * @param minimo        la publicación disponible más barata, o {@code null} si todavía no hay capturas
 */
public record ResumenCompetencia(int monitoreos, int publicaciones, List<Marketplace> marketplaces, Minimo minimo) {

    public record Minimo(BigDecimal precio, String vendedor, Marketplace marketplace) {
    }
}
