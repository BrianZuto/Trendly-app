package co.trendly.historico;

import java.math.BigDecimal;
import java.time.Instant;

import co.trendly.monitoreo.NombreVendedor;

/** Un punto de la gráfica de SCRUM-43. Son los campos que ya espera {@code monitoreos.service.js}. */
public record HistoricoResponse(Instant fechaCaptura, String idPublicacion, String titulo, String vendedor,
        Integer posicion, BigDecimal precio, String moneda, BigDecimal precioCop, boolean disponible, String fuente) {

    static HistoricoResponse de(HistoricoPrecio h) {
        return new HistoricoResponse(h.getCapturadoEn(), h.getPublicacionId(), h.getTitulo(), NombreVendedor.de(h.getVendedor()),
                h.getPosicion(), h.getPrecio(), h.getMoneda(), h.getPrecioCop(), h.isDisponible(), h.getFuente());
    }
}
