package co.trendly.historico;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** TRM vigente entre dos fechas (tabla {@code trm}): cuántos pesos vale 1 dólar. */
@Entity
@Table(name = "trm")
public class Trm {

    @Id
    @Column(name = "vigencia_desde")
    private LocalDate vigenciaDesde;

    @Column(name = "vigencia_hasta", nullable = false)
    private LocalDate vigenciaHasta;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "consultada_en", nullable = false)
    private Instant consultadaEn;

    protected Trm() {
    }

    public Trm(LocalDate vigenciaDesde, LocalDate vigenciaHasta, BigDecimal valor) {
        this.vigenciaDesde = vigenciaDesde;
        this.vigenciaHasta = vigenciaHasta;
        this.valor = valor;
        this.consultadaEn = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public LocalDate getVigenciaDesde() {
        return vigenciaDesde;
    }

    public LocalDate getVigenciaHasta() {
        return vigenciaHasta;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public Instant getConsultadaEn() {
        return consultadaEn;
    }
}
