package co.trendly.monitoreo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.historico.HistoricoPrecio;
import co.trendly.historico.HistoricoPrecioRepository;

/**
 * Arma, a partir del histórico (SCRUM-42), lo que el frontend muestra de la competencia: las publicaciones vigentes de
 * cada monitoreo con su historial reciente, y el resumen por producto para la lista.
 *
 * <p>Una publicación está vigente si salió en la última captura de su monitoreo: así, en una búsqueda por palabra
 * clave, una publicación que ya no está entre las N primeras deja de mostrarse (su historial sigue en el histórico).
 */
@Service
public class CompetenciaService {

    /** Días de historial que acompañan a cada publicación; el histórico completo se pide aparte. */
    static final Duration HISTORIAL = Duration.ofDays(30);

    private final MonitoreoRepository monitoreos;
    private final HistoricoPrecioRepository historico;
    private final Clock reloj;

    @Autowired
    public CompetenciaService(MonitoreoRepository monitoreos, HistoricoPrecioRepository historico) {
        this(monitoreos, historico, Clock.systemUTC());
    }

    CompetenciaService(MonitoreoRepository monitoreos, HistoricoPrecioRepository historico, Clock reloj) {
        this.monitoreos = monitoreos;
        this.historico = historico;
        this.reloj = reloj;
    }

    /** Publicaciones vigentes de cada monitoreo (lista vacía si todavía no tiene capturas). */
    @Transactional(readOnly = true)
    public Map<Long, List<PublicacionVigente>> publicacionesDe(List<Monitoreo> lista) {
        Map<Long, List<PublicacionVigente>> resultado = new LinkedHashMap<>();
        lista.forEach(m -> resultado.put(m.getId(), List.of()));
        if (lista.isEmpty()) {
            return resultado;
        }
        List<HistoricoPrecio> puntos = historico.findByMonitoreoIdInAndCapturadoEnAfterOrderByCapturadoEnAscIdAsc(
                resultado.keySet(), reloj.instant().minus(HISTORIAL));
        puntos.stream().collect(Collectors.groupingBy(HistoricoPrecio::getMonitoreoId, LinkedHashMap::new,
                Collectors.toList())).forEach((monitoreoId, delMonitoreo) -> resultado.put(monitoreoId, vigentes(delMonitoreo)));
        return resultado;
    }

    /** Resumen de la competencia de cada producto, para la lista de productos. */
    @Transactional(readOnly = true)
    public Map<Long, ResumenCompetencia> resumenes(List<Long> productoIds) {
        if (productoIds.isEmpty()) {
            return Map.of();
        }
        List<Monitoreo> todos = monitoreos.findByProductoIdInOrderByIdAsc(productoIds);
        Map<Long, List<PublicacionVigente>> publicaciones = publicacionesDe(todos);
        Map<Long, List<Monitoreo>> porProducto = todos.stream()
                .collect(Collectors.groupingBy(Monitoreo::getProductoId));
        Map<Long, ResumenCompetencia> resumenes = new LinkedHashMap<>();
        for (Long productoId : productoIds) {
            resumenes.put(productoId, resumen(porProducto.getOrDefault(productoId, List.of()), publicaciones));
        }
        return resumenes;
    }

    private static ResumenCompetencia resumen(List<Monitoreo> delProducto, Map<Long, List<PublicacionVigente>> publicaciones) {
        record Candidata(PublicacionVigente publicacion, Marketplace marketplace) {
        }
        List<Candidata> disponibles = delProducto.stream()
                .filter(m -> m.getEstado() != EstadoMonitoreo.PAUSADO)
                .flatMap(m -> publicaciones.getOrDefault(m.getId(), List.of()).stream()
                        .filter(PublicacionVigente::disponible)
                        .map(p -> new Candidata(p, m.getMarketplace())))
                .toList();
        ResumenCompetencia.Minimo minimo = disponibles.stream()
                .min(Comparator.comparing(c -> c.publicacion().precio()))
                .map(c -> new ResumenCompetencia.Minimo(c.publicacion().precio(), c.publicacion().vendedor(), c.marketplace()))
                .orElse(null);
        List<Marketplace> marketplaces = delProducto.stream().map(Monitoreo::getMarketplace).distinct().toList();
        return new ResumenCompetencia(delProducto.size(), disponibles.size(), marketplaces, minimo);
    }

    /** Las publicaciones que salieron en la última captura del monitoreo, con su historial. */
    private static List<PublicacionVigente> vigentes(List<HistoricoPrecio> puntos) {
        Instant ultima = puntos.getLast().getCapturadoEn();
        Map<String, List<HistoricoPrecio>> porPublicacion = puntos.stream()
                .collect(Collectors.groupingBy(p -> Objects.toString(p.getPublicacionId(), ""), LinkedHashMap::new,
                        Collectors.toList()));
        return porPublicacion.values().stream()
                .filter(historial -> historial.getLast().getCapturadoEn().equals(ultima))
                .map(CompetenciaService::publicacion)
                .sorted(Comparator.comparing((PublicacionVigente p) -> p.posicion() == null ? Integer.MAX_VALUE : p.posicion())
                        .thenComparing(PublicacionVigente::precio))
                .toList();
    }

    private static PublicacionVigente publicacion(List<HistoricoPrecio> historial) {
        HistoricoPrecio ultimo = historial.getLast();
        return new PublicacionVigente(ultimo.getPublicacionId(), ultimo.getTitulo(), NombreVendedor.de(ultimo.getVendedor()),
                ultimo.getPosicion(), ultimo.getPrecioCop(), "USD".equals(ultimo.getMoneda()) ? ultimo.getPrecio() : null,
                ultimo.isDisponible(), null,
                historial.stream().map(p -> new PublicacionVigente.Punto(p.getCapturadoEn(), p.getPrecioCop(), p.isDisponible()))
                        .toList());
    }
}
