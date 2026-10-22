package co.trendly.monitoreo;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/**
 * Publicación de la competencia reconocida a partir de su URL.
 *
 * @param marketplace   según el dominio: {@code mercadolibre.com.co} o {@code aliexpress.com} (y sus subdominios)
 * @param idPublicacion {@code MCO-123456} en MercadoLibre; el número del ítem en AliExpress
 */
public record PublicacionUrl(Marketplace marketplace, String idPublicacion) {

    public static final String MENSAJE_URL_INVALIDA = "La URL no es válida";
    public static final String MENSAJE_NO_SOPORTADO = "Marketplace no soportado";
    public static final String MENSAJE_SIN_IDENTIFICADOR = "No encontramos el identificador de la publicación en la URL";

    // MercadoLibre: "MCO-123456" en articulo.mercadolibre.com.co, "MCO123456" en las páginas de catálogo (/p/)
    private static final Pattern ID_MERCADOLIBRE = Pattern.compile("MCO-?(\\d+)", Pattern.CASE_INSENSITIVE);
    // AliExpress: /item/1005001234567890.html
    private static final Pattern ID_ALIEXPRESS = Pattern.compile("/item/(\\d+)");

    /**
     * @throws ErrorDeNegocio 400 si la URL no es válida, es de otro sitio o no trae el identificador
     */
    public static PublicacionUrl reconocer(String url) {
        URI uri = analizar(url);
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if (esDominio(host, "mercadolibre.com.co")) {
            Matcher m = ID_MERCADOLIBRE.matcher(uri.getPath() == null ? "" : uri.getPath());
            return new PublicacionUrl(Marketplace.MERCADOLIBRE, m.find() ? "MCO-" + m.group(1) : sinIdentificador());
        }
        if (esDominio(host, "aliexpress.com")) {
            Matcher m = ID_ALIEXPRESS.matcher(uri.getPath() == null ? "" : uri.getPath());
            return new PublicacionUrl(Marketplace.ALIEXPRESS, m.find() ? m.group(1) : sinIdentificador());
        }
        throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_NO_SOPORTADO);
    }

    private static URI analizar(String url) {
        try {
            URI uri = new URI(url.trim());
            String esquema = uri.getScheme();
            if (esquema == null || !(esquema.equalsIgnoreCase("http") || esquema.equalsIgnoreCase("https"))
                    || uri.getHost() == null) {
                throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_URL_INVALIDA);
            }
            return uri;
        } catch (URISyntaxException e) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_URL_INVALIDA);
        }
    }

    /** El dominio exacto o un subdominio suyo; así "mercadolibre.com.co.falso.com" no pasa. */
    private static boolean esDominio(String host, String dominio) {
        return host.equals(dominio) || host.endsWith("." + dominio);
    }

    private static String sinIdentificador() {
        throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_SIN_IDENTIFICADOR);
    }
}
