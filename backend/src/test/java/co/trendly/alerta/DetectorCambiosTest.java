package co.trendly.alerta;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import co.trendly.historico.PrecioActualizado;

class DetectorCambiosTest {

    private static final BigDecimal UMBRAL = new BigDecimal("5");

    private static PrecioActualizado precio(String id, String anterior, String nuevo, Boolean disponibleAntes, boolean disponible) {
        return new PrecioActualizado(1L, 2L, 3L, id, anterior == null ? null : new BigDecimal(anterior), new BigDecimal(nuevo),
                disponibleAntes, disponible, Instant.EPOCH);
    }

    private static Optional<DetectorCambios.Cambio> detectar(String anterior, String nuevo) {
        return DetectorCambios.detectar(precio("A", anterior, nuevo, true, true), UMBRAL, true);
    }

    @ParameterizedTest
    @CsvSource({ "100000, 104999", "100000, 95001", "100000, 100000", "100000, 104996.00" })
    void porDebajoDelUmbralNoHayAlerta(String anterior, String nuevo) {
        assertThat(detectar(anterior, nuevo)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "100000, 105000, SUBIDA_PRECIO, NORMAL, 5.00",
            "100000, 95000, BAJA_PRECIO, NORMAL, -5.00",
            "100000, 109999, SUBIDA_PRECIO, NORMAL, 10.00",
            "100000, 110000, SUBIDA_PRECIO, ALTA, 10.00",
            "100000, 90000, BAJA_PRECIO, ALTA, -10.00" })
    void desdeElUmbralHayAlertaConSuTipoYRelevancia(String anterior, String nuevo, TipoAlerta tipo, RelevanciaAlerta relevancia,
            String variacion) {
        DetectorCambios.Cambio cambio = detectar(anterior, nuevo).orElseThrow();

        assertThat(cambio.tipo()).isEqualTo(tipo);
        assertThat(cambio.relevancia()).isEqualTo(relevancia);
        assertThat(cambio.variacionPct()).isEqualByComparingTo(variacion);
    }

    @Test
    void laPrimeraCapturaNoTieneConQueCompararse() {
        assertThat(DetectorCambios.detectar(precio("A", null, "100000", null, true), UMBRAL, true)).isEmpty();
    }

    @Test
    void agotadoYDisponibleGeneranAlertaAunqueElPrecioNoCambie() {
        assertThat(DetectorCambios.detectar(precio("A", "100000", "100000", true, false), UMBRAL, true).orElseThrow().tipo())
                .isEqualTo(TipoAlerta.AGOTADO);
        assertThat(DetectorCambios.detectar(precio("A", "100000", "100000", false, true), UMBRAL, true).orElseThrow().tipo())
                .isEqualTo(TipoAlerta.DISPONIBLE);
    }

    @Test
    void sinAvisosDeDisponibilidadSoloCuentaElPrecio() {
        assertThat(DetectorCambios.detectar(precio("A", "100000", "100000", true, false), UMBRAL, false)).isEmpty();
        assertThat(DetectorCambios.detectar(precio("A", "100000", "100000", false, true), UMBRAL, false)).isEmpty();
        assertThat(DetectorCambios.detectar(precio("A", "100000", "120000", false, true), UMBRAL, false).orElseThrow().tipo())
                .isEqualTo(TipoAlerta.SUBIDA_PRECIO);
    }

    @Test
    void elPrecioDeUnaPublicacionAgotadaNoGeneraAlerta() {
        assertThat(DetectorCambios.detectar(precio("A", "100000", "50000", false, false), UMBRAL, true)).isEmpty();
    }

    @Test
    void unaVariacionEnormeCabeEnLaColumna() {
        assertThat(detectar("1", "99999999").orElseThrow().variacionPct()).isEqualByComparingTo("99999.99");
    }

    @Test
    void deVariosCambiosEligeLaRelevanciaAltaYLuegoLaMayorVariacion() {
        PrecioActualizado seis = precio("SEIS", "100000", "106000", true, true);
        PrecioActualizado siete = precio("SIETE", "100000", "93000", true, true);
        PrecioActualizado doce = precio("DOCE", "100000", "112000", true, true);
        PrecioActualizado igual = precio("IGUAL", "100000", "100000", true, true);

        assertThat(DetectorCambios.masImportante(List.of(seis, doce, siete, igual), UMBRAL, true).orElseThrow().precio().idPublicacion())
                .isEqualTo("DOCE");
        assertThat(DetectorCambios.masImportante(List.of(seis, siete, igual), UMBRAL, true).orElseThrow().precio().idPublicacion())
                .isEqualTo("SIETE");
        assertThat(DetectorCambios.masImportante(List.of(igual), UMBRAL, true)).isEmpty();
    }
}
