package co.trendly.monitoreo;

import java.time.Instant;

/** Monitoreo tal como lo ve el dueño del producto. Las capturas de precio van aparte (SCRUM-42). */
public record MonitoreoResponse(Long id, Long productoId, TipoMonitoreo tipo, String valor, String idPublicacion,
        Marketplace marketplace, Integer topN, int frecuenciaHoras, EstadoMonitoreo estado,
        Instant proximaEjecucion, Instant ultimaCaptura, Instant creadoEn) {

    public static MonitoreoResponse de(Monitoreo m) {
        return new MonitoreoResponse(m.getId(), m.getProductoId(), m.getTipo(), m.getValor(), m.getIdPublicacion(),
                m.getMarketplace(), m.getTopN(), m.getFrecuenciaHoras(), m.getEstado(), m.getProximaEjecucion(),
                m.getUltimaCaptura(), m.getCreadoEn());
    }
}
