package co.trendly.incidencia;

import java.time.Instant;
import java.util.List;

import co.trendly.monitoreo.EstadoMonitoreo;
import co.trendly.monitoreo.Marketplace;
import co.trendly.scraping.TipoFallo;

/** Lo que revisa el administrador en {@code GET /api/v1/admin/incidencias} (SCRUM-45). */
public record PanelIncidencias(List<MonitoreoEnError> monitoreosEnError, List<Incidencia> incidencias) {

    /** Una incidencia, de la más reciente a la más antigua. {@code valor} es la URL o la palabra clave vigilada. */
    public record Incidencia(Long id, Long monitoreoId, Long productoId, String producto, Marketplace marketplace,
            String valor, EstadoMonitoreo estadoMonitoreo, TipoFallo tipo, String detalle, int intentos,
            Instant ocurridoEn) {
    }

    /** Un monitoreo que el job dejó de capturar tras 3 ciclos seguidos con fallo. */
    public record MonitoreoEnError(Long id, Long productoId, String producto, Marketplace marketplace, String valor,
            int fallosConsecutivos, Instant ultimaCaptura) {
    }
}
