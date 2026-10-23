package co.trendly.historico;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * TRM del conjunto de datos abierto de la Superintendencia Financiera en datos.gov.co (recurso {@code 32sa-8pi3}).
 * La TRM de mañana se publica hoy, así que la del día es la última cuya vigencia empieza hoy o antes.
 */
@Component
public class DatosGovTrmCliente implements ClienteTrm {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final String url;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    public DatosGovTrmCliente(@Value("${trm.url}") String url) {
        this.url = url;
    }

    @Override
    public Trm consultar(LocalDate dia) {
        String consulta = "?$where=" + codificar("vigenciadesde <= '" + dia + "T00:00:00'")
                + "&$order=" + codificar("vigenciadesde DESC") + "&$limit=1";
        try {
            HttpResponse<String> respuesta = http.send(
                    HttpRequest.newBuilder(URI.create(url + consulta)).timeout(TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            if (respuesta.statusCode() != 200) {
                throw new IllegalStateException("datos.gov.co respondió " + respuesta.statusCode());
            }
            return leer(respuesta.body());
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo consultar la TRM: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Se interrumpió la consulta de la TRM", e);
        }
    }

    /**
     * Respuesta de ejemplo:
     * {@code [{"valor":"3174.67","unidad":"COP","vigenciadesde":"2026-10-17T00:00:00.000","vigenciahasta":"2026-10-19T00:00:00.000"}]}
     */
    static Trm leer(String json) {
        try {
            JsonNode fila = JSON.readTree(json).path(0);
            BigDecimal valor = new BigDecimal(fila.path("valor").asString());
            LocalDate desde = LocalDate.parse(fila.path("vigenciadesde").asString().substring(0, 10));
            LocalDate hasta = LocalDate.parse(fila.path("vigenciahasta").asString().substring(0, 10));
            if (valor.signum() <= 0 || hasta.isBefore(desde)) {
                throw new IllegalStateException("La TRM recibida no es válida: " + json);
            }
            return new Trm(desde, hasta, valor);
        } catch (IllegalStateException e) {
            throw e;
        } catch (RuntimeException e) {
            // JSON roto, campos que faltan, número o fecha mal escritos (JacksonException también es RuntimeException)
            throw new IllegalStateException("La respuesta de la TRM no se pudo leer: " + json, e);
        }
    }

    /** Los espacios como %20 (URLEncoder los deja como "+", que es para formularios, no para la URL). */
    private static String codificar(String texto) {
        return URLEncoder.encode(texto, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
