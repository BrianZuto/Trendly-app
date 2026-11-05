package co.trendly.recoleccion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import io.github.resilience4j.core.IntervalFunction;

import co.trendly.historico.HistoricoPrecioRepository;
import co.trendly.historico.HistoricoService;
import co.trendly.historico.ValidadorCaptura;
import co.trendly.incidencia.IncidenciaService;
import co.trendly.monitoreo.EstadoMonitoreo;
import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.PublicacionUrl;
import co.trendly.scraping.MarketplaceScraper;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;

/** Ciclo del job de recolección (SCRUM-39) sin Spring ni base de datos. */
class RecoleccionServiceTest {

    private static final Instant AHORA = Instant.parse("2026-10-22T12:00:00Z");
    private static final String URL_ML = "https://www.mercadolibre.com.co/x/p/MCO123";
    private static final String URL_ALI = "https://es.aliexpress.com/item/1005006150134970.html";

    private MonitoreoRepository monitoreos;
    private HistoricoService historico;
    private final ApplicationEventPublisher eventos = mock(ApplicationEventPublisher.class);
    /** Los reintentos de verdad, pero sin esperar los segundos. */
    private final CapturaConReintentos capturador = new CapturaConReintentos(IntervalFunction.of(1L));
    private final ValidadorCaptura validador = new ValidadorCaptura(mock(HistoricoPrecioRepository.class));
    private final IncidenciaService incidencias = mock(IncidenciaService.class);
    /** "Base de datos" de la prueba: el repositorio simulado lee y guarda aquí. */
    private final Map<Long, Monitoreo> tabla = new HashMap<>();
    private final List<Long> capturados = new ArrayList<>();
    private final List<Runnable> pendientes = new ArrayList<>();

