package co.trendly.sugerencia;

import java.math.BigDecimal;
import java.time.Instant;

import co.trendly.monitoreo.Marketplace;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Comisión de un marketplace, en porcentaje (tabla {@code comision_marketplace}). */
@Entity
@Table(name = "comision_marketplace")
public class ComisionMarketplace {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Marketplace marketplace;

    @Column(name = "comision_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal comisionPct;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    protected ComisionMarketplace() {
    }

    void actualizar(BigDecimal comisionPct, Instant ahora) {
        this.comisionPct = comisionPct;
        this.actualizadoEn = ahora;
    }

    public Marketplace getMarketplace() {
        return marketplace;
    }

    public BigDecimal getComisionPct() {
        return comisionPct;
    }

    public Instant getActualizadoEn() {
        return actualizadoEn;
    }
}
