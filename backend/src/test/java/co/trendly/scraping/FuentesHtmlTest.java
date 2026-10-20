package co.trendly.scraping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.ServerSocket;

import org.junit.jupiter.api.Test;

/** Reglas de las fuentes de HTML que no necesitan internet ni Chrome (SCRUM-40/41). */
class FuentesHtmlTest {

    @Test
    void cadaCodigoHttpTieneSuTipoDeFallo() {
        assertThat(FuenteHttp.tipoPorEstado(404)).isEqualTo(TipoFallo.NO_ENCONTRADO);
        assertThat(FuenteHttp.tipoPorEstado(410)).isEqualTo(TipoFallo.NO_ENCONTRADO);
        assertThat(FuenteHttp.tipoPorEstado(403)).isEqualTo(TipoFallo.BLOQUEO);
        assertThat(FuenteHttp.tipoPorEstado(429)).isEqualTo(TipoFallo.BLOQUEO);
        assertThat(FuenteHttp.tipoPorEstado(503)).isEqualTo(TipoFallo.TIMEOUT);
    }

    @Test
    void sinConexionEsUnFalloDeRed() throws IOException {
        int puertoCerrado;
        try (ServerSocket socket = new ServerSocket(0)) {
            puertoCerrado = socket.getLocalPort();
        }
        FuenteHttp http = new FuenteHttp(new ScrapingProperties("TrendlyBot/0.1", 2000, 2, false));

        assertThatThrownBy(() -> http.obtener("http://localhost:" + puertoCerrado + "/item/1.html", "a=b"))
                .isInstanceOf(FalloDeScraping.class)
                .extracting("tipo").isEqualTo(TipoFallo.TIMEOUT);
    }

    @Test
    void lasCookiesVanAlDominioPadre() {
        assertThat(NavegadorHeadless.dominioPadre("es.aliexpress.com")).isEqualTo(".aliexpress.com");
        assertThat(NavegadorHeadless.dominioPadre("aliexpress.com")).isEqualTo(".aliexpress.com");
    }
}
