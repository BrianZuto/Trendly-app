package co.trendly.scraping.mercadolibre;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import co.trendly.scraping.FalloDeScraping;
import co.trendly.scraping.ScrapingProperties;
import co.trendly.scraping.TipoFallo;

/**
 * Cliente de la API de MercadoLibre (SCRUM-40) contra un servidor HTTP local que imita a la API:
 * token de aplicación, reintento con 401 y traducción de los errores HTTP a fallos de scraping.
 */
class ClienteApiMercadoLibreTest {

    private HttpServer servidor;
    private final List<String> peticiones = new CopyOnWriteArrayList<>();
    private final AtomicInteger tokensEmitidos = new AtomicInteger();

    /** Respuesta de /items según la prueba. */
    private volatile int estadoItems = 200;
    private volatile String cuerpoItems = "{\"id\": \"MCO1\", \"price\": 1000}";
    private volatile int estadoToken = 200;
    private volatile int rechazarPrimerasConTokenViejo = 0;
    private volatile long demoraMs = 0;

    @BeforeEach
    void iniciar() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/oauth/token", intercambio -> {
            String cuerpo = new String(intercambio.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            peticiones.add("TOKEN " + cuerpo);
            int n = tokensEmitidos.incrementAndGet();
            responder(intercambio, estadoToken, estadoToken == 200
                    ? "{\"access_token\": \"token-" + n + "\", \"token_type\": \"Bearer\", \"expires_in\": 21600}"
                    : "{\"error\": \"invalid_client\"}");
        });
        servidor.createContext("/items", intercambio -> {
            String autorizacion = intercambio.getRequestHeaders().getFirst("Authorization");
            peticiones.add("GET " + intercambio.getRequestURI() + " | " + autorizacion);
            esperar();
            if (rechazarPrimerasConTokenViejo > 0 && "Bearer token-1".equals(autorizacion)) {
                rechazarPrimerasConTokenViejo--;
                responder(intercambio, 401, "{\"message\": \"invalid access token\"}");
                return;
            }
            responder(intercambio, estadoItems, cuerpoItems);
        });
        servidor.start();
    }

    @AfterEach
    void detener() {
        servidor.stop(0);
    }

    @Test
    void pideElTokenDeLaAplicacionUnaSolaVezYLoEnviaComoBearer() throws Exception {
        ClienteApiMercadoLibre cliente = cliente("app-123", "secreto+raro");

        assertThat(cliente.consultar("/items/MCO1").path("price").asInt()).isEqualTo(1000);
        cliente.consultar("/items/MCO2");

        assertThat(peticiones).containsExactly(
                "TOKEN grant_type=client_credentials&client_id=app-123&client_secret=secreto%2Braro",
                "GET /items/MCO1 | Bearer token-1",
                "GET /items/MCO2 | Bearer token-1");
    }

    @Test
    void siLaApiRespondeUn401PideOtroTokenYReintentaUnaVez() throws Exception {
        rechazarPrimerasConTokenViejo = 1;

        cliente("app", "secreto").consultar("/items/MCO1");

        assertThat(tokensEmitidos.get()).isEqualTo(2);
        assertThat(peticiones).containsSubsequence("GET /items/MCO1 | Bearer token-1", "GET /items/MCO1 | Bearer token-2");
    }

    @Test
    void sinCredencialesNoLlamaLaApi() {
        assertFallo(() -> cliente("", "").consultar("/items/MCO1"), TipoFallo.BLOQUEO, "ML_CLIENT_ID");
        assertFallo(() -> cliente(null, null).consultar("/items/MCO1"), TipoFallo.BLOQUEO, "ML_CLIENT_ID");
        assertThat(peticiones).isEmpty();
    }

    @Test
    void credencialesRechazadasSonBloqueo() {
        estadoToken = 401;

        assertFallo(() -> cliente("app", "malo").consultar("/items/MCO1"), TipoFallo.BLOQUEO, "credenciales");
    }

    @Test
    void traduceLosErroresHttpDeLaApi() {
        estadoItems = 404;
        assertFallo(() -> cliente("app", "s").consultar("/items/MCO1"), TipoFallo.NO_ENCONTRADO, "404");
        estadoItems = 429;
        assertFallo(() -> cliente("app", "s").consultar("/items/MCO1"), TipoFallo.BLOQUEO, "429");
        estadoItems = 403;
        assertFallo(() -> cliente("app", "s").consultar("/items/MCO1"), TipoFallo.BLOQUEO, "403");
        estadoItems = 500;
        assertFallo(() -> cliente("app", "s").consultar("/items/MCO1"), TipoFallo.TIMEOUT, "500");
    }

    @Test
    void unJsonRotoEsCambioDeEstructura() {
        cuerpoItems = "<html>no es json</html>";

        assertFallo(() -> cliente("app", "s").consultar("/items/MCO1"), TipoFallo.ESTRUCTURA, "JSON");
    }

    @Test
    void unaRespuestaLentaEsTimeout() {
        demoraMs = 1_500;

        assertFallo(() -> cliente("app", "s", 300).consultar("/items/MCO1"), TipoFallo.TIMEOUT, "300 ms");
    }

    @Test
    void sinServidorEsErrorDeRed() {
        int puerto = servidor.getAddress().getPort();
        servidor.stop(0);
        ClienteApiMercadoLibre cliente = new ClienteApiMercadoLibre(
                new MercadoLibreProperties("http://127.0.0.1:" + puerto, "app", "s"),
                new ScrapingProperties("TrendlyBot", 2_000, 2, false));

        assertFallo(() -> cliente.consultar("/items/MCO1"), TipoFallo.TIMEOUT, "");
    }

    private ClienteApiMercadoLibre cliente(String id, String secreto) {
        return cliente(id, secreto, 5_000);
    }

    private ClienteApiMercadoLibre cliente(String id, String secreto, int timeoutMs) {
        String url = "http://127.0.0.1:" + servidor.getAddress().getPort();
        return new ClienteApiMercadoLibre(new MercadoLibreProperties(url, id, secreto),
                new ScrapingProperties("TrendlyBot", timeoutMs, 2, false));
    }

    private void esperar() {
        if (demoraMs > 0) {
            try {
                Thread.sleep(demoraMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static void responder(HttpExchange intercambio, int estado, String cuerpo) throws IOException {
        byte[] bytes = cuerpo.getBytes(StandardCharsets.UTF_8);
        intercambio.getResponseHeaders().add("Content-Type", "application/json");
        intercambio.sendResponseHeaders(estado, bytes.length);
        try (OutputStream salida = intercambio.getResponseBody()) {
            salida.write(bytes);
        }
    }

    @FunctionalInterface
    private interface Llamada {
        void ejecutar() throws FalloDeScraping;
    }

    private static void assertFallo(Llamada llamada, TipoFallo tipo, String enElMotivo) {
        assertThatThrownBy(llamada::ejecutar)
                .isInstanceOf(FalloDeScraping.class)
                .hasMessageContaining(enElMotivo)
                .satisfies(e -> assertThat(((FalloDeScraping) e).getTipo()).isEqualTo(tipo));
    }
}
