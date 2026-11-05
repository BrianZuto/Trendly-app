package co.trendly.reporte;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.alerta.AccionDecision;
import co.trendly.alerta.Alerta;
import co.trendly.alerta.AlertaRepository;
import co.trendly.alerta.DecisionPrecio;
import co.trendly.alerta.DecisionPrecioRepository;
import co.trendly.comun.ErrorDeNegocio;
import co.trendly.historico.HistoricoPrecio;
import co.trendly.historico.HistoricoPrecioRepository;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.NombreVendedor;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoNoEncontradoException;
import co.trendly.producto.ProductoRepository;

/** Reporte descargable de un producto propio (SCRUM-50). Sin fechas, cubre los últimos 30 días, como el tablero. */
@Service
public class ReporteService {

    static final Duration PERIODO_POR_DEFECTO = Duration.ofDays(30);
    static final String MENSAJE_RANGO = "El rango de fechas no es válido";

    /** Un archivo listo para descargar. */
    public record ArchivoReporte(byte[] contenido, String nombre, String tipoContenido) {
    }

    private final ProductoRepository productos;
    private final MonitoreoRepository monitoreos;
    private final HistoricoPrecioRepository historico;
    private final AlertaRepository alertas;
    private final DecisionPrecioRepository decisiones;
    private final Clock reloj;

    @Autowired
    public ReporteService(ProductoRepository productos, MonitoreoRepository monitoreos,
            HistoricoPrecioRepository historico, AlertaRepository alertas, DecisionPrecioRepository decisiones) {
        this(productos, monitoreos, historico, alertas, decisiones, Clock.systemUTC());
    }

    ReporteService(ProductoRepository productos, MonitoreoRepository monitoreos, HistoricoPrecioRepository historico,
            AlertaRepository alertas, DecisionPrecioRepository decisiones, Clock reloj) {
        this.productos = productos;
        this.monitoreos = monitoreos;
        this.historico = historico;
        this.alertas = alertas;
        this.decisiones = decisiones;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public ArchivoReporte generar(Long usuarioId, Long productoId, FormatoReporte formato, Instant desde, Instant hasta) {
        Producto producto = productos.findByIdAndUsuarioId(productoId, usuarioId)
                .orElseThrow(ProductoNoEncontradoException::new);
        Instant ahora = reloj.instant().truncatedTo(ChronoUnit.MICROS);
        Instant fin = hasta == null ? ahora : hasta;
        Instant inicio = desde == null ? fin.minus(PERIODO_POR_DEFECTO) : desde;
        if (inicio.isAfter(fin)) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_RANGO);
        }

        Reporte reporte = armar(producto, inicio, fin, ahora);
        byte[] contenido = formato == FormatoReporte.XLSX ? ExcelReporte.generar(reporte) : PdfReporte.generar(reporte);
        String dia = DateTimeFormatter.BASIC_ISO_DATE.format(LocalDate.ofInstant(ahora, Reporte.COLOMBIA));
        return new ArchivoReporte(contenido, "reporte-trendly-" + productoId + "-" + dia + "." + formato.extension(),
                formato.tipoContenido());
    }

    private Reporte armar(Producto producto, Instant inicio, Instant fin, Instant ahora) {
        List<Long> ids = monitoreos.findByProductoIdOrderByIdAsc(producto.getId()).stream().map(Monitoreo::getId).toList();
        // El mínimo y el promedio del tablero miran 90 días atrás, aunque se pida un periodo más corto
        Instant inicioVentana = inicio.isBefore(fin.minus(CalculoCompetencia.VENTANA)) ? inicio : fin.minus(CalculoCompetencia.VENTANA);
        List<HistoricoPrecio> ventana = ids.isEmpty() ? List.of()
                : historico.findByMonitoreoIdInAndCapturadoEnAfterOrderByCapturadoEnAscIdAsc(ids, inicioVentana.minusNanos(1000))
                        .stream().filter(p -> !p.getCapturadoEn().isAfter(fin)).toList();
        List<CalculoCompetencia.Punto> puntos = ventana.stream().map(ReporteService::punto).toList();
        Instant inicioVigencia = fin.minus(CalculoCompetencia.VENTANA);

        List<HistoricoPrecio> delPeriodo = ventana.stream().filter(p -> !p.getCapturadoEn().isBefore(inicio)).toList();
        List<Reporte.FilaAlerta> filasAlertas = alertasDelPeriodo(ids, inicio, fin);

        Reporte.Metricas metricas = new Reporte.Metricas(producto.getPrecioVenta(),
                CalculoCompetencia.competencia(puntos.stream().filter(p -> !p.capturadoEn().isBefore(inicioVigencia)).toList(),
                        producto.getPrecioVenta()),
                producto.getMargenActual(), producto.getMargenObjetivo(), filasAlertas.size(),
                contar(filasAlertas, AccionDecision.ACEPTAR), contar(filasAlertas, AccionDecision.AJUSTAR),
                contar(filasAlertas, AccionDecision.DESCARTAR), CalculoCompetencia.variacion(puntos, inicio, fin));
        return new Reporte(producto.getNombre(), producto.getSku(), inicio, fin, ahora, metricas, delPeriodo,
                CalculoCompetencia.porDia(delPeriodo.stream().map(ReporteService::punto).toList(), Reporte.COLOMBIA), filasAlertas);
    }

    private List<Reporte.FilaAlerta> alertasDelPeriodo(List<Long> monitoreoIds, Instant inicio, Instant fin) {
        if (monitoreoIds.isEmpty()) {
            return List.of();
        }
        List<Alerta> lista = alertas.findByMonitoreoIdInAndCreadoEnBetweenOrderByCreadoEnAscIdAsc(monitoreoIds, inicio, fin);
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Long, DecisionPrecio> porAlerta = decisiones.findByAlertaIdIn(lista.stream().map(Alerta::getId).toList()).stream()
                .collect(Collectors.toMap(DecisionPrecio::getAlertaId, Function.identity()));
        return lista.stream().map(a -> new Reporte.FilaAlerta(a, porAlerta.get(a.getId()))).toList();
    }

    private static long contar(List<Reporte.FilaAlerta> filas, AccionDecision accion) {
        return filas.stream().filter(f -> f.decision() != null && f.decision().getAccion() == accion).count();
    }

    private static CalculoCompetencia.Punto punto(HistoricoPrecio p) {
        return new CalculoCompetencia.Punto(p.getFuente(), p.getPublicacionId(), NombreVendedor.de(p.getVendedor()),
                p.getCapturadoEn(), p.getPrecioCop(), p.isDisponible());
    }
}
