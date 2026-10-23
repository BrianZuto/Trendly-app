package co.trendly.historico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.MonitoreoService;
import co.trendly.monitoreo.PublicacionUrl;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;

/** Casos del histórico que no necesitan base de datos (SCRUM-42). */
class HistoricoServiceTest {

    private static final String URL_ALI = "https://es.aliexpress.com/item/1005006150134970.html";

    private final HistoricoPrecioRepository historico = mock(HistoricoPrecioRepository.class);
    private final TrmService trmService = mock(TrmService.class);
    private final ApplicationEventPublisher eventos = mock(ApplicationEventPublisher.class);
    private final HistoricoService servicio = new HistoricoService(historico, mock(MonitoreoRepository.class),
            mock(MonitoreoService.class), trmService, eventos);
    private final Monitoreo monitoreo = Monitoreo.porUrl(1L, URL_ALI, PublicacionUrl.reconocer(URL_ALI), 6);

    @Test
    void sinTrmNoSeGuardaUnPrecioEnDolares() {
        when(trmService.trmDelDia()).thenReturn(Optional.empty());

        assertThat(servicio.guardar(monitoreo, captura("1.38", "USD"))).isZero();
        verify(historico, never()).save(any());
        verify(eventos, never()).publishEvent(any(Object.class));
    }

    @Test
    void unaMonedaQueNoEsDolarNiPesoNoSeGuarda() {
        assertThat(servicio.guardar(monitoreo, captura("1.20", "EUR"))).isZero();
        verify(historico, never()).save(any());
    }

    private static ResultadoScraping captura(String precio, String moneda) {
        return ResultadoScraping.ok(List.of(
                new PublicacionCapturada("1005006150134970", "Auriculares", null, null, new BigDecimal(precio), moneda, true)));
    }
}
