package co.trendly.historico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;

import co.trendly.historico.ValidadorCaptura.ValidacionCaptura;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.PublicacionUrl;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;

/** Validación de los datos antes de entrar al histórico (SCRUM-45). */
class ValidadorCapturaTest {

    private static final String URL_ML = "https://www.mercadolibre.com.co/x/p/MCO123";
    private static final String URL_ALI = "https://es.aliexpress.com/item/1005006150134970.html";

    private final HistoricoPrecioRepository historico = mock(HistoricoPrecioRepository.class);
    private final ValidadorCaptura validador = new ValidadorCaptura(historico);

    @Test
    void unaPrimeraCapturaCorrectaEsValida() {
        ValidacionCaptura v = validar(URL_ML, publicacion("MCO-123", "Audífonos", "89900", "COP"));

        assertThat(v.validas()).hasSize(1);
        assertThat(v.descartes()).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({"1000, 1700, true", "1000, 300, true", "1000, 1701, false", "1000, 299, false", "1000, 100, false",
            "1000, 1900, false"})
    void laVariacionNoPuedeSuperarEl70PorCiento(String anterior, String nuevo, boolean valida) {
        conCapturaAnterior(anterior, "COP");

        ValidacionCaptura v = validar(URL_ML, publicacion("MCO-123", "Audífonos", nuevo, "COP"));

        assertThat(v.validas().isEmpty()).isNotEqualTo(valida);
        if (!valida) {
            assertThat(v.descartes().getFirst()).startsWith("MCO-123: Precio sospechoso");
        }
    }

    @Test
    void siLaCapturaAnteriorEstabaEnOtraMonedaNoSeComparan() {
        conCapturaAnterior("4000000", "COP"); // AliExpress guardado en pesos antes de exigir USD

        assertThat(validar(URL_ALI, publicacion("1005", "Audífonos", "1.38", "USD")).validas()).hasSize(1);
    }

    @ParameterizedTest
    @CsvSource({"0", "-5"})
    void elPrecioDebeSerMayorQueCero(String precio) {
        ValidacionCaptura v = validar(URL_ML, publicacion("MCO-123", "Audífonos", precio, "COP"));

        assertThat(v.validas()).isEmpty();
        assertThat(v.descartes().getFirst()).contains("mayor que 0");
    }

    @Test
    void laMonedaDebeSerLaEsperadaDelMarketplace() {
        assertThat(validar(URL_ML, publicacion("MCO-123", "Audífonos", "10", "USD")).descartes().getFirst())
                .contains("debía ser COP");
        assertThat(validar(URL_ALI, publicacion("1005", "Audífonos", "6090", "COP")).descartes().getFirst())
                .contains("debía ser USD");
        assertThat(validar(URL_ALI, publicacion("1005", "Audífonos", "1.38", "USD")).validas()).hasSize(1);
    }

    @Test
    void debenEstarLosCamposObligatorios() {
        assertThat(validar(URL_ML, new PublicacionCapturada("MCO-123", "  ", null, null, BigDecimal.TEN, "COP", true))
                .descartes().getFirst()).contains("título");
        assertThat(validar(URL_ML, new PublicacionCapturada("MCO-123", "x", null, null, null, "COP", true))
                .descartes().getFirst()).contains("mayor que 0");
        assertThat(validar(URL_ML, new PublicacionCapturada("MCO-123", "x", null, null, BigDecimal.TEN, null, true))
                .descartes().getFirst()).contains("moneda");
    }

    @Test
    void sinIdentificadorUsaElDelMonitoreoYSiNoHayLoDescarta() {
        assertThat(validar(URL_ML, publicacion(null, "Audífonos", "10", "COP")).validas()).hasSize(1);

        Monitoreo sinId = monitoreo(URL_ML);
        ReflectionTestUtils.setField(sinId, "idPublicacion", null);
        ValidacionCaptura v = validador.validar(sinId, ResultadoScraping.ok(List.of(publicacion(null, "Audífonos", "10", "COP"))));
        assertThat(v.descartes()).containsExactly("Falta el identificador de la publicación");
    }

    private void conCapturaAnterior(String precio, String moneda) {
        HistoricoPrecio anterior = new HistoricoPrecio(1L, "x", "x", null, null, new BigDecimal(precio), moneda,
                new BigDecimal(precio), true, "x", Instant.parse("2026-11-01T00:00:00Z"));
        when(historico.findFirstByMonitoreoIdAndPublicacionIdOrderByCapturadoEnDescIdDesc(any(), any()))
                .thenReturn(Optional.of(anterior));
    }

    private ValidacionCaptura validar(String url, PublicacionCapturada publicacion) {
        return validador.validar(monitoreo(url), ResultadoScraping.ok(List.of(publicacion)));
    }

    private static Monitoreo monitoreo(String url) {
        return Monitoreo.porUrl(1L, url, PublicacionUrl.reconocer(url), 6);
    }

    private static PublicacionCapturada publicacion(String id, String titulo, String precio, String moneda) {
        return new PublicacionCapturada(id, titulo, null, null, new BigDecimal(precio), moneda, true);
    }
}
