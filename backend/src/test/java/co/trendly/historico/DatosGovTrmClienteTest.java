package co.trendly.historico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;

/** Cliente de la TRM de datos.gov.co contra un servidor local (las pruebas no salen a internet). */
class DatosGovTrmClienteTest {

    /** Respuesta real del 20/10/2026 para la TRM del fin de semana. */
    private static final String FIN_DE_SEMANA = """
            [{"valor":"3174.67","unidad":"COP","vigenciadesde":"2026-10-17T00:00:00.000","vigenciahasta":"2026-10-19T00:00:00.000"}]""";

    private HttpServer servidor;

    @AfterEach
    void apagar() {
        if (servidor != null) {
            servidor.stop(0);
        }
    }

    @Test
    void leeLaRespuestaDeDatosGov() {
        Trm trm = DatosGovTrmCliente.leer(FIN_DE_SEMANA);

        assertThat(trm.getValor()).isEqualByComparingTo("3174.67");
        assertThat(trm.getVigenciaDesde()).isEqualTo(LocalDate.of(2026, 10, 17));
        assertThat(trm.getVigenciaHasta()).isEqualTo(LocalDate.of(2026, 10, 19));
    }

    @Test
    void unaRespuestaVaciaORotaEsUnError() {
        assertThatThrownBy(() -> DatosGovTrmCliente.leer("[]")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> DatosGovTrmCliente.leer("no es json")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> DatosGovTrmCliente.leer(FIN_DE_SEMANA.replace("3174.67", "0")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void pideLaUltimaTrmQueEmpiezaElDiaOAntes() throws IOException {
        AtomicReference<String> consulta = new AtomicReference<>();
        String url = levantar(200, FIN_DE_SEMANA, consulta);

        Trm trm = new DatosGovTrmCliente(url).consultar(LocalDate.of(2026, 10, 18));

        assertThat(trm.getValor()).isEqualByComparingTo("3174.67");
        assertThat(consulta.get()).contains("$where=vigenciadesde <= '2026-10-18T00:00:00'")
                .contains("$order=vigenciadesde DESC").contains("$limit=1");
    }

    @Test
    void unErrorDelServidorEsUnError() throws IOException {
        String url = levantar(503, "caído", new AtomicReference<>());

        assertThatThrownBy(() -> new DatosGovTrmCliente(url).consultar(LocalDate.of(2026, 10, 20)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("503");
    }

    private String levantar(int estado, String cuerpo, AtomicReference<String> consulta) throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        servidor.createContext("/resource/32sa-8pi3.json", intercambio -> {
            consulta.set(intercambio.getRequestURI().getQuery());
            byte[] bytes = cuerpo.getBytes(StandardCharsets.UTF_8);
            intercambio.sendResponseHeaders(estado, bytes.length);
            intercambio.getResponseBody().write(bytes);
            intercambio.close();
        });
        servidor.start();
        return "http://localhost:" + servidor.getAddress().getPort() + "/resource/32sa-8pi3.json";
    }
}
