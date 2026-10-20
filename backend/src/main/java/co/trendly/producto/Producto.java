package co.trendly.producto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Producto propio de un vendedor (tabla {@code producto}). Los montos van en COP y los porcentajes de 0 a 100. */
@Entity
@Table(name = "producto")
public class Producto {

    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Dueño del producto. Solo él puede verlo y editarlo. */
    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 60)
    private String sku;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal costo;

    @Column(name = "precio_venta", nullable = false, precision = 14, scale = 2)
    private BigDecimal precioVenta;

    @Column(name = "margen_objetivo", nullable = false, precision = 5, scale = 2)
    private BigDecimal margenObjetivo;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    protected Producto() {
    }

    public Producto(Long usuarioId) {
        this.usuarioId = usuarioId;
        // DATETIME(6) guarda microsegundos: así la respuesta del POST coincide con lo que queda en la BD
        this.creadoEn = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public void actualizar(String nombre, String sku, BigDecimal costo, BigDecimal precioVenta,
            BigDecimal margenObjetivo) {
        this.nombre = nombre;
        this.sku = sku;
        this.costo = costo;
        this.precioVenta = precioVenta;
        this.margenObjetivo = margenObjetivo;
    }

    /** Margen actual en porcentaje: (precio − costo) / precio × 100. Es negativo si se vende por debajo del costo. */
    public BigDecimal getMargenActual() {
        return precioVenta.subtract(costo).multiply(CIEN).divide(precioVenta, 2, RoundingMode.HALF_UP);
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getNombre() {
        return nombre;
    }

    public String getSku() {
        return sku;
    }

    public BigDecimal getCosto() {
        return costo;
    }

    public BigDecimal getPrecioVenta() {
        return precioVenta;
    }

    public BigDecimal getMargenObjetivo() {
        return margenObjetivo;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }
}
