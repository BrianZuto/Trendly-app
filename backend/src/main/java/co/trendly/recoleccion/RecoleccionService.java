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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import co.trendly.historico.HistoricoService;
import co.trendly.historico.ValidadorCaptura;
import co.trendly.historico.ValidadorCaptura.ValidacionCaptura;
import co.trendly.incidencia.IncidenciaService;
import co.trendly.monitoreo.EstadoMonitoreo;
import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.recoleccion.CapturaConReintentos.Captura;
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
 *
 * <p>SCRUM-45: lo pasajero se reintenta, cada dato se valida antes de guardarlo, lo que falla o se descarta queda como
 * incidencia y, si falla más del 10 % de los monitoreos del ciclo, se avisa al administrador.
 */
@Service
public class RecoleccionService {

    private static final Logger log = LoggerFactory.getLogger(RecoleccionService.class);

    /** Tope de lotes por ciclo, por si algo impidiera reprogramar los monitoreos y el ciclo no terminara. */
    static final int MAXIMO_LOTES = 500;
    /** Si falla más que esto en un ciclo, probablemente un sitio cambió o bloqueó: se avisa al administrador. */
    static final int PORCENTAJE_FALLOS_PARA_AVISAR = 10;

    private final MonitoreoRepository monitoreos;
    private final HistoricoService historico;
    private final ApplicationEventPublisher eventos;
    private final List<MarketplaceScraper> scrapers;
    private final CapturaConReintentos capturador;
    private final ValidadorCaptura validador;
    private final IncidenciaService incidencias;
    private final int tamanoLote;
    private final Clock reloj;
    private final Executor ejecutor;
    private final AtomicBoolean enEjecucion = new AtomicBoolean(false);

    /** Cómo le fue a un monitoreo en el ciclo. */
    private record Procesado(boolean exito, int puntos) {
    }

    @Autowired
    public RecoleccionService(MonitoreoRepository monitoreos, HistoricoService historico, ApplicationEventPublisher eventos,
            List<MarketplaceScraper> scrapers, CapturaConReintentos capturador, ValidadorCaptura validador,
            IncidenciaService incidencias, RecoleccionProperties propiedades) {
        this(monitoreos, historico, eventos, scrapers, capturador, validador, incidencias, propiedades.tamanoLote(),
                Clock.systemUTC(),
                Executors.newSingleThreadExecutor(Thread.ofPlatform().name("recoleccion").daemon().factory()));
    }

    RecoleccionService(MonitoreoRepository monitoreos, HistoricoService historico, ApplicationEventPublisher eventos,
            List<MarketplaceScraper> scrapers, CapturaConReintentos capturador, ValidadorCaptura validador,
            IncidenciaService incidencias, int tamanoLote, Clock reloj, Executor ejecutor) {
        this.monitoreos = monitoreos;
        this.historico = historico;
        this.eventos = eventos;
        this.scrapers = List.copyOf(scrapers);
        this.capturador = capturador;
        this.validador = validador;
        this.incidencias = incidencias;
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
                Procesado procesado = procesar(monitoreo);
                if (procesado.exito()) {
                    exitosos++;
                } else {
                    fallidos++;
                }
                puntos += procesado.puntos();
                reprogramar(monitoreo, procesado.exito());
            }
        }
        ResumenCiclo resumen = new ResumenCiclo(inicio, reloj.instant(), procesados, exitosos, fallidos, puntos);
        log.info("Recolección: fin del ciclo. Procesados {}, exitosos {}, fallidos {}, puntos nuevos {}",
                procesados, exitosos, fallidos, puntos);
        if (puntos > 0) {
            eventos.publishEvent(new CicloTerminado(resumen));
        }
        if (fallidos * 100 > procesados * PORCENTAJE_FALLOS_PARA_AVISAR) {
            log.warn("Recolección: fallaron {} de {} monitoreos, más del {} %", fallidos, procesados,
                    PORCENTAJE_FALLOS_PARA_AVISAR);
            eventos.publishEvent(new CicloConMuchosFallos(resumen));
        }
        return resumen;
    }

    /**
     * Captura, valida y guarda. Falla si la captura falló o si se descartó todo lo capturado: un precio sospechoso que
     * se repite ciclo tras ciclo también debe llegar a ERROR para que alguien lo revise.
     */
    private Procesado procesar(Monitoreo monitoreo) {
        Captura captura = capturar(monitoreo);
        ResultadoScraping resultado = captura.resultado();
        if (!resultado.esOk()) {
            log.info("Recolección: monitoreo {} ({}) falló tras {} intento(s): {} - {}", monitoreo.getId(),
                    monitoreo.getMarketplace(), captura.intentos(), resultado.tipoFallo(), resultado.motivo());
            registrarIncidencia(monitoreo, resultado.tipoFallo(), resultado.motivo(), captura.intentos());
            return new Procesado(false, 0);
        }
        ValidacionCaptura validacion;
        try {
            validacion = validador.validar(monitoreo, resultado);
        } catch (RuntimeException e) {
            log.warn("Recolección: no se pudo validar la captura del monitoreo {}", monitoreo.getId(), e);
            return new Procesado(false, 0);
        }
        validacion.descartes().forEach(motivo ->
                registrarIncidencia(monitoreo, TipoFallo.DATO_INVALIDO, motivo, captura.intentos()));
        if (validacion.validas().isEmpty()) {
            return new Procesado(validacion.descartes().isEmpty(), 0);
        }
        return new Procesado(true, guardar(monitoreo, ResultadoScraping.ok(validacion.validas())));
    }

    /** Si no se puede registrar (por ejemplo, borraron el monitoreo durante el ciclo), el ciclo sigue igual. */
    private void registrarIncidencia(Monitoreo monitoreo, TipoFallo tipo, String detalle, int intentos) {
        try {
            incidencias.registrar(monitoreo.getId(), tipo, detalle, intentos);
        } catch (RuntimeException e) {
            log.warn("Recolección: no se pudo registrar la incidencia del monitoreo {}", monitoreo.getId(), e);
        }
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

    private Captura capturar(Monitoreo monitoreo) {
        MarketplaceScraper scraper = scraperDe(monitoreo.getMarketplace());
        if (scraper == null) {
            return new Captura(ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "No hay scraper para " + monitoreo.getMarketplace()), 1);
        }
        try {
            return capturador.capturar(scraper, monitoreo);
        } catch (RuntimeException e) {
            // El contrato dice que los scrapers no lanzan excepciones; si alguno lo hace, el ciclo sigue igual
            log.warn("Recolección: el scraper de {} lanzó una excepción", monitoreo.getMarketplace(), e);
            return new Captura(ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "Error inesperado: " + e.getMessage()), 1);
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
