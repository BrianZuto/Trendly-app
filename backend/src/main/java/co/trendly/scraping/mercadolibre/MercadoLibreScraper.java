package co.trendly.scraping.mercadolibre;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.TipoMonitoreo;
import co.trendly.scraping.FalloDeScraping;
import co.trendly.scraping.MarketplaceScraper;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.ScrapingProperties;
import co.trendly.scraping.TipoFallo;
import co.trendly.scraping.mercadolibre.MercadoLibreParser.ProductoCatalogo;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import tools.jackson.databind.JsonNode;

/**
 * Scraper de MercadoLibre Colombia (SCRUM-40) con la <b>API oficial de catálogo</b>.
 *
 * <p>Por qué la API y por qué el catálogo: el HTML de MercadoLibre tiene verificación anti-bots y su robots.txt no
 * permite rastreadores; y con el token de una aplicación la API solo deja leer publicaciones ajenas a través del
 * catálogo ({@code /items/{id}} y {@code /sites/MCO/search} responden 403).
 * <ul>
 * <li><b>Modo URL</b> (producto de catálogo, {@code mercadolibre.com.co/…/p/MCO…}): la oferta del vendedor que se
 * estaba viendo ({@code wid} en la URL) o, si no viene, la mejor oferta del producto.</li>
 * <li><b>Modo palabra clave (SCRUM-37):</b> los productos de catálogo de la búsqueda que tienen ofertas activas,
 * con la mejor oferta de cada uno, hasta N.</li>
 * </ul>
 * Máximo 1 petición cada 2 s (Resilience4j). Nunca lanza excepciones: todo error es un FALLO con su motivo.
 */
@Component
public class MercadoLibreScraper implements MarketplaceScraper {

    private static final Logger log = LoggerFactory.getLogger(MercadoLibreScraper.class);

    static final String SOLO_CATALOGO = "MercadoLibre solo permite consultar por API los productos de catálogo: "
            + "usa la URL del producto (mercadolibre.com.co/…/p/MCO…)";
    static final String SIN_OFERTAS = "El producto no tiene ofertas activas";
    static final String BUSQUEDA_SIN_OFERTAS = "Ningún producto de catálogo de la búsqueda tiene ofertas activas; "
            + "prueba con una palabra clave más específica";

    /** Si el monitoreo por palabra clave no dice cuántas, se toman las 5 primeras. */
    static final int TOP_N_POR_DEFECTO = 5;
    static final int TOP_N_MAXIMO = 20;
    /** Muchos productos de catálogo no tienen ofertas: se revisan hasta 4 por cada resultado pedido. */
    static final int PRODUCTOS_POR_RESULTADO = 4;
    /** Máximo de resultados por página de la búsqueda de catálogo. */
    static final int LIMITE_BUSQUEDA = 50;

    private static final Pattern CATALOGO = Pattern.compile("/p/MCO\\d+", Pattern.CASE_INSENSITIVE);
    /** Oferta que se estaba viendo: viene como {@code wid=MCO123} en la consulta o después del {@code #}. */
    private static final Pattern OFERTA_VISTA = Pattern.compile("[?#&]wid=(MCO\\d+)", Pattern.CASE_INSENSITIVE);

    private final ApiMercadoLibre api;
    private final RateLimiter limitador;

    @Autowired
    public MercadoLibreScraper(ClienteApiMercadoLibre api, ScrapingProperties propiedades) {
        this(api, limitador(propiedades));
    }

    MercadoLibreScraper(ApiMercadoLibre api, RateLimiter limitador) {
        this.api = api;
        this.limitador = limitador;
    }

    @Override
    public Marketplace marketplace() {
        return Marketplace.MERCADOLIBRE;
    }

