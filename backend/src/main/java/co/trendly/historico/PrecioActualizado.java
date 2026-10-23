package co.trendly.historico;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Evento interno: hay un precio nuevo en el histórico (SCRUM-42). Se publica uno por cada punto guardado.
 * En el S4 lo escuchan el cálculo del precio sugerido y las alertas. Se publica dentro de la transacción,
 * así que conviene escucharlo con {@code @TransactionalEventListener} (por defecto, después del commit).
 *
 * @param precioAnteriorCop      precio de la captura anterior de la misma publicación; {@code null} si es la primera
 * @param disponibleAnterior     disponibilidad en la captura anterior; {@code null} si es la primera
 */
public record PrecioActualizado(Long historicoId, Long monitoreoId, Long productoId, String idPublicacion,
        BigDecimal precioAnteriorCop, BigDecimal precioCop, Boolean disponibleAnterior, boolean disponible,
        Instant capturadoEn) {
}