    @BeforeEach
    void preparar() {
        monitoreos = mock(MonitoreoRepository.class);
        historico = mock(HistoricoService.class);
        when(historico.guardar(any(), any())).thenAnswer(i -> ((ResultadoScraping) i.getArgument(1)).publicaciones().size());
        when(monitoreos.findByEstadoAndProximaEjecucionLessThanEqualOrderByProximaEjecucionAscIdAsc(eq(EstadoMonitoreo.ACTIVO),
                any(Instant.class), any(Pageable.class))).thenAnswer(i -> {
                    Instant corte = i.getArgument(1);
                    int tamano = ((Pageable) i.getArgument(2)).getPageSize();
                    return tabla.values().stream()
                            .filter(m -> m.getEstado() == EstadoMonitoreo.ACTIVO && !m.getProximaEjecucion().isAfter(corte))
                            .sorted((a, b) -> a.getId().compareTo(b.getId()))
                            .limit(tamano).toList();
                });
        when(monitoreos.findById(any())).thenAnswer(i -> Optional.ofNullable(tabla.get((Long) i.getArgument(0))));
        when(monitoreos.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void procesaPorLotesSoloLosActivosVencidosYLosReprograma() {
        for (long id = 1; id <= 45; id++) {
            agregar(id, URL_ML, AHORA.minusSeconds(id));
        }
        agregar(46L, URL_ML, AHORA.plus(1, ChronoUnit.HOURS)); // todavía no toca
        Monitoreo pausado = agregar(47L, URL_ML, AHORA.minusSeconds(60));
        pausado.pausar();

        ResumenCiclo resumen = servicio(20, ok()).ejecutarAhora().orElseThrow();

        assertThat(resumen.procesados()).isEqualTo(45);
        assertThat(resumen.exitosos()).isEqualTo(45);
        assertThat(resumen.fallidos()).isZero();
        assertThat(resumen.puntos()).isEqualTo(45);
        assertThat(capturados).hasSize(45).doesNotContain(46L, 47L);
        // Cada monitoreo queda para dentro de 6 horas
        assertThat(tabla.get(1L).getProximaEjecucion()).isEqualTo(AHORA.plus(6, ChronoUnit.HOURS));
        assertThat(tabla.get(46L).getProximaEjecucion()).isEqualTo(AHORA.plus(1, ChronoUnit.HOURS));
        verify(monitoreos, org.mockito.Mockito.times(4)).findByEstadoAndProximaEjecucionLessThanEqualOrderByProximaEjecucionAscIdAsc(
                eq(EstadoMonitoreo.ACTIVO), any(Instant.class), eq(org.springframework.data.domain.PageRequest.of(0, 20)));
    }

    @Test
    void alTerminarAvisaSoloSiGuardoPreciosNuevos() {
        agregar(1L, URL_ML, AHORA.minusSeconds(1));

        servicio(20, mon -> ResultadoScraping.fallo(TipoFallo.TIMEOUT, "lento")).ejecutarAhora();
        verify(eventos, never()).publishEvent(any(CicloTerminado.class));

        ReflectionTestUtils.setField(tabla.get(1L), "proximaEjecucion", AHORA.minusSeconds(1));
        ResumenCiclo resumen = servicio(20, ok()).ejecutarAhora().orElseThrow();
        verify(eventos).publishEvent(new CicloTerminado(resumen));
    }

    @Test
    void unFalloSumaFallosYUnExitoLosReinicia() {
        Monitoreo m = agregar(1L, URL_ML, AHORA.minusSeconds(1));
        ReflectionTestUtils.setField(m, "fallosConsecutivos", 1);

        ResumenCiclo conFallo = servicio(20, mon -> ResultadoScraping.fallo(TipoFallo.TIMEOUT, "lento")).ejecutarAhora().orElseThrow();

        assertThat(conFallo.fallidos()).isEqualTo(1);
        assertThat(m.getFallosConsecutivos()).isEqualTo(2);
        assertThat(m.getEstado()).isEqualTo(EstadoMonitoreo.ACTIVO);
        verify(historico, never()).guardar(any(), any());

        ReflectionTestUtils.setField(m, "proximaEjecucion", AHORA.minusSeconds(1));
        servicio(20, ok()).ejecutarAhora();
        assertThat(m.getFallosConsecutivos()).isZero();
    }

    @Test
    void unTimeoutSeReintentaTresVecesYQuedaComoIncidencia() {
        agregar(1L, URL_ML, AHORA.minusSeconds(1));

        servicio(20, mon -> ResultadoScraping.fallo(TipoFallo.TIMEOUT, "lento")).ejecutarAhora();

        assertThat(capturados).hasSize(4); // el intento inicial y 3 reintentos
        verify(incidencias).registrar(1L, TipoFallo.TIMEOUT, "lento", 4);
    }

    @Test
    void siUnReintentoFuncionaNoHayIncidencia() {
        agregar(1L, URL_ML, AHORA.minusSeconds(1));
        ResumenCiclo resumen = servicio(20, mon -> capturados.size() < 3
                ? ResultadoScraping.fallo(TipoFallo.TIMEOUT, "lento")
                : ok().obtener(mon)).ejecutarAhora().orElseThrow();

        assertThat(capturados).hasSize(3);
        assertThat(resumen.exitosos()).isEqualTo(1);
        verify(incidencias, never()).registrar(any(), any(), any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void unBloqueoNoSeReintentaPeroQuedaComoIncidencia() {
        agregar(1L, URL_ML, AHORA.minusSeconds(1));

        servicio(20, mon -> ResultadoScraping.fallo(TipoFallo.BLOQUEO, "403")).ejecutarAhora();

        assertThat(capturados).hasSize(1);
        verify(incidencias).registrar(1L, TipoFallo.BLOQUEO, "403", 1);
    }

    @Test
    void trasTresCiclosSeguidosConFalloPasaAErrorYElJobLoDejaDeCapturar() {
        Monitoreo m = agregar(1L, URL_ML, AHORA.minusSeconds(1));
        RecoleccionService servicio = servicio(20, mon -> ResultadoScraping.fallo(TipoFallo.NO_ENCONTRADO, "no existe"));

        for (int ciclo = 1; ciclo <= 3; ciclo++) {
            assertThat(m.getEstado()).isEqualTo(EstadoMonitoreo.ACTIVO);
            servicio.ejecutarAhora();
            ReflectionTestUtils.setField(m, "proximaEjecucion", AHORA.minusSeconds(1));
        }

        assertThat(m.getEstado()).isEqualTo(EstadoMonitoreo.ERROR);
        assertThat(m.getFallosConsecutivos()).isEqualTo(3);
        assertThat(servicio.ejecutarAhora().orElseThrow().procesados()).isZero();
    }

    @Test
    void unPrecioInvalidoNoEntraAlHistoricoQuedaComoIncidenciaYCuentaComoFallo() {
        Monitoreo m = agregar(1L, URL_ML, AHORA.minusSeconds(1));

        ResumenCiclo resumen = servicio(20, mon -> capturaDe(publicacion("MCO-1", "0"))).ejecutarAhora().orElseThrow();

        assertThat(resumen.fallidos()).isEqualTo(1);
        assertThat(resumen.puntos()).isZero();
        assertThat(m.getFallosConsecutivos()).isEqualTo(1);
        verify(historico, never()).guardar(any(), any());
        verify(incidencias).registrar(eq(1L), eq(TipoFallo.DATO_INVALIDO), org.mockito.ArgumentMatchers.contains("MCO-1"), eq(1));
    }

    @Test
    void siSeDescartaSoloUnaPublicacionLasDemasSeGuardanYNoEsFallo() {
        Monitoreo m = agregar(1L, URL_ML, AHORA.minusSeconds(1));

        ResumenCiclo resumen = servicio(20, mon -> capturaDe(publicacion("MCO-1", "1000"), publicacion("MCO-2", "0")))
                .ejecutarAhora().orElseThrow();

        assertThat(resumen.exitosos()).isEqualTo(1);
        assertThat(resumen.puntos()).isEqualTo(1);
        assertThat(m.getFallosConsecutivos()).isZero();
        verify(historico).guardar(any(), eq(capturaDe(publicacion("MCO-1", "1000"))));
        verify(incidencias).registrar(eq(1L), eq(TipoFallo.DATO_INVALIDO), org.mockito.ArgumentMatchers.contains("MCO-2"), eq(1));
    }

    @Test
    void siNoSePuedeRegistrarLaIncidenciaElCicloSigue() {
        agregar(1L, URL_ML, AHORA.minusSeconds(2));
        agregar(2L, URL_ML, AHORA.minusSeconds(1));
        org.mockito.Mockito.doThrow(new IllegalStateException("borrado")).when(incidencias)
                .registrar(any(), any(), any(), org.mockito.ArgumentMatchers.anyInt());

        ResumenCiclo resumen = servicio(20, mon -> ResultadoScraping.fallo(TipoFallo.BLOQUEO, "403")).ejecutarAhora().orElseThrow();

        assertThat(resumen.procesados()).isEqualTo(2);
    }

    @Test
    void avisaAlAdministradorSoloSiFallaMasDelDiezPorCiento() {
        for (long id = 1; id <= 10; id++) {
            agregar(id, URL_ML, AHORA.minusSeconds(id));
        }
        Captura unaDeDiez = mon -> mon.getId() == 1L ? ResultadoScraping.fallo(TipoFallo.BLOQUEO, "403") : ok().obtener(mon);
        servicio(20, unaDeDiez).ejecutarAhora();
        verify(eventos, never()).publishEvent(any(CicloConMuchosFallos.class));

        tabla.values().forEach(m -> ReflectionTestUtils.setField(m, "proximaEjecucion", AHORA.minusSeconds(1)));
        Captura dosDeDiez = mon -> mon.getId() <= 2L ? ResultadoScraping.fallo(TipoFallo.BLOQUEO, "403") : ok().obtener(mon);
        ResumenCiclo resumen = servicio(20, dosDeDiez).ejecutarAhora().orElseThrow();
        verify(eventos).publishEvent(new CicloConMuchosFallos(resumen));
    }

    @Test
    void sinScraperOConExcepcionEsFalloYElCicloSigue() {
        agregar(1L, URL_ALI, AHORA.minusSeconds(3)); // no hay scraper de AliExpress en esta prueba
        agregar(2L, URL_ML, AHORA.minusSeconds(2));
        agregar(3L, URL_ML, AHORA.minusSeconds(1));
        MarketplaceScraper explota = scraper(Marketplace.MERCADOLIBRE, mon -> {
            if (mon.getId() == 2L) {
                throw new IllegalStateException("no cumplió el contrato");
            }
            return ok().obtener(mon);
        });

        ResumenCiclo resumen = new RecoleccionService(monitoreos, historico, eventos, List.of(explota), capturador, validador, incidencias, 20, reloj(), Runnable::run)
                .ejecutarAhora().orElseThrow();

        assertThat(resumen.procesados()).isEqualTo(3);
        assertThat(resumen.exitosos()).isEqualTo(1);
        assertThat(resumen.fallidos()).isEqualTo(2);
        assertThat(tabla.values()).allMatch(m -> m.getProximaEjecucion().isAfter(AHORA));
    }

    @Test
    void unErrorAlGuardarElHistoricoNoDetieneElCiclo() {
        agregar(1L, URL_ML, AHORA.minusSeconds(2));
        agregar(2L, URL_ML, AHORA.minusSeconds(1));
        org.mockito.Mockito.doThrow(new IllegalStateException("BD caída")).when(historico).guardar(eq(tabla.get(1L)), any());

        ResumenCiclo resumen = servicio(20, ok()).ejecutarAhora().orElseThrow();

        assertThat(resumen.procesados()).isEqualTo(2);
        assertThat(resumen.puntos()).isEqualTo(1);
    }

    @Test
    void siBorraronElMonitoreoDuranteElCicloNoSeReprograma() {
        agregar(1L, URL_ML, AHORA.minusSeconds(1));
        MarketplaceScraper borra = scraper(Marketplace.MERCADOLIBRE, mon -> {
            tabla.remove(mon.getId());
            return ok().obtener(mon);
        });

        ResumenCiclo resumen = new RecoleccionService(monitoreos, historico, eventos, List.of(borra), capturador, validador, incidencias, 20, reloj(), Runnable::run)
                .ejecutarAhora().orElseThrow();

        assertThat(resumen.procesados()).isEqualTo(1);
        verify(monitoreos, never()).saveAndFlush(any());
    }

    @Test
    void mientrasUnCicloEstaEnCursoLosDemasDisparosSeIgnoran() {
        agregar(1L, URL_ML, AHORA.minusSeconds(1));
        RecoleccionService servicio = new RecoleccionService(monitoreos, historico, eventos,
                List.of(scraper(Marketplace.MERCADOLIBRE, ok())), capturador, validador, incidencias, 20, reloj(), pendientes::add);

        Optional<CompletableFuture<ResumenCiclo>> primero = servicio.iniciar();
        assertThat(primero).isPresent();
        assertThat(servicio.estaEnEjecucion()).isTrue();
        assertThat(servicio.iniciar()).isEmpty();
        assertThat(servicio.ejecutarAhora()).isEmpty();

        pendientes.forEach(Runnable::run);

        assertThat(primero.get().join().procesados()).isEqualTo(1);
        assertThat(servicio.estaEnEjecucion()).isFalse();
        // Terminado el ciclo, se puede disparar otro (que ya no encuentra nada vencido)
        assertThat(servicio.ejecutarAhora().orElseThrow().procesados()).isZero();
    }

    @Test
    void siElEjecutorRechazaElCicloSeLiberaElBloqueo() {
        RecoleccionService servicio = new RecoleccionService(monitoreos, historico, eventos, List.of(), capturador, validador, incidencias, 20, reloj(), tarea -> {
            throw new java.util.concurrent.RejectedExecutionException("sin hilos");
        });

        org.assertj.core.api.Assertions.assertThatThrownBy(servicio::iniciar)
                .isInstanceOf(java.util.concurrent.RejectedExecutionException.class);
        assertThat(servicio.estaEnEjecucion()).isFalse();
    }

    @Test
    void sinNadaVencidoTerminaEnSeguida() {
        assertThat(servicio(20, ok()).ejecutarAhora().orElseThrow())
                .extracting(ResumenCiclo::procesados, ResumenCiclo::exitosos, ResumenCiclo::fallidos)
                .containsExactly(0, 0, 0);
    }

    /** Lo que responde el scraper simulado para cada monitoreo. */
    @FunctionalInterface
    private interface Captura {
        ResultadoScraping obtener(Monitoreo monitoreo);
    }

    private RecoleccionService servicio(int lote, Captura comportamiento) {
        return new RecoleccionService(monitoreos, historico, eventos,
                List.of(scraper(Marketplace.MERCADOLIBRE, comportamiento)), capturador, validador, incidencias, lote, reloj(), Runnable::run);
    }

    private Captura ok() {
        return mon -> ResultadoScraping.ok(List.of(new PublicacionCapturada("MCO-" + mon.getId(), "x", null, null,
                java.math.BigDecimal.TEN, "COP", true)));
    }

    private static PublicacionCapturada publicacion(String id, String precio) {
        return new PublicacionCapturada(id, "x", null, null, new java.math.BigDecimal(precio), "COP", true);
    }

    private static ResultadoScraping capturaDe(PublicacionCapturada... publicaciones) {
        return ResultadoScraping.ok(List.of(publicaciones));
    }

    private MarketplaceScraper scraper(Marketplace marketplace, Captura comportamiento) {
        return new MarketplaceScraper() {
            @Override
            public Marketplace marketplace() {
                return marketplace;
            }

            @Override
            public ResultadoScraping obtener(Monitoreo monitoreo) {
                capturados.add(monitoreo.getId());
                return comportamiento.obtener(monitoreo);
            }
        };
    }

    private Monitoreo agregar(Long id, String url, Instant proxima) {
        Monitoreo m = Monitoreo.porUrl(1L, url, PublicacionUrl.reconocer(url), 6);
        ReflectionTestUtils.setField(m, "id", id);
        ReflectionTestUtils.setField(m, "proximaEjecucion", proxima);
        tabla.put(id, m);
        return m;
    }

    private static Clock reloj() {
        return Clock.fixed(AHORA, ZoneOffset.UTC);
    }
}
