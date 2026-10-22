package co.trendly.scraping.mercadolibre;

import static co.trendly.scraping.mercadolibre.MercadoLibreParserTest.json;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.PublicacionUrl;
import co.trendly.monitoreo.TipoMonitoreo;
import co.trendly.scraping.FalloDeScraping;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.ScrapingProperties;
import co.trendly.scraping.TipoFallo;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import tools.jackson.databind.JsonNode;

/**
 * Flujo del scraper de MercadoLibre (SCRUM-40) con una API simulada que responde con las respuestas reales
 * guardadas en {@code src/test/resources/scraping/mercadolibre/real}: sin internet.
 */
class MercadoLibreScraperTest {

    /** URLs reales copiadas del navegador el 22/10/2026, con el {@code wid} de la oferta que se estaba viendo. */
    private static final String URL_REDMI = "https://www.mercadolibre.com.co/auriculares-xiaomi-redmi-buds-8-active-"
            + "bluetooth-blanco/p/MCO66318680#polycard_client=search-desktop&be_origin=backend&position=5"
            + "&type=product&wid=MCO3935884874&sid=search";
    private static final String URL_MAXELL = "https://www.mercadolibre.com.co/audifonos-inalambricos-maxell-bluetooth-"
            + "fly-30-horas-negro-negro/p/MCO65122176#polycard_client=search-desktop&position=6&type=product"
            + "&wid=MCO3604607034&sid=search";
    private static final String URL_SONY = "https://www.mercadolibre.com.co/audifonos-bluetooth-sony-wh-1000xm6b-"
            + "noise-cancelling-color-negro/p/MCO51011158#polycard_client=search-desktop&position=7&type=product"
            + "&wid=MCO4494987738&sid=search";

    private final List<String> rutas = new ArrayList<>();

    @Test
    void atiendeMercadoLibre() {
        assertThat(scraper().marketplace()).isEqualTo(Marketplace.MERCADOLIBRE);
    }

    @Test
    void conLasTresUrlsRealesObtieneElPrecioDeLaOfertaQueSeVeia() {
        assertThat(precio(URL_REDMI)).isEqualTo("63400");
        assertThat(precio(URL_MAXELL)).isEqualTo("51113");
        assertThat(precio(URL_SONY)).isEqualTo("1299900");
        assertThat(rutas).containsExactly(
                "/products/MCO66318680", "/products/MCO66318680/items?item_id=MCO3935884874",
                "/products/MCO65122176", "/products/MCO65122176/items?item_id=MCO3604607034",
                "/products/MCO51011158", "/products/MCO51011158/items?item_id=MCO4494987738");
    }

    @Test
    void sinWidTomaLaMejorOfertaDelProducto() {
        ResultadoScraping resultado = scraper().obtener(porUrl(
                "https://www.mercadolibre.com.co/auriculares-xiaomi-redmi-buds-8-active-bluetooth-blanco/p/MCO66318680"));

        assertThat(resultado.publicaciones().getFirst().idPublicacion()).isEqualTo("MCO-3935884874");
        assertThat(rutas).containsExactly("/products/MCO66318680", "/products/MCO66318680/items?limit=1");
    }

    @Test
    void unaUrlDePublicacionSueltaEsBloqueoConLaExplicacionYSinLlamarLaApi() {
        ResultadoScraping resultado = scraper().obtener(
                porUrl("https://articulo.mercadolibre.com.co/MCO-1452369874-audifonos-bluetooth-_JM"));

        assertThat(resultado.tipoFallo()).isEqualTo(TipoFallo.BLOQUEO);
        assertThat(resultado.motivo()).isEqualTo(MercadoLibreScraper.SOLO_CATALOGO);
        assertThat(rutas).isEmpty();
    }

    @Test
    void unProductoSinOfertasActivasEsNoEncontrado() {
        ResultadoScraping resultado = scraper().obtener(porUrl("https://www.mercadolibre.com.co/x/p/MCO36701386"));

        assertThat(resultado.tipoFallo()).isEqualTo(TipoFallo.NO_ENCONTRADO);
        assertThat(resultado.motivo()).isEqualTo(MercadoLibreScraper.SIN_OFERTAS);
    }

