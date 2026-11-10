package co.trendly.recoleccion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.recoleccion.CapturaConReintentos.Captura;
import co.trendly.scraping.FalloDeScraping;
import co.trendly.scraping.MarketplaceScraper;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;
import io.github.resilience4j.core.IntervalFunction;

/** Reintentos de una captura (SCRUM-45): solo lo pasajero, con esperas de 2, 4 y 8 s. */
class CapturaConReintentosTest {

    private final CapturaConReintentos capturador = new CapturaConReintentos(IntervalFunction.of(1L));

    @Test
    void lasEsperasSonDe2Y4Y8Segundos() {
        IntervalFunction esperas = CapturaConReintentos.esperas(2000);

        assertThat(esperas.apply(1)).isEqualTo(2000);
        assertThat(esperas.apply(2)).isEqualTo(4000);
        assertThat(esperas.apply(3)).isEqualTo(8000);
    }

    @Test
    void unTimeoutUn5xxYUn429SeReintentanTresVeces() {
        assertThat(capturar(ResultadoScraping.fallo(new FalloDeScraping(TipoFallo.TIMEOUT, "lento"))).intentos()).isEqualTo(4);
        assertThat(capturar(porEstado(TipoFallo.TIMEOUT, 503)).intentos()).isEqualTo(4);
        assertThat(capturar(porEstado(TipoFallo.BLOQUEO, 429)).intentos()).isEqualTo(4);
    }

    @Test
    void loQueNoEsPasajeroNoSeReintenta() {
        assertThat(capturar(porEstado(TipoFallo.BLOQUEO, 403)).intentos()).isEqualTo(1);
        assertThat(capturar(porEstado(TipoFallo.NO_ENCONTRADO, 404)).intentos()).isEqualTo(1);
        // FuenteHttp clasifica como TIMEOUT los demás códigos, pero un 400 no se arregla reintentando
        assertThat(capturar(porEstado(TipoFallo.TIMEOUT, 400)).intentos()).isEqualTo(1);
        assertThat(capturar(ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "cambió la página")).intentos()).isEqualTo(1);
    }

    @Test
    void devuelveElResultadoDelUltimoIntento() {
        ResultadoScraping fallo = ResultadoScraping.fallo(TipoFallo.TIMEOUT, "lento");

        Captura captura = capturar(fallo);

        assertThat(captura.resultado()).isEqualTo(fallo);
    }

    @Test
    void unaExcepcionNoSeReintentaYLaManejaElCiclo() {
        AtomicInteger llamadas = new AtomicInteger();

        assertThatThrownBy(() -> capturador.capturar(scraper(() -> {
            llamadas.incrementAndGet();
            throw new IllegalStateException("no cumplió el contrato");
        }), null)).isInstanceOf(IllegalStateException.class);
        assertThat(llamadas).hasValue(1);
    }

    private Captura capturar(ResultadoScraping resultado) {
        return capturador.capturar(scraper(() -> resultado), null);
    }

    private static ResultadoScraping porEstado(TipoFallo tipo, int estado) {
        return ResultadoScraping.fallo(FalloDeScraping.porEstadoHttp(tipo, estado, "Respondió " + estado, null));
    }

    private static MarketplaceScraper scraper(java.util.function.Supplier<ResultadoScraping> respuesta) {
        return new MarketplaceScraper() {
            @Override
            public Marketplace marketplace() {
                return Marketplace.MERCADOLIBRE;
            }

            @Override
            public ResultadoScraping obtener(Monitoreo monitoreo) {
                return respuesta.get();
            }
        };
    }
}
