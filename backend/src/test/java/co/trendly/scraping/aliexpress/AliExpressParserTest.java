package co.trendly.scraping.aliexpress;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;

/**
 * Lectura de páginas reales de AliExpress (SCRUM-41). Los fixtures de {@code src/test/resources/scraping/aliexpress}
 * se guardaron el 20/10/2026 con Chrome headless y la cookie de USD; los precios se compararon a mano con la página.
 */
class AliExpressParserTest {

    @Test
    void leeLaPrimeraPublicacionRealConSuTienda() {
        PublicacionCapturada p = ok("producto-1005006150134970.html", "1005006150134970");

        assertThat(p.idPublicacion()).isEqualTo("1005006150134970");
        assertThat(p.titulo()).startsWith("Auriculares TWS A6S originales").doesNotContain("AliExpress");
        assertThat(p.vendedor()).isEqualTo("Crystal 3C Store");
        assertThat(p.precio()).isEqualByComparingTo("1.38");
        assertThat(p.moneda()).isEqualTo("USD");
        assertThat(p.disponible()).isTrue();
        assertThat(p.posicion()).isNull();
    }

    @Test
    void leeLaSegundaPublicacionReal() {
        PublicacionCapturada p = ok("producto-1005006474515657.html", "1005006474515657");

        assertThat(p.titulo()).startsWith("Auriculares Bluetooth TWS Air Pro");
        assertThat(p.vendedor()).isEqualTo("Shop1103482234 Store");
        assertThat(p.precio()).isEqualByComparingTo("2.14");
        assertThat(p.moneda()).isEqualTo("USD");
    }

    @Test
    void unaPublicacionDeAliExpressChoiceNoMuestraTienda() {
        PublicacionCapturada p = ok("producto-1005006678032645.html", "1005006678032645");

        assertThat(p.titulo()).startsWith("Auriculares inalámbricos Bluetooth T2");
        assertThat(p.precio()).isEqualByComparingTo("1.09");
        assertThat(p.moneda()).isEqualTo("USD");
        assertThat(p.vendedor()).isNull();
    }

    @Test
    void unaPublicacionAgotadaNoEstaDisponible() {
        String html = fixture("producto-1005006150134970.html")
                .replace("https://schema.org/InStock", "https://schema.org/OutOfStock");

        assertThat(AliExpressParser.leer(html, "1").publicaciones().getFirst().disponible()).isFalse();
    }

    @Test
    void unaPublicacionQueNoExisteEsNoEncontrado() {
        assertFallo(AliExpressParser.leer(fixture("no-existe-1005000000000001.html"), "1005000000000001"),
                TipoFallo.NO_ENCONTRADO);
    }

    @Test
    void laPaginaSinJavaScriptNoTraeDatosYEsEstructura() {
        // Lo que devuelve una petición simple: la página vacía que después llena JavaScript
        assertFallo(AliExpressParser.leer(fixture("sin-javascript-1005006150134970.html"), "1005006150134970"),
                TipoFallo.ESTRUCTURA);
    }

    @Test
    void siLaMonedaDelJsonLdNoCoincideConLaDeLaPaginaNoSeGuarda() {
        // Caso real: AliExpress marcó "USD" en el JSON-LD con el valor en pesos ("$ 6.090")
        String html = fixture("producto-1005006150134970.html").replace("\"priceCurrency\":\"USD\"", "\"priceCurrency\":\"COP\"");

        ResultadoScraping resultado = AliExpressParser.leer(html, "1");

        assertFallo(resultado, TipoFallo.DATO_INVALIDO);
        assertThat(resultado.motivo()).contains("USD").contains("COP");
    }

    @Test
    void unPrecioEnCeroOAusenteEsDatoInvalido() {
        String producto = fixture("producto-1005006150134970.html");

        assertFallo(AliExpressParser.leer(producto.replace("\"price\":\"1.38\"", "\"price\":\"0\""), "1"),
                TipoFallo.DATO_INVALIDO);
        assertFallo(AliExpressParser.leer(producto.replace("\"price\":\"1.38\"", "\"price\":\"gratis\""), "1"),
                TipoFallo.DATO_INVALIDO);
    }

    @Test
    void laPantallaDeVerificacionEsBloqueo() {
        String captcha = """
                <html><head><title>Captcha Interception</title></head>
                <body><div id="nc_1_n1z" class="nc_iconfont btn_slide"></div></body></html>""";

        assertFallo(AliExpressParser.leer(captcha, "1"), TipoFallo.BLOQUEO);
    }

    @Test
    void aceptaOfertasAgregadasYJsonLdComoObjeto() {
        String html = """
                <html><body>
                <script type="application/ld+json">{ roto </script>
                <script type="application/ld+json">{"@type":"Product","name":"Mouse - AliExpress",
                  "offers":{"@type":"AggregateOffer","lowPrice":"3.5","highPrice":"9","priceCurrency":"usd"}}</script>
                </body></html>""";

        PublicacionCapturada p = AliExpressParser.leer(html, "7").publicaciones().getFirst();

        assertThat(p.titulo()).isEqualTo("Mouse");
        assertThat(p.precio()).isEqualByComparingTo("3.5");
        assertThat(p.moneda()).isEqualTo("USD");
        assertThat(p.disponible()).isTrue();
    }

    private static PublicacionCapturada ok(String archivo, String id) {
        ResultadoScraping resultado = AliExpressParser.leer(fixture(archivo), id);
        assertThat(resultado.esOk()).as(resultado.motivo()).isTrue();
        assertThat(resultado.publicaciones()).hasSize(1);
        return resultado.publicaciones().getFirst();
    }

    private static void assertFallo(ResultadoScraping resultado, TipoFallo tipo) {
        assertThat(resultado.estado()).isEqualTo(ResultadoScraping.Estado.FALLO);
        assertThat(resultado.tipoFallo()).isEqualTo(tipo);
        assertThat(resultado.motivo()).isNotBlank();
        assertThat(resultado.publicaciones()).isEmpty();
    }

    static String fixture(String archivo) {
        try (InputStream entrada = AliExpressParserTest.class.getResourceAsStream("/scraping/aliexpress/" + archivo)) {
            return new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
