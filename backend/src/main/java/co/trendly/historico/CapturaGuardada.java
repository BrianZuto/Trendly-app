package co.trendly.historico;

import java.time.Instant;
import java.util.List;

/**
 * Evento interno: una captura de un monitoreo quedó en el histórico (SCRUM-42). Se publica una vez por captura, con
 * todos sus precios, para que quien lo escuche pueda comparar las publicaciones entre sí (SCRUM-46 y 47). Se publica
 * dentro de la transacción, así que conviene escucharlo con {@code @TransactionalEventListener} (después del commit).
 *
 * @param precios los puntos guardados en esta captura; al menos uno
 */
public record CapturaGuardada(Long monitoreoId, Long productoId, Instant capturadoEn, List<PrecioActualizado> precios) {
}
