package co.trendly.reporte;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.Test;

import co.trendly.reporte.CalculoCompetencia.Competencia;
import co.trendly.reporte.CalculoCompetencia.Punto;
import co.trendly.reporte.CalculoCompetencia.ResumenDia;
import co.trendly.reporte.CalculoCompetencia.Variacion;

/**
 * Las métricas deben coincidir con el tablero: los casos y los valores esperados son los de
 * {@code frontend/src/features/dashboard/tablero.js} con los mismos datos.
 */
class CalculoCompetenciaTest {

    private static final Instant AHORA = Instant.parse("2026-11-04T15:00:00Z");
    private static final BigDecimal MI_PRECIO = new BigDecimal("66000");

    @Test
    void comoLasTarjetasDelTableroUsaLaUltimaCapturaConStockDeCadaPublicacion() {
        // Es el caso de Dashboard.test.jsx: mínimo $60.000, promedio $66.000 y +10,0 %
        Competencia c = CalculoCompetencia.competencia(List.of(
                punto("MERCADOLIBRE", "MCO1", 20, "70000", true),
                punto("FALABELLA", "F1", 3, "72000", true),
                punto("MERCADOLIBRE", "MCO1", 0, "60000", true)), MI_PRECIO);

        assertThat(c.minimo()).isEqualByComparingTo("60000");
        assertThat(c.fuente()).isEqualTo("MERCADOLIBRE");
        assertThat(c.vendedor()).isEqualTo("Tienda MCO1");
        assertThat(c.promedio()).isEqualByComparingTo("66000");
        assertThat(c.conStock()).isEqualTo(2);
        assertThat(c.diferenciaPct()).isEqualByComparingTo("10.0");
    }

    @Test
    void unaPublicacionAgotadaNoCuentaAunqueAntesTuvieraStock() {
        Competencia c = CalculoCompetencia.competencia(List.of(
                punto("MERCADOLIBRE", "MCO1", 2, "50000", true),
                punto("MERCADOLIBRE", "MCO1", 0, "50000", false),
                punto("FALABELLA", "F1", 0, "72000", true)), MI_PRECIO);

        assertThat(c.minimo()).isEqualByComparingTo("72000");
        assertThat(c.conStock()).isEqualTo(1);
        assertThat(c.diferenciaPct()).isEqualByComparingTo("-8.3");
    }

    @Test
    void sinPublicacionesConStockNoHayMetricasDeCompetencia() {
        assertThat(CalculoCompetencia.competencia(List.of(), MI_PRECIO)).isEqualTo(Competencia.VACIA);
        assertThat(CalculoCompetencia.competencia(List.of(punto("FALABELLA", "F1", 0, "1000", false)), MI_PRECIO))
                .isEqualTo(Competencia.VACIA);
    }

    @Test
    void elPromedioSeRedondeaAPesosEnterosComoEnElTablero() {
        Competencia c = CalculoCompetencia.competencia(List.of(
                punto("MERCADOLIBRE", "A", 0, "100", true),
                punto("MERCADOLIBRE", "B", 0, "101", true)), MI_PRECIO);

        assertThat(c.promedio()).isEqualByComparingTo("101"); // 100,5 → 101
    }

    @Test
    void laVariacionComparaElMinimoAlEmpezarYAlTerminarElPeriodo() {
        // Con 30 días, como en la frase del tablero: "bajó 14,3 % (de $70.000 a $60.000)"
        Variacion v = CalculoCompetencia.variacion(List.of(
                punto("MERCADOLIBRE", "MCO1", 40, "70000", true),
                punto("FALABELLA", "F1", 3, "72000", true),
                punto("MERCADOLIBRE", "MCO1", 0, "60000", true)), AHORA.minus(Duration.ofDays(30)), AHORA);

        assertThat(v.inicial()).isEqualByComparingTo("70000");
        assertThat(v.fin()).isEqualByComparingTo("60000");
        assertThat(v.porcentaje()).isEqualByComparingTo("-14.3");
    }

    @Test
    void siElMinimoNoCambiaLaVariacionEsCeroYSinCapturasNoHayVariacion() {
        assertThat(CalculoCompetencia.variacion(List.of(punto("MERCADOLIBRE", "A", 10, "100", true)),
                AHORA.minus(Duration.ofDays(30)), AHORA).porcentaje()).isEqualByComparingTo("0");
        assertThat(CalculoCompetencia.variacion(List.of(), AHORA.minus(Duration.ofDays(7)), AHORA)).isNull();
    }

    @Test
    void elResumenPorDiaUsaLaHoraDeColombiaYLaUltimaCapturaDelDia() {
        List<Punto> puntos = List.of(
                // 02:00 UTC del 4 son las 21:00 del 3 en Colombia
                new Punto("MERCADOLIBRE", "A", null, Instant.parse("2026-11-04T02:00:00Z"), new BigDecimal("100"), true),
                new Punto("MERCADOLIBRE", "A", null, Instant.parse("2026-11-04T12:00:00Z"), new BigDecimal("200"), true),
                new Punto("MERCADOLIBRE", "A", null, Instant.parse("2026-11-04T18:00:00Z"), new BigDecimal("150"), true),
                new Punto("MERCADOLIBRE", "B", null, Instant.parse("2026-11-04T18:00:00Z"), new BigDecimal("250"), true),
                new Punto("MERCADOLIBRE", "A", null, Instant.parse("2026-11-05T18:00:00Z"), new BigDecimal("150"), false));

        assertThat(CalculoCompetencia.porDia(puntos, ZoneId.of("America/Bogota"))).containsExactly(
                new ResumenDia(LocalDate.of(2026, 11, 3), new BigDecimal("100"), new BigDecimal("100"), 1),
                new ResumenDia(LocalDate.of(2026, 11, 4), new BigDecimal("150"), new BigDecimal("200"), 2),
                new ResumenDia(LocalDate.of(2026, 11, 5), null, null, 0));
    }

    private static Punto punto(String fuente, String id, int diasAtras, String precio, boolean disponible) {
        return new Punto(fuente, id, "Tienda " + id, AHORA.minus(Duration.ofDays(diasAtras)).minusSeconds(60),
                new BigDecimal(precio), disponible);
    }
}
