package co.trendly.alerta;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.historico.HistoricoPrecio;
import co.trendly.historico.HistoricoPrecioRepository;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.NombreVendedor;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoRepository;
import co.trendly.sugerencia.SugerenciaService;

/**
 * Bandeja de alertas del vendedor y registro de su decisión de precio (SCRUM-49). Aceptar o ajustar cambia el precio de
 * venta del producto; descartar lo deja igual. En los tres casos la alerta queda cerrada y la decisión registrada.
 */
@Service
public class BandejaAlertasService {

    static final String MENSAJE_ESTADO = "El estado debe ser NUEVA, LEIDA o CERRADA";
    static final String MENSAJE_RELEVANCIA = "La relevancia debe ser NORMAL o ALTA";
    static final String MENSAJE_SIN_SUGERIDO = "Esta alerta no tiene precio sugerido: ajusta el precio a mano";
    static final String MENSAJE_PRECIO_FINAL = "Escribe el precio final, mayor que cero";
    static final String MENSAJE_MOTIVO = "Escribe el motivo para descartar la alerta";

    private final AlertaRepository alertas;
    private final DecisionPrecioRepository decisiones;
    private final MonitoreoRepository monitoreos;
    private final ProductoRepository productos;
    private final HistoricoPrecioRepository historico;
    private final SugerenciaService sugerencias;

    public BandejaAlertasService(AlertaRepository alertas, DecisionPrecioRepository decisiones,
            MonitoreoRepository monitoreos, ProductoRepository productos, HistoricoPrecioRepository historico,
            SugerenciaService sugerencias) {
        this.alertas = alertas;
        this.decisiones = decisiones;
        this.monitoreos = monitoreos;
        this.productos = productos;
        this.historico = historico;
        this.sugerencias = sugerencias;
    }

    /** {@code GET /api/v1/alertas?estado=&relevancia=}. Los dos filtros son opcionales. */
    @Transactional(readOnly = true)
    public List<AlertaResponse> listar(Long usuarioId, String estado, String relevancia) {
        EstadoAlerta conEstado = enumOpcional(EstadoAlerta.class, estado, MENSAJE_ESTADO);
        RelevanciaAlerta conRelevancia = enumOpcional(RelevanciaAlerta.class, relevancia, MENSAJE_RELEVANCIA);
        List<Alerta> lista = conEstado == null
                ? alertas.findByUsuarioIdOrderByCreadoEnDescIdDesc(usuarioId)
                : alertas.findByUsuarioIdAndEstadoOrderByCreadoEnDescIdDesc(usuarioId, conEstado);
        if (conRelevancia != null) {
            lista = lista.stream().filter(a -> a.getRelevancia() == conRelevancia).toList();
        }
        return respuestas(lista);
    }

    @Transactional(readOnly = true)
    public AlertaResponse obtener(Long usuarioId, Long id) {
        return respuestas(List.of(alertaPropia(usuarioId, id))).getFirst();
    }

    /** Abrir una alerta nueva la pasa a LEIDA, para que baje el contador del menú. */
    @Transactional
    public AlertaResponse marcarLeida(Long usuarioId, Long id) {
        Alerta alerta = alertaPropia(usuarioId, id);
        alerta.marcarLeida();
        return respuestas(List.of(alerta)).getFirst();
    }

    @Transactional
    public AlertaResponse decidir(Long usuarioId, Long id, DecisionRequest solicitud) {
        Alerta alerta = alertaPropia(usuarioId, id);
        if (alerta.getEstado() == EstadoAlerta.CERRADA) {
            throw new AlertaYaDecididaException();
        }
        AccionDecision accion = enumOpcional(AccionDecision.class, solicitud.accion(), DecisionRequest.MENSAJE_ACCION);
        if (accion == null) {
            throw new DecisionInvalidaException(DecisionRequest.MENSAJE_ACCION);
        }
        Producto producto = productoDe(alerta);
        BigDecimal precioAnterior = producto.getPrecioVenta();
        BigDecimal precioFinal = precioFinal(accion, alerta, solicitud);
        String motivo = motivo(accion, solicitud.motivo());
        try {
            decisiones.saveAndFlush(new DecisionPrecio(alerta.getId(), producto.getId(), accion, precioAnterior,
                    precioFinal, motivo));
        } catch (DataIntegrityViolationException e) {
            // Dos decisiones a la vez sobre la misma alerta: el único de la BD frena la segunda
            throw new AlertaYaDecididaException();
        }
        if (precioFinal != null) {
            producto.cambiarPrecioVenta(precioFinal);
            // La posición frente a la competencia depende del precio de venta
            sugerencias.recalcular(producto.getId());
        }
        alerta.cerrar();
        return respuestas(List.of(alerta)).getFirst();
    }

