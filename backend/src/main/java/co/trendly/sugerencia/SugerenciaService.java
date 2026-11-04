package co.trendly.sugerencia;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.historico.HistoricoPrecio;
import co.trendly.historico.HistoricoPrecioRepository;
import co.trendly.monitoreo.EstadoMonitoreo;
import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoNoEncontradoException;
import co.trendly.producto.ProductoRepository;

/**
 * Precio y margen sugeridos de un producto (SCRUM-46). Se recalcula con cada precio nuevo y al consultarlo, así un
 * cambio en el costo o en el margen objetivo del producto se refleja de una vez. Solo se agrega una fila al histórico
 * de sugerencias si el resultado cambió.
 */
@Service
public class SugerenciaService {

    /** Histórico suficiente: al menos {@link #CAPTURAS_MINIMAS} capturas de la competencia en esta ventana. */
    static final Duration VENTANA = Duration.ofDays(7);
    static final int CAPTURAS_MINIMAS = 2;

    private final ProductoRepository productos;
    private final MonitoreoRepository monitoreos;
    private final HistoricoPrecioRepository historico;
    private final ComisionMarketplaceRepository comisiones;
    private final SugerenciaPrecioRepository sugerencias;
    private final Clock reloj;

    @Autowired
    public SugerenciaService(ProductoRepository productos, MonitoreoRepository monitoreos,
            HistoricoPrecioRepository historico, ComisionMarketplaceRepository comisiones,
            SugerenciaPrecioRepository sugerencias) {
        this(productos, monitoreos, historico, comisiones, sugerencias, Clock.systemUTC());
    }

    SugerenciaService(ProductoRepository productos, MonitoreoRepository monitoreos, HistoricoPrecioRepository historico,
            ComisionMarketplaceRepository comisiones, SugerenciaPrecioRepository sugerencias, Clock reloj) {
        this.productos = productos;
        this.monitoreos = monitoreos;
        this.historico = historico;
        this.comisiones = comisiones;
        this.sugerencias = sugerencias;
        this.reloj = reloj;
    }

    /** {@code GET /api/v1/productos/{id}/sugerencia}. Un producto ajeno responde 404. */
    @Transactional
    public SugerenciaResponse consultar(Long usuarioId, Long productoId) {
        Producto producto = productos.findByIdAndUsuarioId(productoId, usuarioId)
                .orElseThrow(ProductoNoEncontradoException::new);
        return SugerenciaResponse.de(calcular(producto));
    }

    /** Precio sugerido de la última sugerencia; vacío si está pendiente o si ningún precio cumple el margen. */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> sugeridoVigente(Long productoId) {
        return sugerencias.findFirstByProductoIdOrderByCalculadoEnDescIdDesc(productoId).map(SugerenciaPrecio::getSugerido);
    }

    /** Lo llama cada captura nueva. El producto pudo borrarse mientras tanto: entonces no hace nada. */
    @Transactional
    public void recalcular(Long productoId) {
        productos.findById(productoId).ifPresent(this::calcular);
    }

    private SugerenciaPrecio calcular(Producto producto) {
        Instant ahora = reloj.instant().truncatedTo(ChronoUnit.MICROS);
        SugerenciaPrecio nueva = analizar(producto, ahora);
        Optional<SugerenciaPrecio> ultima = sugerencias.findFirstByProductoIdOrderByCalculadoEnDescIdDesc(producto.getId());
        if (ultima.isPresent() && ultima.get().mismoResultado(nueva)) {
            ultima.get().confirmar(ahora);
            return ultima.get();
        }
        return sugerencias.save(nueva);
    }

    private SugerenciaPrecio analizar(Producto producto, Instant ahora) {
        Map<Long, Marketplace> marketplaces = monitoreos.findByProductoIdInOrderByIdAsc(List.of(producto.getId())).stream()
                .filter(m -> m.getEstado() != EstadoMonitoreo.PAUSADO)
                .collect(Collectors.toMap(Monitoreo::getId, Monitoreo::getMarketplace));
        if (marketplaces.isEmpty()) {
            return SugerenciaPrecio.pendiente(producto.getId(), ahora);
        }
        List<HistoricoPrecio> puntos = historico.findByMonitoreoIdInAndCapturadoEnAfterOrderByCapturadoEnAscIdAsc(
                marketplaces.keySet(), ahora.minus(VENTANA));
        List<HistoricoPrecio> vigentes = vigentesDisponibles(puntos);
        long capturas = puntos.stream().map(HistoricoPrecio::getCapturadoEn).distinct().count();
        if (capturas < CAPTURAS_MINIMAS || vigentes.isEmpty()) {
            return SugerenciaPrecio.pendiente(producto.getId(), ahora);
        }
        HistoricoPrecio masBarata = vigentes.stream().min(Comparator.comparing(HistoricoPrecio::getPrecioCop)).orElseThrow();
        BigDecimal comision = comisionDe(marketplaces.get(masBarata.getMonitoreoId()));
        return SugerenciaPrecio.calculada(producto.getId(), CalculadoraPrecio.calcular(producto.getCosto(),
                producto.getPrecioVenta(), producto.getMargenObjetivo(), comision,
                vigentes.stream().map(HistoricoPrecio::getPrecioCop).toList()), ahora);
    }

    /** Lo que salió en la última captura de cada monitoreo, si sigue disponible. Los puntos vienen en orden de fecha. */
    private static List<HistoricoPrecio> vigentesDisponibles(List<HistoricoPrecio> puntos) {
        Map<Long, Instant> ultimaCaptura = puntos.stream().collect(Collectors.toMap(HistoricoPrecio::getMonitoreoId,
                HistoricoPrecio::getCapturadoEn, (anterior, siguiente) -> siguiente));
        return puntos.stream()
                .filter(p -> p.getCapturadoEn().equals(ultimaCaptura.get(p.getMonitoreoId())))
                .filter(HistoricoPrecio::isDisponible)
                .toList();
    }

    /** Se compite donde está la publicación más barata, así que se usa la comisión de ese marketplace. */
    private BigDecimal comisionDe(Marketplace marketplace) {
        return comisiones.findById(marketplace).map(ComisionMarketplace::getComisionPct)
                .orElseThrow(() -> new IllegalStateException("No hay comisión configurada para " + marketplace));
    }
}
