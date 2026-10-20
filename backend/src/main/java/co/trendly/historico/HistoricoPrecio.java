package co.trendly.historico;

import java.math.BigDecimal;
import java.time.Instant;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Un punto del histórico (tabla {@code historico_precio}): el precio de una publicación en una captura. */
@Entity
@Table(name = "historico_precio")
public class HistoricoPrecio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "monitoreo_id", nullable = false, updatable = false)
    private Long monitoreoId;

    @Column(name = "publicacion_id", length = 60, updatable = false)
    private String publicacionId;

    @Column(length = 300, updatable = false)
    private String titulo;

    @Column(length = 150, updatable = false)
    private String vendedor;

    @Column(updatable = false)
    private Integer posicion;

    /** En la moneda original. */
    @Column(nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal precio;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 3, updatable = false)
    private String moneda;

    @Column(name = "precio_cop", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal precioCop;

    @Column(nullable = false, updatable = false)
    private boolean disponible;

    /** Marketplace de donde salió el precio. */
    @Column(length = 30, updatable = false)
    private String fuente;

    @Column(name = "capturado_en", nullable = false, updatable = false)
    private Instant capturadoEn;

    protected HistoricoPrecio() {
    }

    HistoricoPrecio(Long monitoreoId, String publicacionId, String titulo, String vendedor, Integer posicion,
            BigDecimal precio, String moneda, BigDecimal precioCop, boolean disponible, String fuente,
            Instant capturadoEn) {
        this.monitoreoId = monitoreoId;
        this.publicacionId = publicacionId;
        this.titulo = recortar(titulo, 300);
        this.vendedor = recortar(vendedor, 150);
        this.posicion = posicion;
        this.precio = precio;
        this.moneda = moneda;
        this.precioCop = precioCop;
        this.disponible = disponible;
        this.fuente = fuente;
        this.capturadoEn = capturadoEn;
    }

    /** Los títulos de AliExpress pueden ser muy largos: se cortan al tamaño de la columna. */
    private static String recortar(String texto, int maximo) {
        return texto == null || texto.length() <= maximo ? texto : texto.substring(0, maximo);
    }

    public Long getId() {
        return id;
    }

    public Long getMonitoreoId() {
        return monitoreoId;
    }

    public String getPublicacionId() {
        return publicacionId;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getVendedor() {
        return vendedor;
    }

    public Integer getPosicion() {
        return posicion;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public String getMoneda() {
        return moneda;
    }

    public BigDecimal getPrecioCop() {
        return precioCop;
    }

    public boolean isDisponible() {
        return disponible;
    }

    public String getFuente() {
        return fuente;
    }

    public Instant getCapturadoEn() {
        return capturadoEn;
    }
}