    /** Aceptar toma el sugerido de la alerta; ajustar exige un precio; descartar no cambia el precio. */
    private static BigDecimal precioFinal(AccionDecision accion, Alerta alerta, DecisionRequest solicitud) {
        return switch (accion) {
            case ACEPTAR -> {
                if (alerta.getPrecioSugerido() == null) {
                    throw new DecisionInvalidaException(MENSAJE_SIN_SUGERIDO);
                }
                yield alerta.getPrecioSugerido();
            }
            case AJUSTAR -> {
                if (solicitud.precioFinal() == null || solicitud.precioFinal().signum() <= 0) {
                    throw new DecisionInvalidaException(MENSAJE_PRECIO_FINAL);
                }
                yield solicitud.precioFinal();
            }
            case DESCARTAR -> null;
        };
    }

    /** Obligatorio solo al descartar; en las otras acciones es opcional. */
    private static String motivo(AccionDecision accion, String motivo) {
        String limpio = motivo == null || motivo.isBlank() ? null : motivo.trim();
        if (accion == AccionDecision.DESCARTAR && limpio == null) {
            throw new DecisionInvalidaException(MENSAJE_MOTIVO);
        }
        return limpio;
    }

    private Alerta alertaPropia(Long usuarioId, Long id) {
        return alertas.findByIdAndUsuarioId(id, usuarioId).orElseThrow(AlertaNoEncontradaException::new);
    }

    /** La alerta se borra en cascada con su monitoreo y su producto: si existe, ellos también. */
    private Producto productoDe(Alerta alerta) {
        return monitoreos.findById(alerta.getMonitoreoId())
                .flatMap(m -> productos.findById(m.getProductoId()))
                .orElseThrow(AlertaNoEncontradaException::new);
    }

    private List<AlertaResponse> respuestas(List<Alerta> lista) {
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Long, Monitoreo> delMonitoreo = porId(monitoreos.findAllById(lista.stream().map(Alerta::getMonitoreoId)
                .distinct().toList()), Monitoreo::getId);
        Map<Long, Producto> delProducto = porId(productos.findAllById(delMonitoreo.values().stream()
                .map(Monitoreo::getProductoId).distinct().toList()), Producto::getId);
        Map<Long, DecisionPrecio> deLaAlerta = decisiones.findByAlertaIdIn(lista.stream().map(Alerta::getId).toList())
                .stream().collect(Collectors.toMap(DecisionPrecio::getAlertaId, Function.identity()));
        return lista.stream().map(alerta -> {
            Producto producto = delProducto.get(delMonitoreo.get(alerta.getMonitoreoId()).getProductoId());
            HistoricoPrecio publicacion = historico.findFirstByMonitoreoIdAndPublicacionIdOrderByCapturadoEnDescIdDesc(
                    alerta.getMonitoreoId(), alerta.getPublicacionId()).orElse(null);
            BigDecimal sugerido = alerta.getPrecioSugerido();
            return new AlertaResponse(alerta.getId(), alerta.getTipo(), alerta.getRelevancia(), alerta.getEstado(),
                    alerta.getCreadoEn(), alerta.getMonitoreoId(), alerta.getPublicacionId(), producto.getId(),
                    producto.getNombre(), producto.getPrecioVenta(), producto.getMargenActual(),
                    producto.getMargenObjetivo(),
                    competidor(publicacion),
                    publicacion == null ? null : publicacion.getTitulo(), alerta.getPrecioAnterior(),
                    alerta.getPrecioNuevo(), alerta.getVariacionPct(), sugerido,
                    sugerido == null ? null : producto.margenCon(sugerido),
                    AlertaResponse.Decision.de(deLaAlerta.get(alerta.getId())));
        }).toList();
    }

    private static String competidor(HistoricoPrecio publicacion) {
        String nombre = publicacion == null ? null : NombreVendedor.de(publicacion.getVendedor());
        return nombre == null ? "Competidor" : nombre;
    }

    private static <T> Map<Long, T> porId(List<T> lista, Function<T, Long> id) {
        return lista.stream().collect(Collectors.toMap(id, Function.identity()));
    }

    /** {@code null} si no viene; un valor desconocido responde 400 con {@code mensaje}. */
    private static <E extends Enum<E>> E enumOpcional(Class<E> tipo, String texto, String mensaje) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(tipo, texto.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DecisionInvalidaException(mensaje);
        }
    }
}
