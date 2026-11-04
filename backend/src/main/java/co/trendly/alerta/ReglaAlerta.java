package co.trendly.alerta;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Cuándo quiere recibir alertas un vendedor (tabla {@code regla_alerta}). */
@Entity
@Table(name = "regla_alerta")
public class ReglaAlerta {

    static final BigDecimal UMBRAL_POR_DEFECTO = new BigDecimal("5.00");

    @Id
    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(name = "umbral_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal umbralPct;

    @Column(name = "avisar_disponibilidad", nullable = false)
    private boolean avisarDisponibilidad;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    protected ReglaAlerta() {
    }

    /** Regla con los valores por defecto, para quien todavía no ha configurado la suya. */
    ReglaAlerta(Long usuarioId) {
        this.usuarioId = usuarioId;
        this.umbralPct = UMBRAL_POR_DEFECTO;
        this.avisarDisponibilidad = true;
    }

    void actualizar(BigDecimal umbralPct, boolean avisarDisponibilidad, Instant ahora) {
        this.umbralPct = umbralPct;
        this.avisarDisponibilidad = avisarDisponibilidad;
        this.actualizadoEn = ahora;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public BigDecimal getUmbralPct() {
        return umbralPct;
    }

    public boolean isAvisarDisponibilidad() {
        return avisarDisponibilidad;
    }
}
