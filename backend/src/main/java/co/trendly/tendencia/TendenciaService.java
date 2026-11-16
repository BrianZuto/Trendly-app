package co.trendly.tendencia;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.historico.HistoricoPrecio;
import co.trendly.historico.HistoricoPrecioRepository;
import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.TipoMonitoreo;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoRepository;

/**
 * Ranking de productos en tendencia (SCRUM-53). Sale de las búsquedas por palabra clave en MercadoLibre del vendedor
 * (SCRUM-37): cada producto que está hoy entre los primeros resultados recibe un puntaje por demanda, margen y
 * competencia ({@link CalculoTendencia}).
 */
@Service
public class TendenciaService {

    /** Capturas que se miran para la demanda; una búsqueda sin capturas en este tiempo no aporta al ranking. */
    static final Duration VENTANA = Duration.ofDays(30);
    static final int TOP_MAXIMO = 50;

    private final MonitoreoRepository monitoreos;
    private final HistoricoPrecioRepository historico;
    private final ProductoRepository productos;
    private final Clock reloj;

    @Autowired
    public TendenciaService(MonitoreoRepository monitoreos, HistoricoPrecioRepository historico,
            ProductoRepository productos) {
        this(monitoreos, historico, productos, Clock.systemUTC());
    }

    TendenciaService(MonitoreoRepository monitoreos, HistoricoPrecioRepository historico, ProductoRepository productos,
            Clock reloj) {
        this.monitoreos = monitoreos;
        this.historico = historico;
        this.productos = productos;
        this.reloj = reloj;
    }

    /** Los {@code top} mejores, del puntaje más alto al más bajo ({@code top} se ajusta a 1–{@value #TOP_MAXIMO}). */
    @Transactional(readOnly = true)
    public List<TendenciaResponse> ranking(Long usuarioId, int top) {
        List<Monitoreo> busquedas = monitoreos.deUsuario(usuarioId, TipoMonitoreo.PALABRA_CLAVE, Marketplace.MERCADOLIBRE);
        if (busquedas.isEmpty()) {
            return List.of();
        }
        List<Long> productoIds = busquedas.stream().map(Monitoreo::getProductoId).distinct().toList();
        Map<Long, Producto> propios = productos.findAllById(productoIds).stream()
                .collect(Collectors.toMap(Producto::getId, Function.identity()));
        List<Monitoreo> proveedores = monitoreos.findByProductoIdInOrderByIdAsc(productoIds).stream()
                .filter(m -> m.getMarketplace() == Marketplace.ALIEXPRESS).toList();

        List<Long> monitoreoIds = Stream.concat(busquedas.stream(), proveedores.stream()).map(Monitoreo::getId).toList();
        Map<Long, List<HistoricoPrecio>> capturas = historico
                .findByMonitoreoIdInAndCapturadoEnAfterOrderByCapturadoEnAscIdAsc(monitoreoIds, reloj.instant().minus(VENTANA))
                .stream().collect(Collectors.groupingBy(HistoricoPrecio::getMonitoreoId));

        // El mismo producto puede salir en dos búsquedas: se queda con su mejor puntaje
        Map<String, TendenciaResponse> mejores = new LinkedHashMap<>();
        for (Monitoreo busqueda : busquedas) {
            Producto producto = propios.get(busqueda.getProductoId());
            BigDecimal costo = costoEnAliExpress(producto.getId(), proveedores, capturas).orElse(producto.getCosto());
            for (TendenciaResponse candidata : deBusqueda(busqueda, capturas.getOrDefault(busqueda.getId(), List.of()), costo)) {
                mejores.merge(clave(candidata.titulo(), candidata.publicacionId()), candidata,
                        (a, b) -> b.puntaje().compareTo(a.puntaje()) > 0 ? b : a);
            }
        }
        List<TendenciaResponse> ordenadas = mejores.values().stream()
                .sorted(Comparator.comparing(TendenciaResponse::puntaje).reversed().thenComparing(TendenciaResponse::titulo))
                .limit(Math.clamp(top, 1, TOP_MAXIMO)).toList();
        return IntStream.range(0, ordenadas.size()).mapToObj(i -> ordenadas.get(i).enPuesto(i + 1)).toList();
    }

    /** Los productos que salieron en la última captura de la búsqueda, con stock y con el dato de vendedores. */
    private static List<TendenciaResponse> deBusqueda(Monitoreo busqueda, List<HistoricoPrecio> puntos, BigDecimal costo) {
        if (puntos.isEmpty()) {
            return List.of();
        }
        Instant ultima = puntos.getLast().getCapturadoEn();
        long ciclos = puntos.stream().map(HistoricoPrecio::getCapturadoEn).distinct().count();
        // La mejor oferta de un producto cambia de vendedor entre capturas: el producto se reconoce por su título
        Map<String, List<HistoricoPrecio>> porProducto = puntos.stream().collect(Collectors.groupingBy(
                p -> clave(p.getTitulo(), p.getPublicacionId()), LinkedHashMap::new, Collectors.toList()));

        List<TendenciaResponse> candidatas = new ArrayList<>();
        for (List<HistoricoPrecio> historial : porProducto.values()) {
            HistoricoPrecio actual = historial.getLast();
            if (!actual.getCapturadoEn().equals(ultima) || !actual.isDisponible() || actual.getVendedores() == null
                    || actual.getPosicion() == null) {
                continue;
            }
            double posicion = historial.stream().map(HistoricoPrecio::getPosicion).filter(Objects::nonNull)
                    .mapToInt(Integer::intValue).average().orElseThrow();
            long apariciones = historial.stream().map(HistoricoPrecio::getCapturadoEn).distinct().count();
            BigDecimal demanda = CalculoTendencia.demanda(posicion, (double) apariciones / ciclos);
            BigDecimal margen = CalculoTendencia.margen(actual.getPrecioCop(), costo);
            BigDecimal competencia = CalculoTendencia.competencia(actual.getVendedores());
            candidatas.add(new TendenciaResponse(0, actual.getTitulo(), actual.getPublicacionId(), busqueda.getProductoId(),
                    busqueda.getValor(), actual.getPrecioCop(), costo, actual.getVendedores(),
                    CalculoTendencia.redondear(posicion), demanda, margen, competencia,
                    CalculoTendencia.puntaje(demanda, margen, competencia)));
        }
        return candidatas;
    }

    /** El precio más bajo con stock en la última captura de los monitoreos de AliExpress del producto. */
    private static Optional<BigDecimal> costoEnAliExpress(Long productoId, List<Monitoreo> proveedores,
            Map<Long, List<HistoricoPrecio>> capturas) {
        return proveedores.stream().filter(m -> m.getProductoId().equals(productoId))
                .map(m -> capturas.getOrDefault(m.getId(), List.of()))
                .filter(puntos -> !puntos.isEmpty())
                .flatMap(puntos -> puntos.stream().filter(p -> p.getCapturadoEn().equals(puntos.getLast().getCapturadoEn())))
                .filter(HistoricoPrecio::isDisponible)
                .map(HistoricoPrecio::getPrecioCop)
                .min(Comparator.naturalOrder());
    }

    private static String clave(String titulo, String publicacionId) {
        return titulo == null || titulo.isBlank() ? String.valueOf(publicacionId) : titulo.trim().toLowerCase(Locale.ROOT);
    }
}
