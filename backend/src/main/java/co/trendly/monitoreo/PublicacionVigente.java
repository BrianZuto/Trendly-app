package co.trendly.monitoreo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Una publicación de la competencia tal como quedó en la última captura de su monitoreo, con su historial reciente.
 * Es lo que el frontend muestra en el detalle del producto (una fila por publicación).
 *
 * @param precio    último precio en pesos (COP)
 * @param precioUsd último precio en dólares si la publicación cobra en USD (AliExpress); si no, {@code null}
 * @param imagen    foto de la publicación; los scrapers todavía no la capturan, así que va en {@code null}
 * @param historial puntos de los últimos días, del más viejo al más nuevo, con el precio en COP
 */
public record PublicacionVigente(String idPublicacion, String titulo, String vendedor, Integer posicion,
        BigDecimal precio, BigDecimal precioUsd, boolean disponible, String imagen, List<Punto> historial) {

    public record Punto(Instant fecha, BigDecimal precio, boolean disponible) {
    }
}
