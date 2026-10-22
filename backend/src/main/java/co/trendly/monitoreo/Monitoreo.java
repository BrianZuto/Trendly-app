package co.trendly.monitoreo;

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

/** Competidor que se vigila para un producto (tabla {@code monitoreo}). */
@Entity
@Table(name = "monitoreo")
public class Monitoreo {

    public static final int FRECUENCIA_POR_DEFECTO = 6;
    /** Palabra clave (SCRUM-37): cuántas publicaciones de la búsqueda se capturan; la BD lo limita a 1-10. */
    public static final int TOP_N_POR_DEFECTO = 5;
    public static final int TOP_N_MAXIMO = 10;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "producto_id", nullable = false, updatable = false)
    private Long productoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private TipoMonitoreo tipo;

    /** URL de la publicación o palabra clave de búsqueda. */
    @Column(nullable = false, length = 500, updatable = false)
    private String valor;

    /** Solo para URL: MCO-… o el número del ítem de AliExpress. */
    @Column(name = "id_publicacion", length = 60, updatable = false)
    private String idPublicacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private Marketplace marketplace;

    /** Solo para PALABRA_CLAVE (SCRUM-37). */
    @Column(name = "top_n")
    private Integer topN;

    @Column(name = "frecuencia_horas", nullable = false)
    private int frecuenciaHoras;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoMonitoreo estado;

    @Column(name = "fallos_consecutivos", nullable = false)
    private int fallosConsecutivos;

    @Column(name = "proxima_ejecucion")
    private Instant proximaEjecucion;

    @Column(name = "ultima_captura")
    private Instant ultimaCaptura;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    protected Monitoreo() {
    }

    /** Monitoreo de una publicación puntual. Queda ACTIVO y listo para que el job lo capture de inmediato. */
    public static Monitoreo porUrl(Long productoId, String url, PublicacionUrl publicacion, int frecuenciaHoras) {
        Monitoreo monitoreo = new Monitoreo();
        // DATETIME(6) guarda microsegundos: así la respuesta del POST coincide con lo que queda en la BD
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);
        monitoreo.productoId = productoId;
        monitoreo.tipo = TipoMonitoreo.URL;
        monitoreo.valor = url;
        monitoreo.idPublicacion = publicacion.idPublicacion();
        monitoreo.marketplace = publicacion.marketplace();
        monitoreo.frecuenciaHoras = frecuenciaHoras;
        monitoreo.estado = EstadoMonitoreo.ACTIVO;
        monitoreo.proximaEjecucion = ahora;
        monitoreo.creadoEn = ahora;
        return monitoreo;
    }

    /**
     * Monitoreo de las N primeras publicaciones de una búsqueda (SCRUM-37). No tiene identificador de publicación:
     * cada resultado se guarda en el histórico con el suyo. Queda ACTIVO y listo para capturarse de inmediato.
     */
    public static Monitoreo porPalabraClave(Long productoId, String palabraClave, Marketplace marketplace, int topN,
            int frecuenciaHoras) {
        Monitoreo monitoreo = new Monitoreo();
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);
        monitoreo.productoId = productoId;
        monitoreo.tipo = TipoMonitoreo.PALABRA_CLAVE;
        monitoreo.valor = palabraClave;
        monitoreo.marketplace = marketplace;
        monitoreo.topN = topN;
        monitoreo.frecuenciaHoras = frecuenciaHoras;
        monitoreo.estado = EstadoMonitoreo.ACTIVO;
        monitoreo.proximaEjecucion = ahora;
        monitoreo.creadoEn = ahora;
        return monitoreo;
    }

    /** Hubo una captura nueva en el histórico (SCRUM-42). */
    public void registrarCaptura(Instant cuando) {
        ultimaCaptura = cuando;
    }

    /**
     * Resultado de un ciclo del job (SCRUM-39): la próxima captura queda en ahora + frecuencia. Un éxito reinicia los
     * fallos seguidos; un fallo los suma (al llegar a 3 el monitoreo pasa a ERROR en SCRUM-45).
     */
    public void registrarCiclo(Instant ahora, boolean exito) {
        proximaEjecucion = ahora.plus(frecuenciaHoras, ChronoUnit.HOURS);
        fallosConsecutivos = exito ? 0 : fallosConsecutivos + 1;
    }

    public void pausar() {
        estado = EstadoMonitoreo.PAUSADO;
    }

    /** Vuelve a ACTIVO (también desde ERROR), sin fallos acumulados y con captura inmediata. */
    public void reactivar() {
        estado = EstadoMonitoreo.ACTIVO;
        fallosConsecutivos = 0;
        proximaEjecucion = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public Long getId() {
        return id;
    }

    public Long getProductoId() {
        return productoId;
    }

    public TipoMonitoreo getTipo() {
        return tipo;
    }

    public String getValor() {
        return valor;
    }

    public String getIdPublicacion() {
        return idPublicacion;
    }

    public Marketplace getMarketplace() {
        return marketplace;
    }

    public Integer getTopN() {
        return topN;
    }

    public int getFrecuenciaHoras() {
        return frecuenciaHoras;
    }

    public EstadoMonitoreo getEstado() {
        return estado;
    }

    public int getFallosConsecutivos() {
        return fallosConsecutivos;
    }

    public Instant getProximaEjecucion() {
        return proximaEjecucion;
    }

    public Instant getUltimaCaptura() {
        return ultimaCaptura;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }
}
