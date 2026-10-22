package co.trendly.recoleccion;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import co.trendly.historico.HistoricoService;
import co.trendly.monitoreo.EstadoMonitoreo;
import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.scraping.MarketplaceScraper;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;

/**
 * Ciclo de recolección (SCRUM-39). Toma los monitoreos ACTIVOS cuya próxima captura ya venció, por lotes, los
 * captura con el scraper de su marketplace, guarda el resultado en el histórico (SCRUM-42) y los reprograma para
 * ahora + frecuencia.
 *
 * <p>Solo corre un ciclo a la vez: si llega otro disparo mientras uno está en curso, se ignora. Como cada monitoreo
 * queda reprogramado al procesarlo, un segundo disparo seguido no lo vuelve a capturar. Un error en un monitoreo no
 * detiene el ciclo.
 */
@Service
public class RecoleccionService {

    private static final Logger log = LoggerFactory.getLogger(RecoleccionService.class);

    /** Tope de lotes por ciclo, por si algo impidiera reprogramar los monitoreos y el ciclo no terminara. */
    static final int MAXIMO_LOTES = 500;

    private final MonitoreoRepository monitoreos;
    private final HistoricoService historico;
    private final List<MarketplaceScraper> scrapers;
    private final int tamanoLote;
    private final Clock reloj;
    private final Executor ejecutor;
    private final AtomicBoolean enEjecucion = new AtomicBoolean(false);

    @Autowired
    public RecoleccionService(MonitoreoRepository monitoreos, HistoricoService historico,
            List<MarketplaceScraper> scrapers, RecoleccionProperties propiedades) {
        this(monitoreos, historico, scrapers, propiedades.tamanoLote(), Clock.systemUTC(),
                Executors.newSingleThreadExecutor(Thread.ofPlatform().name("recoleccion").daemon().factory()));
    }

    RecoleccionService(MonitoreoRepository monitoreos, HistoricoService historico, List<MarketplaceScraper> scrapers,
            int tamanoLote, Clock reloj, Executor ejecutor) {
        this.monitoreos = monitoreos;
        this.historico = historico;
        this.scrapers = List.copyOf(scrapers);
        this.tamanoLote = tamanoLote;
        this.reloj = reloj;
        this.ejecutor = ejecutor;
    }

    /**
     * Arranca un ciclo en segundo plano y responde de inmediato (la Azure Function no espera a que termine).
     *
     * @return el ciclo en curso, o vacío si ya había uno corriendo y este disparo se ignora
     */
    public Optional<CompletableFuture<ResumenCiclo>> iniciar() {
        if (!enEjecucion.compareAndSet(false, true)) {
            log.info("Recolección: ya hay un ciclo en curso, se ignora este disparo");
            return Optional.empty();
        }
        try {
            return Optional.of(CompletableFuture.supplyAsync(this::cicloYLiberar, ejecutor));
        } catch (RuntimeException e) {
            enEjecucion.set(false);
            throw e;
        }
    }

    /** Corre un ciclo completo en este hilo; vacío si ya había uno en curso. Lo usa el disparador local. */
    public Optional<ResumenCiclo> ejecutarAhora() {
        if (!enEjecucion.compareAndSet(false, true)) {
            log.info("Recolección: ya hay un ciclo en curso, se ignora este disparo");
            return Optional.empty();
        }
        return Optional.of(cicloYLiberar());
    }

    public boolean estaEnEjecucion() {
        return enEjecucion.get();
    }

    private ResumenCiclo cicloYLiberar() {
        try {
            return ciclo();
        } finally {
            enEjecucion.set(false);
        }
    }

    private ResumenCiclo ciclo() {
        Instant inicio = reloj.instant();
        // Solo entra lo que ya estaba vencido al empezar: lo que se reprograma durante el ciclo queda para el próximo
        Instant corte = inicio.truncatedTo(ChronoUnit.MICROS);
        log.info("Recolección: inicio del ciclo");
        int procesados = 0;
        int exitosos = 0;
        int fallidos = 0;
        int puntos = 0;
        for (int lote = 0; lote < MAXIMO_LOTES; lote++) {
            List<Monitoreo> vencidos = monitoreos.findByEstadoAndProximaEjecucionLessThanEqualOrderByProximaEjecucionAscIdAsc(
                    EstadoMonitoreo.ACTIVO, corte, PageRequest.of(0, tamanoLote));
            if (vencidos.isEmpty()) {
                break;
            }
            for (Monitoreo monitoreo : vencidos) {
                procesados++;
                ResultadoScraping resultado = capturar(monitoreo);
                if (resultado.esOk()) {
                    exitosos++;
                    puntos += guardar(monitoreo, resultado);
                } else {
                    fallidos++;
                    log.info("Recolección: monitoreo {} ({}) falló: {} - {}", monitoreo.getId(), monitoreo.getMarketplace(),
                            resultado.tipoFallo(), resultado.motivo());
                }
                reprogramar(monitoreo, resultado.esOk());
            }
        }
        ResumenCiclo resumen = new ResumenCiclo(inicio, reloj.instant(), procesados, exitosos, fallidos, puntos);
        log.info("Recolección: fin del ciclo. Procesados {}, exitosos {}, fallidos {}, puntos nuevos {}",
                procesados, exitosos, fallidos, puntos);
        return resumen;
    }

    /**
     * Se relee el monitoreo porque el histórico pudo actualizar su última captura en otra transacción: guardar la
     * copia del lote la borraría. Si lo eliminaron mientras tanto, no hay nada que reprogramar.
     */
    private void reprogramar(Monitoreo monitoreo, boolean exito) {
        monitoreos.findById(monitoreo.getId()).ifPresent(actual -> {
            actual.registrarCiclo(reloj.instant().truncatedTo(ChronoUnit.MICROS), exito);
            monitoreos.saveAndFlush(actual);
        });
    }

    private ResultadoScraping capturar(Monitoreo monitoreo) {
        MarketplaceScraper scraper = scraperDe(monitoreo.getMarketplace());
        if (scraper == null) {
            return ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "No hay scraper para " + monitoreo.getMarketplace());
        }
        try {
            return scraper.obtener(monitoreo);
        } catch (RuntimeException e) {
            // El contrato dice que los scrapers no lanzan excepciones; si alguno lo hace, el ciclo sigue igual
            log.warn("Recolección: el scraper de {} lanzó una excepción", monitoreo.getMarketplace(), e);
            return ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "Error inesperado: " + e.getMessage());
        }
    }

    /** El scraper que atiende el marketplace (patrón Strategy: uno por marketplace). */
    private MarketplaceScraper scraperDe(Marketplace marketplace) {
        return scrapers.stream().filter(s -> s.marketplace() == marketplace).findFirst().orElse(null);
    }

    private int guardar(Monitoreo monitoreo, ResultadoScraping resultado) {
        try {
            return historico.guardar(monitoreo, resultado);
        } catch (RuntimeException e) {
            log.warn("Recolección: no se pudo guardar el histórico del monitoreo {}", monitoreo.getId(), e);
            return 0;
        }
    }
}