    @Override
    public ResultadoScraping obtener(Monitoreo monitoreo) {
        try {
            return monitoreo.getTipo() == TipoMonitoreo.PALABRA_CLAVE ? buscar(monitoreo) : publicacion(monitoreo);
        } catch (FalloDeScraping e) {
            return ResultadoScraping.fallo(e.getTipo(), e.getMessage());
        } catch (RuntimeException e) {
            log.warn("Error inesperado capturando el monitoreo {} de MercadoLibre", monitoreo.getId(), e);
            return ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "Error inesperado: " + e.getMessage());
        }
    }

    private ResultadoScraping publicacion(Monitoreo monitoreo) throws FalloDeScraping {
        if (!esCatalogo(monitoreo.getValor())) {
            return ResultadoScraping.fallo(TipoFallo.BLOQUEO, SOLO_CATALOGO);
        }
        String producto = MercadoLibreParser.sinGuion(monitoreo.getIdPublicacion());
        String vista = ofertaVista(monitoreo.getValor());
        JsonNode datos = consultar("/products/" + producto);
        String filtro = vista == null ? "?limit=1" : "?item_id=" + vista;
        JsonNode ofertas;
        try {
            ofertas = consultar("/products/" + producto + "/items" + filtro);
        } catch (FalloDeScraping e) {
            if (e.getTipo() == TipoFallo.NO_ENCONTRADO) {
                return ResultadoScraping.fallo(TipoFallo.NO_ENCONTRADO, SIN_OFERTAS);
            }
            throw e;
        }
        return MercadoLibreParser.publicacion(datos, ofertas);
    }

    private ResultadoScraping buscar(Monitoreo monitoreo) throws FalloDeScraping {
        int topN = monitoreo.getTopN() == null ? TOP_N_POR_DEFECTO : Math.clamp(monitoreo.getTopN(), 1, TOP_N_MAXIMO);
        int limite = Math.min(LIMITE_BUSQUEDA, topN * PRODUCTOS_POR_RESULTADO);
        String ruta = "/products/search?status=active&site_id=MCO&q="
                + ClienteApiMercadoLibre.codificar(monitoreo.getValor().trim()) + "&limit=" + limite;
        List<ProductoCatalogo> productos;
        try {
            productos = MercadoLibreParser.productos(consultar(ruta));
        } catch (IllegalArgumentException e) {
            return ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, e.getMessage());
        }
        List<PublicacionCapturada> publicaciones = new ArrayList<>();
        for (ProductoCatalogo producto : productos) {
            if (publicaciones.size() == topN) {
                break;
            }
            JsonNode ofertas;
            try {
                ofertas = consultar("/products/" + producto.id() + "/items?limit=1");
            } catch (FalloDeScraping e) {
                if (e.getTipo() == TipoFallo.NO_ENCONTRADO) {
                    continue; // Producto sin vendedores: no cuenta para el top N
                }
                throw e;
            }
            PublicacionCapturada p = MercadoLibreParser.mejorOferta(ofertas, producto.nombre(), publicaciones.size() + 1);
            if (p != null) {
                publicaciones.add(p);
            }
        }
        return publicaciones.isEmpty()
                ? ResultadoScraping.fallo(TipoFallo.NO_ENCONTRADO, BUSQUEDA_SIN_OFERTAS)
                : ResultadoScraping.ok(publicaciones);
    }

    private JsonNode consultar(String ruta) throws FalloDeScraping {
        if (!limitador.acquirePermission()) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "Se agotó la espera del límite de peticiones a MercadoLibre");
        }
        return api.consultar(ruta);
    }

    /** Las páginas de catálogo son {@code mercadolibre.com.co/<nombre>/p/MCO123}. */
    static boolean esCatalogo(String url) {
        return url != null && CATALOGO.matcher(url).find();
    }

    /** {@code ...#...&wid=MCO123&...} → {@code MCO123}; {@code null} si la URL no lo trae. */
    static String ofertaVista(String url) {
        Matcher m = OFERTA_VISTA.matcher(url);
        return m.find() ? m.group(1).toUpperCase(Locale.ROOT) : null;
    }

    /** 1 petición cada N segundos; quien llega antes espera su turno hasta 1 minuto. */
    static RateLimiter limitador(ScrapingProperties propiedades) {
        return RateLimiter.of("mercadolibre", RateLimiterConfig.custom()
                .limitForPeriod(1)
                .limitRefreshPeriod(Duration.ofSeconds(propiedades.segundosEntrePeticiones()))
                .timeoutDuration(Duration.ofMinutes(1))
                .build());
    }
}
