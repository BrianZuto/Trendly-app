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

    /** Ley 1581 de 2012: el vendedor puede dejar de recibir los correos (SCRUM-48). */
    @Column(name = "recibir_correos", nullable = false)
    private boolean recibirCorreos;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    protected ReglaAlerta() {
    }

    /** Regla con los valores por defecto, para quien todavía no ha configurado la suya. */
    ReglaAlerta(Long usuarioId) {
        this.usuarioId = usuarioId;
        this.umbralPct = UMBRAL_POR_DEFECTO;
        this.avisarDisponibilidad = true;
        this.recibirCorreos = true;
    }

    void actualizar(BigDecimal umbralPct, boolean avisarDisponibilidad, boolean recibirCorreos, Instant ahora) {
        this.umbralPct = umbralPct;
        this.avisarDisponibilidad = avisarDisponibilidad;
        this.recibirCorreos = recibirCorreos;
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

    public boolean isRecibirCorreos() {
        return recibirCorreos;
    }
}
