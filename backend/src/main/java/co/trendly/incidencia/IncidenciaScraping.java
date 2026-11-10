package co.trendly.incidencia;

import java.time.Instant;

import co.trendly.scraping.TipoFallo;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Una captura que falló o un dato descartado (tabla {@code incidencia_scraping}, SCRUM-45). */
@Entity
@Table(name = "incidencia_scraping")
public class IncidenciaScraping {

    static final int DETALLE_MAXIMO = 1000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "monitoreo_id", nullable = false, updatable = false)
    private Long monitoreoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private TipoFallo tipo;

    @Column(length = DETALLE_MAXIMO, updatable = false)
    private String detalle;

    @Column(nullable = false, updatable = false)
    private int intentos;

    @Column(name = "ocurrido_en", nullable = false, updatable = false)
    private Instant ocurridoEn;

    protected IncidenciaScraping() {
    }

    IncidenciaScraping(Long monitoreoId, TipoFallo tipo, String detalle, int intentos, Instant ocurridoEn) {
        this.monitoreoId = monitoreoId;
        this.tipo = tipo;
        this.detalle = detalle == null || detalle.length() <= DETALLE_MAXIMO ? detalle : detalle.substring(0, DETALLE_MAXIMO);
        this.intentos = intentos;
        this.ocurridoEn = ocurridoEn;
    }

    public Long getId() {
        return id;
    }

    public Long getMonitoreoId() {
        return monitoreoId;
    }

    public TipoFallo getTipo() {
        return tipo;
    }

    public String getDetalle() {
        return detalle;
    }

    public int getIntentos() {
        return intentos;
    }

    public Instant getOcurridoEn() {
        return ocurridoEn;
    }
}
