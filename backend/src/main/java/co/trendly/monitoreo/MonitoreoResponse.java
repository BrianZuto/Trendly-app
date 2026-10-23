package co.trendly.monitoreo;

import java.time.Instant;
import java.util.List;

/**
 * Monitoreo tal como lo ve el dueño del producto. En la lista trae las publicaciones vigentes de la última captura con
 * su historial de 30 días; el histórico completo se pide en {@code GET /monitoreos/{id}/historico} (SCRUM-42).
 */
public record MonitoreoResponse(Long id, Long productoId, TipoMonitoreo tipo, String valor, String idPublicacion,
        Marketplace marketplace, Integer topN, int frecuenciaHoras, EstadoMonitoreo estado,
        Instant proximaEjecucion, Instant ultimaCaptura, Instant creadoEn, List<PublicacionVigente> publicaciones) {

    /** Sin publicaciones: recién creado o recién pausado; el frontend vuelve a pedir la lista. */
    public static MonitoreoResponse de(Monitoreo m) {
        return de(m, List.of());
    }

    public static MonitoreoResponse de(Monitoreo m, List<PublicacionVigente> publicaciones) {
        return new MonitoreoResponse(m.getId(), m.getProductoId(), m.getTipo(), m.getValor(), m.getIdPublicacion(),
                m.getMarketplace(), m.getTopN(), m.getFrecuenciaHoras(), m.getEstado(), m.getProximaEjecucion(),
                m.getUltimaCaptura(), m.getCreadoEn(), publicaciones);
    }
}
