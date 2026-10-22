package co.trendly.scraping.mercadolibre;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

import org.springframework.stereotype.Component;

import co.trendly.scraping.FalloDeScraping;
import co.trendly.scraping.ScrapingProperties;
import co.trendly.scraping.TipoFallo;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cliente HTTP de la API de MercadoLibre (SCRUM-40). Pide el access token de la aplicación con
 * {@code client_credentials}, lo guarda hasta un minuto antes de que venza y, si la API responde 401,
 * pide uno nuevo y reintenta una sola vez.
 */
@Component
public class ClienteApiMercadoLibre implements ApiMercadoLibre {

    static final String SIN_CREDENCIALES =
            "Faltan las credenciales de MercadoLibre (variables ML_CLIENT_ID y ML_CLIENT_SECRET)";

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Duration MARGEN_VENCIMIENTO = Duration.ofMinutes(1);

    private final MercadoLibreProperties propiedades;
    private final Duration timeout;
    private final String userAgent;
    private final HttpClient http;

    private String token;
    private Instant venceEn = Instant.MIN;

    public ClienteApiMercadoLibre(MercadoLibreProperties propiedades, ScrapingProperties scraping) {
        this.propiedades = propiedades;
        this.timeout = Duration.ofMillis(scraping.timeoutMs());
        this.userAgent = scraping.userAgent();
        this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
    }

    @Override
    public JsonNode consultar(String ruta) throws FalloDeScraping {
        if (!propiedades.tieneCredenciales()) {
            throw new FalloDeScraping(TipoFallo.BLOQUEO, SIN_CREDENCIALES);
        }
        HttpResponse<String> respuesta = enviar(peticionGet(ruta, tokenVigente()));
        if (respuesta.statusCode() == 401) {
            // El token pudo vencer o ser revocado antes de tiempo: se pide otro una sola vez
            invalidarToken();
            respuesta = enviar(peticionGet(ruta, tokenVigente()));
        }
        return leer(revisar(respuesta));
    }

    private synchronized String tokenVigente() throws FalloDeScraping {
        if (token != null && Instant.now().isBefore(venceEn)) {
            return token;
        }
        String formulario = "grant_type=client_credentials&client_id=" + codificar(propiedades.clientId())
                + "&client_secret=" + codificar(propiedades.clientSecret());
        HttpRequest peticion = HttpRequest.newBuilder(URI.create(propiedades.apiUrl() + "/oauth/token"))
                .timeout(timeout)
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", userAgent)
                .POST(HttpRequest.BodyPublishers.ofString(formulario))
                .build();
        HttpResponse<String> respuesta = enviar(peticion);
        if (respuesta.statusCode() != 200) {
            throw new FalloDeScraping(TipoFallo.BLOQUEO,
                    "MercadoLibre rechazó las credenciales de la aplicación (" + respuesta.statusCode() + ")");
        }
        JsonNode cuerpo = leer(respuesta.body());
        String nuevo = cuerpo.path("access_token").asString("");
        if (nuevo.isBlank()) {
            throw new FalloDeScraping(TipoFallo.BLOQUEO, "MercadoLibre no devolvió el access token");
        }
        token = nuevo;
        venceEn = Instant.now().plusSeconds(cuerpo.path("expires_in").asLong(0)).minus(MARGEN_VENCIMIENTO);
        return token;
    }

    private synchronized void invalidarToken() {
        token = null;
        venceEn = Instant.MIN;
    }

    private HttpRequest peticionGet(String ruta, String tokenActual) {
        return HttpRequest.newBuilder(URI.create(propiedades.apiUrl() + ruta))
                .timeout(timeout)
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + tokenActual)
                .header("User-Agent", userAgent)
                .GET()
                .build();
    }

    private HttpResponse<String> enviar(HttpRequest peticion) throws FalloDeScraping {
        try {
            return http.send(peticion, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (HttpTimeoutException e) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT,
                    "MercadoLibre no respondió en " + timeout.toMillis() + " ms", e);
        } catch (IOException e) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "Error de red con MercadoLibre: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "Se interrumpió la consulta a MercadoLibre", e);
        }
    }

    static String revisar(HttpResponse<String> respuesta) throws FalloDeScraping {
        int estado = respuesta.statusCode();
        if (estado == 200) {
            return respuesta.body();
        }
        TipoFallo tipo = switch (estado) {
            case 404, 410 -> TipoFallo.NO_ENCONTRADO;
            case 401, 403, 429 -> TipoFallo.BLOQUEO;
            default -> TipoFallo.TIMEOUT;
        };
        throw new FalloDeScraping(tipo, "La API de MercadoLibre respondió " + estado);
    }

    private static JsonNode leer(String cuerpo) throws FalloDeScraping {
        try {
            return JSON.readTree(cuerpo);
        } catch (RuntimeException e) {
            throw new FalloDeScraping(TipoFallo.ESTRUCTURA, "La respuesta de MercadoLibre no es un JSON válido", e);
        }
    }

    static String codificar(String texto) {
        return URLEncoder.encode(texto, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
