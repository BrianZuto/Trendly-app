package co.trendly.scraping;

import java.io.IOException;
import java.net.SocketTimeoutException;

import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

/** Petición HTTP simple con Jsoup: User-Agent identificable y timeout de 10 s (SCRUM-40). */
@Component
public class FuenteHttp implements FuenteHtml {

    private final ScrapingProperties propiedades;

    public FuenteHttp(ScrapingProperties propiedades) {
        this.propiedades = propiedades;
    }

    @Override
    public String obtener(String url, String cookies) throws FalloDeScraping {
        try {
            var conexion = Jsoup.connect(url)
                    .userAgent(propiedades.userAgent())
                    .timeout(propiedades.timeoutMs())
                    .header("Accept-Language", "es-CO,es;q=0.9")
                    .followRedirects(true);
            if (cookies != null && !cookies.isBlank()) {
                conexion.header("Cookie", cookies);
            }
            return conexion.get().outerHtml();
        } catch (HttpStatusException e) {
            throw new FalloDeScraping(tipoPorEstado(e.getStatusCode()), "El sitio respondió " + e.getStatusCode(), e);
        } catch (SocketTimeoutException e) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "El sitio no respondió en " + propiedades.timeoutMs() + " ms", e);
        } catch (IOException e) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "Error de red: " + e.getMessage(), e);
        }
    }

    static TipoFallo tipoPorEstado(int estado) {
        return switch (estado) {
            case 404, 410 -> TipoFallo.NO_ENCONTRADO;
            case 403, 429 -> TipoFallo.BLOQUEO;
            default -> TipoFallo.TIMEOUT;
        };
    }
}
