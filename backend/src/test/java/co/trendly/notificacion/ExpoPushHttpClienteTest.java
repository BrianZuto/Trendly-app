package co.trendly.notificacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** El cliente contra un servidor HTTP local que hace de Expo: nunca sale a internet. */
class ExpoPushHttpClienteTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private HttpServer servidor;
    private final List<String> cuerpos = new ArrayList<>();
    private final List<String> autorizaciones = new ArrayList<>();
    private int estado = 200;
    private String errorDelSegundo;

    @BeforeEach
    void arrancar() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/push", intercambio -> {
            String cuerpo = new String(intercambio.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            cuerpos.add(cuerpo);
            autorizaciones.add(intercambio.getRequestHeaders().getFirst("Authorization"));
            int mensajes = JSON.readTree(cuerpo).size();
            String tickets = String.join(",", IntStream.range(0, mensajes).mapToObj(i -> i == 1 && errorDelSegundo != null
                    ? "{\"status\":\"error\",\"message\":\"x\",\"details\":{\"error\":\"" + errorDelSegundo + "\"}}"
                    : "{\"status\":\"ok\",\"id\":\"t" + i + "\"}").toList());
            byte[] respuesta = ("{\"data\":[" + tickets + "]}").getBytes(StandardCharsets.UTF_8);
            intercambio.sendResponseHeaders(estado, respuesta.length);
            intercambio.getResponseBody().write(respuesta);
            intercambio.close();
        });
        servidor.start();
    }

    @AfterEach
    void detener() {
        servidor.stop(0);
    }

    private ExpoPushHttpCliente cliente(String accessToken) {
        return new ExpoPushHttpCliente(new PushProperties(true,
                "http://127.0.0.1:" + servidor.getAddress().getPort() + "/push", accessToken));
    }

    private static MensajePush mensaje(int i) {
        return new MensajePush("ExponentPushToken[t" + i + "]", "Audífonos: bajó de precio", "Tienda Uno",
                Map.of("alertaId", i, "url", "/alerta/" + i));
    }

    @Test
    void enviaLosMensajesConElFormatoDeExpoYDevuelveUnResultadoPorMensaje() {
        errorDelSegundo = "DeviceNotRegistered";

        List<ResultadoPush> resultados = cliente("").enviar(List.of(mensaje(0), mensaje(1)));

        assertThat(resultados).extracting(ResultadoPush::ok).containsExactly(true, false);
        assertThat(resultados.get(1).dispositivoNoRegistrado()).isTrue();
        assertThat(resultados.get(1).token()).isEqualTo("ExponentPushToken[t1]");
        JsonNode primero = JSON.readTree(cuerpos.getFirst()).get(0);
        assertThat(primero.path("to").asString()).isEqualTo("ExponentPushToken[t0]");
        assertThat(primero.path("title").asString()).isEqualTo("Audífonos: bajó de precio");
        assertThat(primero.path("body").asString()).isEqualTo("Tienda Uno");
        assertThat(primero.path("data").path("url").asString()).isEqualTo("/alerta/0");
        assertThat(primero.path("sound").asString()).isEqualTo("default");
        assertThat(primero.path("channelId").asString()).isEqualTo("alertas");
        assertThat(autorizaciones.getFirst()).isNull();
    }

    @Test
    void envia100MensajesPorSolicitudYElAccessTokenSiEstaConfigurado() {
        List<MensajePush> mensajes = IntStream.range(0, 150).mapToObj(ExpoPushHttpClienteTest::mensaje).toList();

        List<ResultadoPush> resultados = cliente("secreto").enviar(mensajes);

        assertThat(resultados).hasSize(150).allMatch(ResultadoPush::ok);
        assertThat(cuerpos).hasSize(2);
        assertThat(JSON.readTree(cuerpos.get(0)).size()).isEqualTo(100);
        assertThat(JSON.readTree(cuerpos.get(1)).size()).isEqualTo(50);
        assertThat(autorizaciones).containsOnly("Bearer secreto");
    }

    @Test
    void siExpoRespondeConErrorOElServidorNoExisteLanzaIllegalState() {
        estado = 500;
        assertThatThrownBy(() -> cliente("").enviar(List.of(mensaje(0))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("500");

        ExpoPushHttpCliente sinServidor = new ExpoPushHttpCliente(new PushProperties(true, "http://127.0.0.1:1/push", null));
        assertThatThrownBy(() -> sinServidor.enviar(List.of(mensaje(0))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("No se pudo contactar");
    }

    @Test
    void unaRespuestaQueNoSePuedeLeerEsUnError() {
        List<MensajePush> uno = List.of(mensaje(0));
        assertThatThrownBy(() -> ExpoPushHttpCliente.leer(uno, "{\"data\":[]}"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("un ticket por mensaje");
        assertThatThrownBy(() -> ExpoPushHttpCliente.leer(uno, "no es json"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("no se pudo leer");
    }
}
