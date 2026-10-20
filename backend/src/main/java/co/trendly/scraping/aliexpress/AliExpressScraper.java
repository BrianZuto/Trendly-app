package co.trendly.scraping.aliexpress;

import java.time.Duration;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.TipoMonitoreo;
import co.trendly.scraping.FalloDeScraping;
import co.trendly.scraping.FuenteHtml;
import co.trendly.scraping.FuenteHttp;
import co.trendly.scraping.MarketplaceScraper;
import co.trendly.scraping.NavegadorHeadless;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.ScrapingProperties;
import co.trendly.scraping.TipoFallo;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;

/**
 * Scraper de AliExpress (SCRUM-41): precio en USD, disponibilidad, título y tienda de una publicación.
 *
 * <ol>
 * <li>Primero una petición simple con Jsoup, buscando el JSON-LD del producto.</li>
 * <li>Hoy AliExpress manda la página vacía y arma el precio con JavaScript, así que si no hay datos se renderiza
 * con Chrome headless ({@link NavegadorHeadless}) y se vuelve a leer.</li>
 * </ol>
 * Máximo 1 petición cada 2 s a AliExpress (Resilience4j). Nunca lanza excepciones: todo error es un FALLO.
 */
@Component
public class AliExpressScraper implements MarketplaceScraper {

    private static final Logger log = LoggerFactory.getLogger(AliExpressScraper.class);

    /** Pide los precios en dólares (c_tp=USD), con envío a Colombia (region=CO) y la página en español. */
    static final String COOKIE_MONEDA = "aep_usuc_f=site=glo&c_tp=USD&region=CO&b_locale=es_ES";

    private final FuenteHtml http;
    private final Optional<FuenteHtml> navegador;
    private final RateLimiter limitador;

    @Autowired
    public AliExpressScraper(FuenteHttp http, Optional<NavegadorHeadless> navegador, ScrapingProperties propiedades) {
        this(http, navegador.map(FuenteHtml.class::cast), limitador(propiedades));
    }

    AliExpressScraper(FuenteHtml http, Optional<FuenteHtml> navegador, RateLimiter limitador) {
        this.http = http;
        this.navegador = navegador;
        this.limitador = limitador;
    }

    @Override
    public Marketplace marketplace() {
        return Marketplace.ALIEXPRESS;
    }

    @Override
    public ResultadoScraping obtener(Monitoreo monitoreo) {
        if (monitoreo.getTipo() != TipoMonitoreo.URL) {
            return ResultadoScraping.fallo(TipoFallo.DATO_INVALIDO, "AliExpress solo se vigila por URL");
        }
        // Se arma la URL limpia desde el identificador: sin parámetros de seguimiento ni redirecciones de idioma
        String url = "https://es.aliexpress.com/item/" + monitoreo.getIdPublicacion() + ".html";
        try {
            ResultadoScraping resultado = leer(http, url, monitoreo.getIdPublicacion());
            if (resultado.esOk() || resultado.tipoFallo() != TipoFallo.ESTRUCTURA || navegador.isEmpty()) {
                return resultado;
            }
            return leer(navegador.get(), url, monitoreo.getIdPublicacion());
        } catch (FalloDeScraping e) {
            return ResultadoScraping.fallo(e.getTipo(), e.getMessage());
        } catch (RuntimeException e) {
            log.warn("Error inesperado leyendo {}", url, e);
            return ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "Error inesperado: " + e.getMessage());
        }
    }

    private ResultadoScraping leer(FuenteHtml fuente, String url, String idPublicacion) throws FalloDeScraping {
        if (!limitador.acquirePermission()) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "Se agotó la espera del límite de peticiones a AliExpress");
        }
        return AliExpressParser.leer(fuente.obtener(url, COOKIE_MONEDA), idPublicacion);
    }

    /** 1 petición cada N segundos; quien llega antes espera su turno hasta 1 minuto. */
    static RateLimiter limitador(ScrapingProperties propiedades) {
        return RateLimiter.of("aliexpress", RateLimiterConfig.custom()
                .limitForPeriod(1)
                .limitRefreshPeriod(Duration.ofSeconds(propiedades.segundosEntrePeticiones()))
                .timeoutDuration(Duration.ofMinutes(1))
                .build());
    }
}
