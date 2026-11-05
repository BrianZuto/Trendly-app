package co.trendly.alerta;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.historico.HistoricoPrecio;
import co.trendly.historico.HistoricoPrecioRepository;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.NombreVendedor;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoRepository;
import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;

/** Arma los correos y las notificaciones push que faltan por enviar y marca los enviados. Sin SMTP de por medio: las transacciones son cortas. */
@Service
public class AlertasPendientesService {

    private static final Locale COLOMBIA = Locale.of("es", "CO");

    private final AlertaRepository alertas;
    private final ReglaAlertaService reglas;
    private final UsuarioRepository usuarios;
    private final MonitoreoRepository monitoreos;
    private final ProductoRepository productos;
    private final HistoricoPrecioRepository historico;

    public AlertasPendientesService(AlertaRepository alertas, ReglaAlertaService reglas, UsuarioRepository usuarios,
            MonitoreoRepository monitoreos, ProductoRepository productos, HistoricoPrecioRepository historico) {
        this.alertas = alertas;
        this.reglas = reglas;
        this.usuarios = usuarios;
        this.monitoreos = monitoreos;
        this.productos = productos;
        this.historico = historico;
    }

    /** Un correo por vendedor activo que quiera recibirlos, con sus alertas creadas después de {@code desde}. */
    @Transactional(readOnly = true)
    public List<CorreoVendedor> correosDesde(Instant desde) {
        return porVendedor(alertas.findByEnviadaCorreoEnIsNullAndCreadoEnAfterOrderByCreadoEnAscIdAsc(desde),
                ReglaAlerta::isRecibirCorreos);
    }

    /**
     * Lo mismo para las notificaciones push (SCRUM-52): las alertas sin notificar de cada vendedor activo que no las
     * desactivó. Si el vendedor no tiene la app, quedan pendientes y caducan igual que los correos.
     */
    @Transactional(readOnly = true)
    public List<CorreoVendedor> pushDesde(Instant desde) {
        return porVendedor(alertas.findByEnviadaPushEnIsNullAndCreadoEnAfterOrderByCreadoEnAscIdAsc(desde),
                ReglaAlerta::isRecibirPush);
    }

    @Transactional
    public void marcarEnviadas(Collection<Long> alertaIds, Instant cuando) {
        alertas.marcarEnviadas(alertaIds, cuando);
    }

    @Transactional
    public void marcarEnviadasPush(Collection<Long> alertaIds, Instant cuando) {
        alertas.marcarEnviadasPush(alertaIds, cuando);
    }

    private List<CorreoVendedor> porVendedor(List<Alerta> pendientes, Predicate<ReglaAlerta> quiere) {
        Map<Long, List<Alerta>> porUsuario = pendientes.stream()
                .collect(Collectors.groupingBy(Alerta::getUsuarioId, LinkedHashMap::new, Collectors.toList()));
        List<CorreoVendedor> resultado = new ArrayList<>();
        Map<Long, Usuario> vendedores = porId(usuarios.findAllById(porUsuario.keySet()), Usuario::getId);
        porUsuario.forEach((usuarioId, delUsuario) -> {
            Usuario vendedor = vendedores.get(usuarioId);
            if (vendedor != null && vendedor.isActivo() && quiere.test(reglas.deUsuario(usuarioId))) {
                resultado.add(new CorreoVendedor(usuarioId, vendedor.getEmail(), vendedor.getNombre(), filas(delUsuario)));
            }
        });
        return resultado;
    }

    private List<CorreoVendedor.Fila> filas(List<Alerta> delUsuario) {
        Map<Long, Monitoreo> delMonitoreo = porId(monitoreos.findAllById(delUsuario.stream().map(Alerta::getMonitoreoId).toList()),
                Monitoreo::getId);
        Map<Long, Producto> delProducto = porId(productos.findAllById(delMonitoreo.values().stream().map(Monitoreo::getProductoId).toList()),
                Producto::getId);
        return delUsuario.stream().map(alerta -> {
            Producto producto = delProducto.get(delMonitoreo.get(alerta.getMonitoreoId()).getProductoId());
            HistoricoPrecio publicacion = historico.findFirstByMonitoreoIdAndPublicacionIdOrderByCapturadoEnDescIdDesc(
                    alerta.getMonitoreoId(), alerta.getPublicacionId()).orElse(null);
            return new CorreoVendedor.Fila(alerta.getId(), producto.getNombre(), producto.getId(),
                    publicacion == null ? "Competidor" : NombreVendedor.de(publicacion.getVendedor()),
                    publicacion == null ? null : publicacion.getTitulo(), texto(alerta.getTipo()),
                    alerta.getRelevancia() == RelevanciaAlerta.ALTA, pesos(alerta.getPrecioAnterior()),
                    pesos(alerta.getPrecioNuevo()), variacion(alerta.getVariacionPct()), pesos(alerta.getPrecioSugerido()));
        }).toList();
    }

    private static <T> Map<Long, T> porId(List<T> lista, Function<T, Long> id) {
        return lista.stream().collect(Collectors.toMap(id, Function.identity()));
    }

    private static String texto(TipoAlerta tipo) {
        return switch (tipo) {
            case BAJA_PRECIO -> "Bajó de precio";
            case SUBIDA_PRECIO -> "Subió de precio";
            case AGOTADO -> "Se agotó";
            case DISPONIBLE -> "Volvió a estar disponible";
        };
    }

    /** {@code null} si la sugerencia está pendiente o no hay precio posible: la plantilla no muestra esa línea. */
    private static String pesos(BigDecimal valor) {
        if (valor == null) {
            return null;
        }
        NumberFormat formato = NumberFormat.getNumberInstance(COLOMBIA);
        formato.setMaximumFractionDigits(0);
        return "$ " + formato.format(valor);
    }

    private static String variacion(BigDecimal pct) {
        NumberFormat formato = NumberFormat.getNumberInstance(COLOMBIA);
        formato.setMaximumFractionDigits(2);
        return (pct.signum() > 0 ? "+" : "") + formato.format(pct) + " %";
    }
}
