package co.trendly.monitoreo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** Reconocimiento del marketplace y del identificador a partir de la URL (SCRUM-36). */
class PublicacionUrlTest {

    @ParameterizedTest
    @CsvSource({
            "https://articulo.mercadolibre.com.co/MCO-123456789-audifonos-bluetooth-_JM, MERCADOLIBRE, MCO-123456789",
            "https://www.mercadolibre.com.co/audifonos-sony/p/MCO19876543?pdp_filters=item_id, MERCADOLIBRE, MCO-19876543",
            "https://mercadolibre.com.co/mco-555-algo, MERCADOLIBRE, MCO-555",
            "https://es.aliexpress.com/item/1005001234567890.html?spm=a2g0o, ALIEXPRESS, 1005001234567890",
            "https://www.aliexpress.com/item/1005009999.html, ALIEXPRESS, 1005009999",
            "https://aliexpress.com/item/42.html, ALIEXPRESS, 42",
            "  HTTPS://ARTICULO.MERCADOLIBRE.COM.CO/MCO-1-x  , MERCADOLIBRE, MCO-1",
    })
    void reconoceElMarketplaceYElIdentificador(String url, Marketplace marketplace, String idPublicacion) {
        assertThat(PublicacionUrl.reconocer(url)).isEqualTo(new PublicacionUrl(marketplace, idPublicacion));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://www.amazon.com/dp/B0ABCDEFGH",
            "https://www.falabella.com.co/falabella-co/product/123",
            "https://mercadolibre.com.ar/MCO-123",
            "https://mercadolibre.com.co.sitio-falso.com/MCO-123",
            "https://falsomercadolibre.com.co/MCO-123",
    })
    void otroSitioNoEsSoportado(String url) {
        assertThatThrownBy(() -> PublicacionUrl.reconocer(url))
                .isInstanceOf(ErrorDeNegocio.class)
                .hasMessage(PublicacionUrl.MENSAJE_NO_SOPORTADO)
                .extracting("estado").isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @ParameterizedTest
    @ValueSource(strings = {"no es una url", "ftp://articulo.mercadolibre.com.co/MCO-1", "articulo.mercadolibre.com.co/MCO-1",
            "https://", "https://exa mple.com"})
    void unaUrlMalEscritaEsInvalida(String url) {
        assertThatThrownBy(() -> PublicacionUrl.reconocer(url)).hasMessage(PublicacionUrl.MENSAJE_URL_INVALIDA);
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://www.mercadolibre.com.co/ofertas", "https://es.aliexpress.com/store/12345"})
    void sinIdentificadorNoSePuedeVigilar(String url) {
        assertThatThrownBy(() -> PublicacionUrl.reconocer(url)).hasMessage(PublicacionUrl.MENSAJE_SIN_IDENTIFICADOR);
    }
}
