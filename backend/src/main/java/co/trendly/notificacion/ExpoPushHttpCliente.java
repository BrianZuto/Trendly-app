package co.trendly.notificacion;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cliente de {@code POST https://exp.host/--/api/v2/push/send}. Expo acepta hasta {@link #POR_SOLICITUD} mensajes por
 * solicitud y responde un "ticket" por mensaje, en el mismo orden.
 */
@Component
public class ExpoPushHttpCliente implements ClienteExpoPush {

    static final int POR_SOLICITUD = 100;
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final PushProperties propiedades;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    public ExpoPushHttpCliente(PushProperties propiedades) {
        this.propiedades = propiedades;
    }

    @Override
    public List<ResultadoPush> enviar(List<MensajePush> mensajes) {
        List<ResultadoPush> resultados = new ArrayList<>();
        for (int desde = 0; desde < mensajes.size(); desde += POR_SOLICITUD) {
            List<MensajePush> lote = mensajes.subList(desde, Math.min(desde + POR_SOLICITUD, mensajes.size()));
            resultados.addAll(leer(lote, publicar(cuerpo(lote))));
        }
        return resultados;
    }

    private String publicar(String cuerpo) {
        HttpRequest.Builder solicitud = HttpRequest.newBuilder(URI.create(propiedades.url())).timeout(TIMEOUT)
                .header("Accept", "application/json").header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(cuerpo));
        if (propiedades.conAccessToken()) {
            solicitud.header("Authorization", "Bearer " + propiedades.accessToken());
        }
        try {
            HttpResponse<String> respuesta = http.send(solicitud.build(), HttpResponse.BodyHandlers.ofString());
            if (respuesta.statusCode() != 200) {
                throw new IllegalStateException("Expo Push respondió " + respuesta.statusCode() + ": " + respuesta.body());
            }
            return respuesta.body();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo contactar a Expo Push: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Se interrumpió el envío a Expo Push", e);
        }
    }

    /** {@code channelId} es el canal que crea la app en Android; {@code sound} solo aplica en iOS. */
    static String cuerpo(List<MensajePush> lote) {
        List<Map<String, Object>> mensajes = lote.stream().map(m -> {
            Map<String, Object> mensaje = new LinkedHashMap<>();
            mensaje.put("to", m.token());
            mensaje.put("title", m.titulo());
            mensaje.put("body", m.cuerpo());
            mensaje.put("data", m.datos());
            mensaje.put("sound", "default");
            mensaje.put("priority", "high");
            mensaje.put("channelId", "alertas");
            return mensaje;
        }).toList();
        return JSON.writeValueAsString(mensajes);
    }

    /**
     * Respuesta de ejemplo:
     * {@code {"data":[{"status":"ok","id":"X"},{"status":"error","message":"...","details":{"error":"DeviceNotRegistered"}}]}}
     */
    static List<ResultadoPush> leer(List<MensajePush> lote, String json) {
        try {
            JsonNode tickets = JSON.readTree(json).path("data");
            if (!tickets.isArray() || tickets.size() != lote.size()) {
                throw new IllegalStateException("Expo Push no devolvió un ticket por mensaje: " + json);
            }
            List<ResultadoPush> resultados = new ArrayList<>();
            for (int i = 0; i < lote.size(); i++) {
                JsonNode ticket = tickets.get(i);
                boolean ok = "ok".equals(ticket.path("status").asString());
                String error = ok ? null : ticket.path("details").path("error").asString(null);
                resultados.add(new ResultadoPush(lote.get(i).token(), ok, error));
            }
            return resultados;
        } catch (IllegalStateException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new IllegalStateException("La respuesta de Expo Push no se pudo leer: " + json, e);
        }
    }
}
