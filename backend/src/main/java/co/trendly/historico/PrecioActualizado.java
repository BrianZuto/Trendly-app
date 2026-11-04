package co.trendly.historico;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Un precio nuevo en el histórico (SCRUM-42), con el de la captura anterior para poder compararlos. Viaja dentro de
 * {@link CapturaGuardada}.
 *
 * @param precioAnteriorCop      precio de la captura anterior de la misma publicación; {@code null} si es la primera
 * @param disponibleAnterior     disponibilidad en la captura anterior; {@code null} si es la primera
 */
public record PrecioActualizado(Long historicoId, Long monitoreoId, Long productoId, String idPublicacion,
        BigDecimal precioAnteriorCop, BigDecimal precioCop, Boolean disponibleAnterior, boolean disponible,
        Instant capturadoEn) {
}
