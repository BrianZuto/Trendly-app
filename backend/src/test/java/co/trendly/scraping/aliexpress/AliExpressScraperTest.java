package co.trendly.scraping.aliexpress;

import static co.trendly.scraping.aliexpress.AliExpressParserTest.fixture;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.PublicacionUrl;
import co.trendly.monitoreo.TipoMonitoreo;
import co.trendly.scraping.FalloDeScraping;
import co.trendly.scraping.FuenteHtml;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.ScrapingProperties;
import co.trendly.scraping.TipoFallo;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;

/** Flujo del scraper de AliExpress (SCRUM-41) con fuentes simuladas: sin internet ni Chrome. */
class AliExpressScraperTest {

    private static final String ID = "1005006150134970";
    private static final String URL_LIMPIA = "https://es.aliexpress.com/item/" + ID + ".html";

    private final List<String> pedidas = new ArrayList<>();

    @Test
    void siLaPaginaLlegaVaciaLaRenderizaConChromeYLeeElPrecio() {
        FuenteHtml http = registrar(fixture("sin-javascript-" + ID + ".html"));
        FuenteHtml chrome = registrar(fixture("producto-" + ID + ".html"));

        ResultadoScraping resultado = scraper(http, chrome).obtener(monitoreo(
                "https://es.aliexpress.com/item/" + ID + ".html?spm=a2g0o.productlist&gatewayAdapt=glo2esp"));

        assertThat(resultado.esOk()).isTrue();
        assertThat(resultado.publicaciones().getFirst().precio()).isEqualByComparingTo("1.38");
        // Las dos fuentes piden la URL limpia (sin parámetros de seguimiento) con la cookie de USD
        assertThat(pedidas).containsExactly(URL_LIMPIA + " | " + AliExpressScraper.COOKIE_MONEDA,
                URL_LIMPIA + " | " + AliExpressScraper.COOKIE_MONEDA);
    }

    @Test
    void siLaPeticionSimpleYaTraeLosDatosNoAbreChrome() {
        FuenteHtml http = registrar(fixture("producto-" + ID + ".html"));
        FuenteHtml chrome = (url, cookies) -> {
            throw new AssertionError("No debía abrir Chrome");
        };

        assertThat(scraper(http, chrome).obtener(monitoreo(URL_LIMPIA)).esOk()).isTrue();
    }

    @Test
    void sinChromeHabilitadoDevuelveFalloDeEstructura() {
        AliExpressScraper scraper = new AliExpressScraper(registrar(fixture("sin-javascript-" + ID + ".html")),
                Optional.empty(), limitadorLibre());

        assertFallo(scraper.obtener(monitoreo(URL_LIMPIA)), TipoFallo.ESTRUCTURA);
    }

    @Test
    void unBloqueoOUnTimeoutSonFallosConSuMotivo() {
        FuenteHtml bloqueada = (url, cookies) -> {
            throw new FalloDeScraping(TipoFallo.BLOQUEO, "El sitio respondió 403");
        };
        FuenteHtml lenta = (url, cookies) -> {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "La página no cargó en 10000 ms");
        };

        ResultadoScraping bloqueo = scraper(bloqueada, lenta).obtener(monitoreo(URL_LIMPIA));
        assertFallo(bloqueo, TipoFallo.BLOQUEO);
        assertThat(bloqueo.motivo()).contains("403");

        ResultadoScraping timeout = scraper(registrar(fixture("sin-javascript-" + ID + ".html")), lenta)
                .obtener(monitoreo(URL_LIMPIA));
        assertFallo(timeout, TipoFallo.TIMEOUT);
    }

    @Test
    void unErrorInesperadoNoRompeElCiclo() {
        FuenteHtml rota = (url, cookies) -> {
            throw new IllegalStateException("algo raro");
        };

        assertFallo(scraper(rota, rota).obtener(monitoreo(URL_LIMPIA)), TipoFallo.ESTRUCTURA);
    }

    @Test
    void soloSeVigilaPorUrl() {
        Monitoreo porPalabra = monitoreo(URL_LIMPIA);
        ReflectionTestUtils.setField(porPalabra, "tipo", TipoMonitoreo.PALABRA_CLAVE);

        assertFallo(scraper(registrar(""), registrar("")).obtener(porPalabra), TipoFallo.DATO_INVALIDO);
        assertThat(pedidas).isEmpty();
    }

    @Test
    void respetaElLimiteDePeticiones() {
        // Una petición por minuto y sin espera: la segunda no puede salir
        RateLimiter estricto = RateLimiter.of("prueba", RateLimiterConfig.custom()
                .limitForPeriod(1).limitRefreshPeriod(Duration.ofMinutes(1)).timeoutDuration(Duration.ZERO).build());
        AliExpressScraper scraper = new AliExpressScraper(registrar(fixture("producto-" + ID + ".html")),
                Optional.empty(), estricto);

        assertThat(scraper.obtener(monitoreo(URL_LIMPIA)).esOk()).isTrue();
        assertFallo(scraper.obtener(monitoreo(URL_LIMPIA)), TipoFallo.TIMEOUT);
    }

    @Test
    void elLimitadorRealEsDeUnaPeticionCadaDosSegundos() {
        RateLimiter limitador = AliExpressScraper.limitador(new ScrapingProperties("Trendly", 10000, 2, false));

        assertThat(limitador.getRateLimiterConfig().getLimitForPeriod()).isEqualTo(1);
        assertThat(limitador.getRateLimiterConfig().getLimitRefreshPeriod()).isEqualTo(Duration.ofSeconds(2));
        assertThat(scraper(registrar(""), registrar("")).marketplace()).isEqualTo(Marketplace.ALIEXPRESS);
    }

    private AliExpressScraper scraper(FuenteHtml http, FuenteHtml chrome) {
        return new AliExpressScraper(http, Optional.of(chrome), limitadorLibre());
    }

    private FuenteHtml registrar(String html) {
        return (url, cookies) -> {
            pedidas.add(url + " | " + cookies);
            return html;
        };
    }

    private static RateLimiter limitadorLibre() {
        return RateLimiter.of("libre", RateLimiterConfig.custom()
                .limitForPeriod(1000).limitRefreshPeriod(Duration.ofSeconds(1)).timeoutDuration(Duration.ZERO).build());
    }

    private static Monitoreo monitoreo(String url) {
        return Monitoreo.porUrl(1L, url, PublicacionUrl.reconocer(url), 6);
    }

    private static void assertFallo(ResultadoScraping resultado, TipoFallo tipo) {
        assertThat(resultado.esOk()).isFalse();
        assertThat(resultado.tipoFallo()).isEqualTo(tipo);
        assertThat(resultado.motivo()).isNotBlank();
    }
}
