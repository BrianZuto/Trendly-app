package co.trendly.tendencia;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

/** Las fórmulas del ranking de tendencias (SCRUM-53), con los ejemplos del README. */
class CalculoTendenciaTest {

    @Test
    void laDemandaBajaConLaPosicionYConLasAusencias() {
        assertThat(CalculoTendencia.demanda(1, 1)).isEqualByComparingTo("100");
        assertThat(CalculoTendencia.demanda(10, 1)).isEqualByComparingTo("10");
        assertThat(CalculoTendencia.demanda(2.5, 1)).isEqualByComparingTo("85");
        // Segundo puesto, pero solo salió en la mitad de las capturas
        assertThat(CalculoTendencia.demanda(2, 0.5)).isEqualByComparingTo("45");
    }

    @Test
    void laCompetenciaCreceConLosVendedoresHastaElTope() {
        assertThat(CalculoTendencia.competencia(1)).isEqualByComparingTo("5");
        assertThat(CalculoTendencia.competencia(8)).isEqualByComparingTo("40");
        assertThat(CalculoTendencia.competencia(20)).isEqualByComparingTo("100");
        assertThat(CalculoTendencia.competencia(57)).isEqualByComparingTo("100");
    }

    @Test
    void elMargenComparaElPrecioDeVentaConElCostoYNoBajaDeCero() {
        assertThat(CalculoTendencia.margen(new BigDecimal("64900"), new BigDecimal("28400"))).isEqualByComparingTo("56.2");
        assertThat(CalculoTendencia.margen(new BigDecimal("20000"), new BigDecimal("28400"))).isEqualByComparingTo("0");
    }

    @Test
    void elPuntajePesaLaDemandaElMargenYLaPocaCompetencia() {
        // 0,4 × 85 + 0,3 × 56,2 + 0,3 × (100 − 40) = 34 + 16,86 + 18 = 68,86
        assertThat(CalculoTendencia.puntaje(new BigDecimal("85"), new BigDecimal("56.2"), new BigDecimal("40")))
                .isEqualByComparingTo("68.9");
        assertThat(CalculoTendencia.puntaje(new BigDecimal("100"), new BigDecimal("100"), BigDecimal.ZERO))
                .isEqualByComparingTo("100");
    }
}
