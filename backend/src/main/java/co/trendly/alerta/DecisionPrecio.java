package co.trendly.alerta;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Lo que decidió el vendedor sobre una alerta (tabla {@code decision_precio}). Una alerta se decide una sola vez. */
@Entity
@Table(name = "decision_precio")
public class DecisionPrecio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alerta_id", nullable = false, updatable = false)
    private Long alertaId;

    @Column(name = "producto_id", nullable = false, updatable = false)
    private Long productoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private AccionDecision accion;

    /** Precio de venta del producto antes de la decisión. */
    @Column(name = "precio_anterior", precision = 14, scale = 2, updatable = false)
    private BigDecimal precioAnterior;

    /** {@code null} al descartar: el precio no cambia. */
    @Column(name = "precio_final", precision = 14, scale = 2, updatable = false)
    private BigDecimal precioFinal;

    @Column(length = 500, updatable = false)
    private String motivo;

    @Column(name = "decidido_en", nullable = false, updatable = false)
    private Instant decididoEn;

    protected DecisionPrecio() {
    }

    DecisionPrecio(Long alertaId, Long productoId, AccionDecision accion, BigDecimal precioAnterior,
            BigDecimal precioFinal, String motivo) {
        this.alertaId = alertaId;
        this.productoId = productoId;
        this.accion = accion;
        this.precioAnterior = precioAnterior;
        this.precioFinal = precioFinal;
        this.motivo = motivo;
        this.decididoEn = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public Long getId() {
        return id;
    }

    public Long getAlertaId() {
        return alertaId;
    }

    public Long getProductoId() {
        return productoId;
    }

    public AccionDecision getAccion() {
        return accion;
    }

    public BigDecimal getPrecioAnterior() {
        return precioAnterior;
    }

    public BigDecimal getPrecioFinal() {
        return precioFinal;
    }

    public String getMotivo() {
        return motivo;
    }

    public Instant getDecididoEn() {
        return decididoEn;
    }
}
