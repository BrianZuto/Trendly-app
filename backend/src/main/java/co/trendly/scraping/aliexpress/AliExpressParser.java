package co.trendly.scraping.aliexpress;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lee una página de producto de AliExpress ya renderizada (SCRUM-41). No hace peticiones: recibe el HTML.
 *
 * <p>La fuente principal es el JSON-LD de schema.org ({@code <script type="application/ld+json">} con
 * {@code @type: Product}): trae nombre, precio, moneda y disponibilidad, y es mucho más estable que las clases CSS,
 * que AliExpress cambia en cada despliegue. La tienda solo aparece en el HTML, así que es opcional.
 */
public final class AliExpressParser {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** AliExpress agrega " - AliExpress 44" (el número es la categoría) al nombre del producto. */
    private static final Pattern SUFIJO_TITULO = Pattern.compile("\\s+-\\s+AliExpress(\\s+\\d+)?\\s*$");

    /** Valores de schema.org/ItemAvailability que significan que no se puede comprar. */
    private static final List<String> NO_DISPONIBLE = List.of("OutOfStock", "SoldOut", "Discontinued");

    private AliExpressParser() {
    }

    public static ResultadoScraping leer(String html, String idPublicacion) {
        Document pagina = Jsoup.parse(html);
        JsonNode producto = productoJsonLd(pagina);
        if (producto == null) {
            return sinProducto(pagina);
        }

        JsonNode oferta = producto.path("offers");
        if (oferta.isArray()) {
            oferta = oferta.path(0);
        }
        BigDecimal precio = decimal(texto(oferta, "price"));
        if (precio == null) {
            // AggregateOffer: varias variantes con precios distintos; se toma el menor
            precio = decimal(texto(oferta, "lowPrice"));
        }
        if (precio == null || precio.signum() <= 0) {
            return ResultadoScraping.fallo(TipoFallo.DATO_INVALIDO, "El precio de la publicación no es válido");
        }
        String moneda = texto(oferta, "priceCurrency");
        if (moneda == null || !moneda.matches("[A-Za-z]{3}")) {
            return ResultadoScraping.fallo(TipoFallo.DATO_INVALIDO, "La publicación no indica la moneda del precio");
        }
        moneda = moneda.toUpperCase(Locale.ROOT);
        // AliExpress a veces marca "USD" en el JSON-LD con el valor en pesos ("$ 6.090"): se confirma con el precio
        // que muestra la página para no guardar un costo miles de veces más alto
        String mostrada = monedaMostrada(pagina);
        if (mostrada != null && !mostrada.equals(moneda)) {
            return ResultadoScraping.fallo(TipoFallo.DATO_INVALIDO,
                    "La moneda del precio no coincide: la página muestra " + mostrada + " y los datos dicen " + moneda);
        }

        String titulo = texto(producto, "name");
        return ResultadoScraping.ok(List.of(new PublicacionCapturada(idPublicacion,
                titulo == null ? null : SUFIJO_TITULO.matcher(titulo).replaceFirst(""),
                tienda(pagina), null, precio, moneda, disponible(oferta))));
    }

    /**
     * Moneda del precio que ve el comprador: "US $1.38" es USD y "$ 6.090" (sin "US") es COP.
     * {@code null} si la página no muestra el bloque del precio o trae otro formato.
     */
    static String monedaMostrada(Document pagina) {
        Element precio = pagina.selectFirst("[class*=price-default--current]");
        if (precio == null) {
            return null;
        }
        String texto = precio.text().trim();
        if (texto.startsWith("US $") || texto.startsWith("US$")) {
            return "USD";
        }
        if (texto.startsWith("COP") || texto.matches("^\\$\\s?\\d.*")) {
            return "COP";
        }
        return null;
    }

    /** Primer objeto {@code @type: Product} de los bloques JSON-LD (cada bloque puede ser un objeto o un arreglo). */
    private static JsonNode productoJsonLd(Document pagina) {
        for (Element script : pagina.select("script[type=application/ld+json]")) {
            JsonNode raiz;
            try {
                raiz = JSON.readTree(script.data());
            } catch (JacksonException e) {
                continue;
            }
            for (JsonNode nodo : raiz.isArray() ? raiz : List.of(raiz)) {
                if ("Product".equals(texto(nodo, "@type"))) {
                    return nodo;
                }
            }
        }
        return null;
    }

    /** Sin JSON-LD: la publicación no existe, AliExpress pidió verificación o la página cambió. */
    private static ResultadoScraping sinProducto(Document pagina) {
        if (!pagina.select("[class*=not-found--]").isEmpty()) {
            return ResultadoScraping.fallo(TipoFallo.NO_ENCONTRADO, "La publicación no existe o ya no está disponible");
        }
        // El aviso de verificación (slider "baxia") solo cuenta si no hay producto: la página normal también
        // trae un iframe de verificación para el bloque de recomendados
        if (!pagina.select("#nc_1_n1z, .baxia-punish, iframe[src*=punish]").isEmpty()
                || pagina.title().toLowerCase(Locale.ROOT).contains("captcha")) {
            return ResultadoScraping.fallo(TipoFallo.BLOQUEO, "AliExpress pidió una verificación (captcha)");
        }
        return ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "La página no trae el JSON-LD del producto");
    }

    private static boolean disponible(JsonNode oferta) {
        String disponibilidad = texto(oferta, "availability");
        return disponibilidad == null || NO_DISPONIBLE.stream().noneMatch(disponibilidad::endsWith);
    }

    /**
     * Nombre de la tienda en el bloque del vendedor, sin la etiqueta "(Vendedor)". Algunas publicaciones (las de
     * AliExpress Choice) no muestran ese bloque: entonces es {@code null}.
     */
    private static String tienda(Document pagina) {
        Element nombre = pagina.selectFirst("[class*=store-detail--storeNameWrap], [class*=store-info--name]");
        if (nombre == null) {
            return null;
        }
        String texto = nombre.text().replaceAll("\\s*\\((Vendedor|Seller)\\)\\s*$", "").trim();
        return texto.isEmpty() ? null : texto;
    }

    private static String texto(JsonNode nodo, String campo) {
        JsonNode valor = nodo.path(campo);
        if (valor.isMissingNode() || valor.isNull()) {
            return null;
        }
        String texto = valor.asString().trim();
        return texto.isEmpty() ? null : texto;
    }

    /** "3754." y "12.5" son válidos; también "1,234.50" por si viene formateado. */
    private static BigDecimal decimal(String texto) {
        if (texto == null) {
            return null;
        }
        try {
            return new BigDecimal(texto.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
