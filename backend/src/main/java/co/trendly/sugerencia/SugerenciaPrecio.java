package co.trendly.sugerencia;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Resultado de un análisis de precio (tabla {@code sugerencia_precio}). La última fila es la vigente. */
@Entity
@Table(name = "sugerencia_precio")
public class SugerenciaPrecio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "producto_id", nullable = false, updatable = false)
    private Long productoId;

    @Column(name = "precio_min_competencia", precision = 14, scale = 2, updatable = false)
    private BigDecimal minimo;

    @Column(name = "precio_prom_competencia", precision = 14, scale = 2, updatable = false)
    private BigDecimal promedio;

    @Column(name = "precio_mediana_competencia", precision = 14, scale = 2, updatable = false)
    private BigDecimal mediana;

    @Column(name = "precio_minimo_rentable", precision = 14, scale = 2, updatable = false)
    private BigDecimal minimoRentable;

    @Column(name = "precio_sugerido", precision = 14, scale = 2, updatable = false)
    private BigDecimal sugerido;

    @Column(name = "margen_resultante", precision = 5, scale = 2, updatable = false)
    private BigDecimal margenResultante;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, updatable = false)
    private PosicionPrecio posicion;

    @Column(updatable = false)
    private Boolean competitivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private EstadoSugerencia estado;

    @Column(name = "calculado_en", nullable = false)
    private Instant calculadoEn;

    protected SugerenciaPrecio() {
    }

    private SugerenciaPrecio(Long productoId, EstadoSugerencia estado, Instant calculadoEn) {
        this.productoId = productoId;
        this.estado = estado;
        this.calculadoEn = calculadoEn;
    }

    static SugerenciaPrecio pendiente(Long productoId, Instant ahora) {
        return new SugerenciaPrecio(productoId, EstadoSugerencia.PENDIENTE, ahora);
    }

    static SugerenciaPrecio calculada(Long productoId, CalculadoraPrecio.Calculo calculo, Instant ahora) {
        SugerenciaPrecio sugerencia = new SugerenciaPrecio(productoId, EstadoSugerencia.CALCULADA, ahora);
        sugerencia.minimo = calculo.minimo();
        sugerencia.promedio = calculo.promedio();
        sugerencia.mediana = calculo.mediana();
        sugerencia.minimoRentable = calculo.minimoRentable();
        sugerencia.sugerido = calculo.sugerido();
        sugerencia.margenResultante = calculo.margenResultante();
        sugerencia.posicion = calculo.posicion();
        sugerencia.competitivo = calculo.competitivo();
        return sugerencia;
    }

    boolean mismoResultado(SugerenciaPrecio otra) {
        return estado == otra.estado && posicion == otra.posicion && Objects.equals(competitivo, otra.competitivo)
                && igual(minimo, otra.minimo) && igual(promedio, otra.promedio) && igual(mediana, otra.mediana)
                && igual(minimoRentable, otra.minimoRentable) && igual(sugerido, otra.sugerido)
                && igual(margenResultante, otra.margenResultante);
    }

    /** compareTo: 100.0 y 100.00 son el mismo precio, aunque equals diga que no. */
    private static boolean igual(BigDecimal a, BigDecimal b) {
        return a == null || b == null ? a == b : a.compareTo(b) == 0;
    }

    void confirmar(Instant ahora) {
        this.calculadoEn = ahora;
    }

    public Long getId() {
        return id;
    }

    public Long getProductoId() {
        return productoId;
    }

    public BigDecimal getMinimo() {
        return minimo;
    }

    public BigDecimal getPromedio() {
        return promedio;
    }

    public BigDecimal getMediana() {
        return mediana;
    }

    public BigDecimal getMinimoRentable() {
        return minimoRentable;
    }

    public BigDecimal getSugerido() {
        return sugerido;
    }

    public BigDecimal getMargenResultante() {
        return margenResultante;
    }

    public PosicionPrecio getPosicion() {
        return posicion;
    }

    public Boolean getCompetitivo() {
        return competitivo;
    }

    public EstadoSugerencia getEstado() {
        return estado;
    }

    public Instant getCalculadoEn() {
        return calculadoEn;
    }
}
