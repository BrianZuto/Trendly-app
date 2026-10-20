package co.trendly.historico;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.comun.ErrorDeNegocio;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.MonitoreoService;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;

/**
 * Histórico de precios (SCRUM-42): guarda cada captura en pesos, sin duplicados, y avisa que hay un precio nuevo.
 * El job (SCRUM-39) llama a {@link #guardar} con el resultado de cada scraper.
 */
@Service
public class HistoricoService {

    private static final Logger log = LoggerFactory.getLogger(HistoricoService.class);

    /** Una sola captura por publicación y monitoreo en esta ventana: si el ciclo corre dos veces seguidas, no duplica. */
    static final Duration VENTANA_SIN_DUPLICADOS = Duration.ofHours(1);
    static final String MENSAJE_RANGO = "El rango de fechas no es válido";

    // Límites de DATETIME(6) en MySQL para cuando no se pide desde o hasta
    private static final Instant SIN_DESDE = Instant.parse("1970-01-01T00:00:00Z");
    private static final Instant SIN_HASTA = Instant.parse("9999-12-31T23:59:59Z");

    private final HistoricoPrecioRepository historico;
    private final MonitoreoRepository monitoreos;
    private final MonitoreoService monitoreoService;
    private final TrmService trmService;
    private final ApplicationEventPublisher eventos;
    private final Clock reloj;

    @Autowired
    public HistoricoService(HistoricoPrecioRepository historico, MonitoreoRepository monitoreos,
            MonitoreoService monitoreoService, TrmService trmService, ApplicationEventPublisher eventos) {
        this(historico, monitoreos, monitoreoService, trmService, eventos, Clock.systemUTC());
    }

    HistoricoService(HistoricoPrecioRepository historico, MonitoreoRepository monitoreos,
            MonitoreoService monitoreoService, TrmService trmService, ApplicationEventPublisher eventos, Clock reloj) {
        this.historico = historico;
        this.monitoreos = monitoreos;
        this.monitoreoService = monitoreoService;
        this.trmService = trmService;
        this.eventos = eventos;
        this.reloj = reloj;
    }

    /**
     * Guarda las publicaciones de un resultado OK (un FALLO no deja punto en el histórico; las incidencias son
     * de SCRUM-45). Actualiza la última captura del monitoreo y publica {@link PrecioActualizado} por cada punto.
     *
     * @return cuántos puntos se guardaron (0 si falló, si todo era duplicado o si no hay TRM para convertir)
     */
    @Transactional
    public int guardar(Monitoreo monitoreo, ResultadoScraping resultado) {
        if (!resultado.esOk()) {
            return 0;
        }
        Instant ahora = reloj.instant().truncatedTo(ChronoUnit.MICROS);
        int guardados = 0;
        for (PublicacionCapturada publicacion : resultado.publicaciones()) {
            String idPublicacion = publicacion.idPublicacion() != null ? publicacion.idPublicacion()
                    : monitoreo.getIdPublicacion();
            if (historico.existsByMonitoreoIdAndPublicacionIdAndCapturadoEnAfter(monitoreo.getId(), idPublicacion,
                    ahora.minus(VENTANA_SIN_DUPLICADOS))) {
                continue;
            }
            Optional<BigDecimal> precioCop = enPesos(publicacion.precio(), publicacion.moneda());
            if (precioCop.isEmpty()) {
                log.warn("No se guardó {} del monitoreo {}: no hay TRM para convertir {}", idPublicacion,
                        monitoreo.getId(), publicacion.moneda());
                continue;
            }
            Optional<HistoricoPrecio> anterior = historico
                    .findFirstByMonitoreoIdAndPublicacionIdOrderByCapturadoEnDescIdDesc(monitoreo.getId(), idPublicacion);
            HistoricoPrecio punto = historico.save(new HistoricoPrecio(monitoreo.getId(), idPublicacion,
                    publicacion.titulo(), publicacion.vendedor(), publicacion.posicion(), publicacion.precio(),
                    publicacion.moneda(), precioCop.get(), publicacion.disponible(), monitoreo.getMarketplace().name(),
                    ahora));
            eventos.publishEvent(new PrecioActualizado(punto.getId(), monitoreo.getId(), monitoreo.getProductoId(),
                    idPublicacion, anterior.map(HistoricoPrecio::getPrecioCop).orElse(null), punto.getPrecioCop(),
                    anterior.map(HistoricoPrecio::isDisponible).orElse(null), punto.isDisponible(), ahora));
            guardados++;
        }
        if (guardados > 0) {
            monitoreos.findById(monitoreo.getId()).ifPresent(m -> m.registrarCaptura(ahora));
        }
        return guardados;
    }

    /** {@code GET /api/v1/monitoreos/{id}/historico}: los puntos del monitoreo, ordenados por fecha. */
    @Transactional(readOnly = true)
    public List<HistoricoResponse> consultar(Long usuarioId, Long monitoreoId, Instant desde, Instant hasta) {
        Monitoreo monitoreo = monitoreoService.buscarPropio(usuarioId, monitoreoId);
        Instant inicio = desde == null ? SIN_DESDE : desde;
        Instant fin = hasta == null ? SIN_HASTA : hasta;
        if (inicio.isAfter(fin)) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_RANGO);
        }
        return historico.findByMonitoreoIdAndCapturadoEnBetweenOrderByCapturadoEnAscIdAsc(monitoreo.getId(), inicio, fin)
                .stream().map(HistoricoResponse::de).toList();
    }

    /** COP queda igual; USD se multiplica por la TRM del día. Otra moneda no se puede convertir. */
    private Optional<BigDecimal> enPesos(BigDecimal precio, String moneda) {
        return switch (moneda) {
            case "COP" -> Optional.of(precio.setScale(2, RoundingMode.HALF_UP));
            case "USD" -> trmService.trmDelDia().map(trm -> precio.multiply(trm).setScale(2, RoundingMode.HALF_UP));
            default -> Optional.empty();
        };
    }
}