    @Test
    void enModoPalabraClaveDevuelveLasNPrimerasConOfertaYSuPosicion() {
        ResultadoScraping resultado = scraper().obtener(porPalabraClave("  redmi buds ", 6));

        assertThat(resultado.esOk()).isTrue();
        // El 6.º producto de la búsqueda no tiene ofertas: se salta y entra el 7.º
        assertThat(resultado.publicaciones())
                .extracting(PublicacionCapturada::posicion, PublicacionCapturada::idPublicacion,
                        p -> p.precio().toPlainString())
                .containsExactly(
                        tuple(1, "MCO-2245703081", "173990"),
                        tuple(2, "MCO-4443245004", "103499"),
                        tuple(3, "MCO-2210402643", "79900"),
                        tuple(4, "MCO-1999119695", "163900"),
                        tuple(5, "MCO-4408890072", "163900"),
                        tuple(6, "MCO-4494609868", "142752"));
        assertThat(rutas.getFirst()).isEqualTo("/products/search?status=active&site_id=MCO&q=redmi%20buds&limit=24");
        // 1 búsqueda + 7 productos revisados; el 8.º ya no hacía falta
        assertThat(rutas).hasSize(8);
    }

    @Test
    void sinTopNTomaCincoYNuncaPasaDelMaximo() {
        assertThat(scraper().obtener(porPalabraClave("redmi buds", null)).publicaciones()).hasSize(5);
        scraper().obtener(porPalabraClave("redmi buds", 500));

        assertThat(rutas).filteredOn(r -> r.startsWith("/products/search")).containsExactly(
                "/products/search?status=active&site_id=MCO&q=redmi%20buds&limit=20",
                "/products/search?status=active&site_id=MCO&q=redmi%20buds&limit=50");
    }

    @Test
    void unaBusquedaRealSinOfertasEsNoEncontradaConElMotivo() {
        ResultadoScraping resultado = scraper().obtener(porPalabraClave("audífonos bluetooth", 5));

        assertThat(resultado.tipoFallo()).isEqualTo(TipoFallo.NO_ENCONTRADO);
        assertThat(resultado.motivo()).isEqualTo(MercadoLibreScraper.BUSQUEDA_SIN_OFERTAS);
        assertThat(rutas.getFirst()).contains("q=aud%C3%ADfonos%20bluetooth");
    }

    @Test
    void unaBusquedaConOtraEstructuraEsFallo() {
        MercadoLibreScraper scraper = scraper(ruta -> MercadoLibreParserTest.texto("{\"error\": \"x\"}"));

        assertThat(scraper.obtener(porPalabraClave("redmi", 5)).tipoFallo()).isEqualTo(TipoFallo.ESTRUCTURA);
    }

    @Test
    void unBloqueoOTimeoutEnMitadDeLaBusquedaEsFalloConMotivo() {
        MercadoLibreScraper scraper = scraper(ruta -> {
            if (ruta.startsWith("/products/search")) {
                return json("busqueda-redmi-buds.json");
            }
            throw new FalloDeScraping(TipoFallo.BLOQUEO, "La API de MercadoLibre respondió 429");
        });

        ResultadoScraping resultado = scraper.obtener(porPalabraClave("redmi buds", 5));

        assertThat(resultado.tipoFallo()).isEqualTo(TipoFallo.BLOQUEO);
        assertThat(resultado.motivo()).contains("429");
    }

    @Test
    void unTimeoutAlLeerLasOfertasEsTimeout() {
        MercadoLibreScraper scraper = scraper(ruta -> {
            if (ruta.endsWith("MCO66318680")) {
                return json("producto-MCO66318680.json");
            }
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "MercadoLibre no respondió en 10000 ms");
        });

