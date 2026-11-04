package co.trendly.sugerencia;

import java.math.BigDecimal;
import java.time.Instant;

import co.trendly.monitoreo.Marketplace;

public record ComisionResponse(Marketplace marketplace, BigDecimal comisionPct, Instant actualizadoEn) {

    static ComisionResponse de(ComisionMarketplace comision) {
        return new ComisionResponse(comision.getMarketplace(), comision.getComisionPct(), comision.getActualizadoEn());
    }
}
