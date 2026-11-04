package co.trendly.sugerencia;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class CalculadoraPrecioTest {

    private static final BigDecimal COSTO = bd("50000");
    private static final BigDecimal MARGEN = bd("30");
    private static final BigDecimal COMISION = bd("15");

    private static BigDecimal bd(String valor) {
        return new BigDecimal(valor);
    }

    private static List<BigDecimal> precios(String... valores) {
        return Arrays.stream(valores).map(BigDecimal::new).toList();
    }

    private static CalculadoraPrecio.Calculo calcular(String precioVenta, String... competencia) {
        return CalculadoraPrecio.calcular(COSTO, bd(precioVenta), MARGEN, COMISION, precios(competencia));
    }

    /** A mano: 50.000 ÷ (1 − 0,30 − 0,15) = 90.909,09…; 100.000 × 0,99 = 99.000; (99.000 − 50.000 − 14.850) ÷ 99.000 = 34,49 %. */
    @Test
    void conCompetenciaCaraSugiereUnUnoPorCientoMenosQueElMinimo() {
        CalculadoraPrecio.Calculo calculo = calcular("120000", "100000", "130000", "160000");

        assertThat(calculo.minimoRentable()).isEqualByComparingTo("90909.10");
        assertThat(calculo.sugerido()).isEqualByComparingTo("99000");
        assertThat(calculo.margenResultante()).isEqualByComparingTo("34.49");
        assertThat(calculo.competitivo()).isTrue();
        assertThat(calculo.minimo()).isEqualByComparingTo("100000");
        assertThat(calculo.promedio()).isEqualByComparingTo("130000");
        assertThat(calculo.mediana()).isEqualByComparingTo("130000");
    }

    @Test
    void conCompetenciaBarataSugiereElMinimoRentableYQuedaNoCompetitivo() {
        CalculadoraPrecio.Calculo calculo = calcular("95000", "70000", "80000");

        assertThat(calculo.sugerido()).isEqualByComparingTo("90909.10");
        assertThat(calculo.margenResultante()).isEqualByComparingTo("30.00");
        assertThat(calculo.competitivo()).isFalse();
    }

    /** El 1 % menos caería por debajo del mínimo rentable y se perdería margen. */
    @Test
    void elUnoPorCientoMenosNuncaBajaDelMinimoRentable() {
        CalculadoraPrecio.Calculo calculo = calcular("95000", "91000");

        assertThat(calculo.sugerido()).isEqualByComparingTo("90909.10");
        assertThat(calculo.competitivo()).isTrue();
    }

    @Test
    void siMargenYComisionLleganAlCienNoHayPrecioPosible() {
        CalculadoraPrecio.Calculo calculo = CalculadoraPrecio.calcular(COSTO, bd("95000"), bd("85"), COMISION,
                precios("100000"));

        assertThat(calculo.minimoRentable()).isNull();
        assertThat(calculo.sugerido()).isNull();
        assertThat(calculo.margenResultante()).isNull();
        assertThat(calculo.competitivo()).isFalse();
        assertThat(calculo.posicion()).isEqualTo(PosicionPrecio.MAS_BARATO);
    }

    @Test
    void conCantidadParLaMedianaEsElPromedioDeLosDosDelMedio() {
        assertThat(calcular("95000", "100000", "90000", "120000", "110000").mediana()).isEqualByComparingTo("105000");
    }

    @ParameterizedTest
    @CsvSource({ "89999, MAS_BARATO", "90000, EN_RANGO", "100000, EN_RANGO", "110000, EN_RANGO", "110001, MAS_CARO" })
    void laPosicionComparaElPrecioDeVentaConLaCompetencia(String precioVenta, PosicionPrecio esperada) {
        assertThat(calcular(precioVenta, "90000", "110000").posicion()).isEqualTo(esperada);
    }
}