        assertThat(scraper.obtener(porUrl(URL_REDMI)).tipoFallo()).isEqualTo(TipoFallo.TIMEOUT);
    }

    @Test
    void unProductoInexistenteEsNoEncontrado() {
        MercadoLibreScraper scraper = scraper(ruta -> {
            throw new FalloDeScraping(TipoFallo.NO_ENCONTRADO, "La API de MercadoLibre respondió 404");
        });

        ResultadoScraping resultado = scraper.obtener(porUrl("https://www.mercadolibre.com.co/x/p/MCO1"));

        assertThat(resultado.tipoFallo()).isEqualTo(TipoFallo.NO_ENCONTRADO);
        assertThat(resultado.motivo()).contains("404");
    }

    @Test
    void unErrorInesperadoTambienSeConvierteEnFallo() {
        MercadoLibreScraper scraper = scraper(ruta -> {
            throw new IllegalStateException("algo raro");
        });

        ResultadoScraping resultado = scraper.obtener(porUrl(URL_REDMI));

        assertThat(resultado.tipoFallo()).isEqualTo(TipoFallo.ESTRUCTURA);
        assertThat(resultado.motivo()).contains("algo raro");
    }

    @Test
    void siElLimiteDePeticionesNoDaTurnoEsTimeoutSinLlamarLaApi() {
        RateLimiter sinTurnos = RateLimiter.of("prueba", RateLimiterConfig.custom()
                .limitForPeriod(1).limitRefreshPeriod(Duration.ofHours(1)).timeoutDuration(Duration.ZERO).build());
        sinTurnos.acquirePermission();

        ResultadoScraping resultado = new MercadoLibreScraper(this::responder, sinTurnos).obtener(porUrl(URL_REDMI));

        assertThat(resultado.tipoFallo()).isEqualTo(TipoFallo.TIMEOUT);
        assertThat(rutas).isEmpty();
    }

    @Test
    void elLimitadorRealDaUnaPeticionCadaDosSegundos() {
        RateLimiter limitador = MercadoLibreScraper.limitador(new ScrapingProperties("UA", 10_000, 2, false));

        assertThat(limitador.getRateLimiterConfig().getLimitForPeriod()).isEqualTo(1);
        assertThat(limitador.getRateLimiterConfig().getLimitRefreshPeriod()).isEqualTo(Duration.ofSeconds(2));
    }

    @Test
    void reconoceLasUrlsDeCatalogoYLaOfertaVista() {
        assertThat(MercadoLibreScraper.esCatalogo(URL_SONY)).isTrue();
        assertThat(MercadoLibreScraper.esCatalogo("https://articulo.mercadolibre.com.co/MCO-123-x-_JM")).isFalse();
        assertThat(MercadoLibreScraper.esCatalogo(null)).isFalse();
        assertThat(MercadoLibreScraper.ofertaVista(URL_SONY)).isEqualTo("MCO4494987738");
        assertThat(MercadoLibreScraper.ofertaVista("https://www.mercadolibre.com.co/x/p/MCO1?wid=mco55")).isEqualTo("MCO55");
        assertThat(MercadoLibreScraper.ofertaVista("https://www.mercadolibre.com.co/x/p/MCO1")).isNull();
    }

    private String precio(String url) {
        ResultadoScraping resultado = scraper().obtener(porUrl(url));
        assertThat(resultado.esOk()).as(resultado.motivo()).isTrue();
        return resultado.publicaciones().getFirst().precio().toPlainString();
    }

    private MercadoLibreScraper scraper() {
        return scraper(this::responder);
    }

    private MercadoLibreScraper scraper(ApiMercadoLibre api) {
        RateLimiter libre = RateLimiter.of("libre", RateLimiterConfig.custom()
                .limitForPeriod(1_000).limitRefreshPeriod(Duration.ofSeconds(1)).timeoutDuration(Duration.ZERO).build());
        return new MercadoLibreScraper(ruta -> {
            rutas.add(ruta);
            return api.consultar(ruta);
        }, libre);
    }

    /** Responde cada ruta con su respuesta real; los 404 reales se lanzan como lo hace el cliente HTTP. */
    private JsonNode responder(String ruta) throws FalloDeScraping {
        JsonNode respuesta = json(fixturePara(ruta));
        if (respuesta.path("status").asInt(200) == 404) {
            throw new FalloDeScraping(TipoFallo.NO_ENCONTRADO, "La API de MercadoLibre respondió 404");
        }
        return respuesta;
    }

    private static String fixturePara(String ruta) {
        if (ruta.startsWith("/products/search")) {
            return ruta.contains("q=redmi") ? "busqueda-redmi-buds.json" : "busqueda-audifonos-bluetooth.json";
        }
        String[] partes = ruta.split("[/?=]");
        String producto = partes[2];
        if (!ruta.contains("/items")) {
            return "producto-" + producto + ".json";
        }
        if (ruta.contains("item_id=")) {
            return "oferta-" + producto + "-" + partes[partes.length - 1] + ".json";
        }
        try {
            json("ofertas1-" + producto + ".json");
            return "ofertas1-" + producto + ".json";
        } catch (IllegalArgumentException e) {
            return "ofertas-" + producto + ".json";
        }
    }

    private static Monitoreo porUrl(String url) {
        return Monitoreo.porUrl(1L, url, PublicacionUrl.reconocer(url), 6);
    }

    /** SCRUM-37 todavía no tiene fábrica para palabra clave: se arma desde uno por URL. */
    private static Monitoreo porPalabraClave(String palabra, Integer topN) {
        Monitoreo m = porUrl(URL_REDMI);
        ReflectionTestUtils.setField(m, "tipo", TipoMonitoreo.PALABRA_CLAVE);
        ReflectionTestUtils.setField(m, "valor", palabra);
        ReflectionTestUtils.setField(m, "idPublicacion", null);
        ReflectionTestUtils.setField(m, "topN", topN);
        return m;
    }
}
