package co.trendly.alerta;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Cambio del mercado que merece la atención del vendedor (tabla {@code alerta}). */
@Entity
@Table(name = "alerta")
public class Alerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "monitoreo_id", nullable = false, updatable = false)
    private Long monitoreoId;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(name = "publicacion_id", length = 60, updatable = false)
    private String publicacionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private TipoAlerta tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private RelevanciaAlerta relevancia;

    @Column(name = "precio_anterior", precision = 14, scale = 2, updatable = false)
    private BigDecimal precioAnterior;

    @Column(name = "precio_nuevo", precision = 14, scale = 2, updatable = false)
    private BigDecimal precioNuevo;

    @Column(name = "variacion_pct", precision = 7, scale = 2, updatable = false)
    private BigDecimal variacionPct;

    /** {@code null} si la sugerencia está pendiente o si ningún precio cumple el margen objetivo. */
    @Column(name = "precio_sugerido", precision = 14, scale = 2, updatable = false)
    private BigDecimal precioSugerido;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoAlerta estado;

    @Column(name = "enviada_correo_en")
    private Instant enviadaCorreoEn;

    /** Cuándo salió la notificación push (SCRUM-52); {@code null} = pendiente. */
    @Column(name = "enviada_push_en")
    private Instant enviadaPushEn;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    protected Alerta() {
    }

    Alerta(Long usuarioId, DetectorCambios.Cambio cambio, BigDecimal precioSugerido) {
        this.monitoreoId = cambio.precio().monitoreoId();
        this.usuarioId = usuarioId;
        this.publicacionId = cambio.precio().idPublicacion();
        this.tipo = cambio.tipo();
        this.relevancia = cambio.relevancia();
        this.precioAnterior = cambio.precio().precioAnteriorCop();
        this.precioNuevo = cambio.precio().precioCop();
        this.variacionPct = cambio.variacionPct();
        this.precioSugerido = precioSugerido;
        this.estado = EstadoAlerta.NUEVA;
        this.creadoEn = cambio.precio().capturadoEn();
    }

    /** El vendedor la abrió en la bandeja (SCRUM-49). Una alerta cerrada no vuelve atrás. */
    void marcarLeida() {
        if (estado == EstadoAlerta.NUEVA) {
            estado = EstadoAlerta.LEIDA;
        }
    }

    /** El vendedor tomó una decisión sobre ella (SCRUM-49). */
    void cerrar() {
        estado = EstadoAlerta.CERRADA;
    }

    public Long getId() {
        return id;
    }

    public Long getMonitoreoId() {
        return monitoreoId;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getPublicacionId() {
        return publicacionId;
    }

    public TipoAlerta getTipo() {
        return tipo;
    }

    public RelevanciaAlerta getRelevancia() {
        return relevancia;
    }

    public BigDecimal getPrecioAnterior() {
        return precioAnterior;
    }

    public BigDecimal getPrecioNuevo() {
        return precioNuevo;
    }

    public BigDecimal getVariacionPct() {
        return variacionPct;
    }

    public BigDecimal getPrecioSugerido() {
        return precioSugerido;
    }

    public EstadoAlerta getEstado() {
        return estado;
    }

    public Instant getEnviadaCorreoEn() {
        return enviadaCorreoEn;
    }

    public Instant getEnviadaPushEn() {
        return enviadaPushEn;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }
}
