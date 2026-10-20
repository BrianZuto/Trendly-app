package co.trendly.monitoreo;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.comun.ErrorDeNegocio;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoNoEncontradoException;
import co.trendly.producto.ProductoRepository;
import co.trendly.usuario.Plan;
import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;

/**
 * Competidores de cada producto (SCRUM-36). Solo el dueño del producto puede crear, ver, pausar o borrar
 * sus monitoreos; para los demás no existen (404).
 */
@Service
public class MonitoreoService {

    public static final int MAX_POR_PRODUCTO = 10;
    public static final int FRECUENCIA_MINIMA_PRO = 1;

    static final String MENSAJE_NO_ENCONTRADO = "Monitoreo no encontrado";
    static final String MENSAJE_REPETIDO = "Ya vigilas esta publicación en este producto";
    static final String MENSAJE_LIMITE = "Alcanzó el límite de competidores para este producto";
    static final String MENSAJE_FRECUENCIA_PLAN = "Solo el plan Pro puede cambiar la frecuencia";
    static final String MENSAJE_FRECUENCIA_RANGO = "La frecuencia debe estar entre 1 y 6 horas";
    static final String MENSAJE_TIPO = "El tipo debe ser URL o PALABRA_CLAVE";
    static final String MENSAJE_PALABRA_CLAVE = "El monitoreo por palabra clave todavía no está disponible";

    private final MonitoreoRepository monitoreos;
    private final ProductoRepository productos;
    private final UsuarioRepository usuarios;

    public MonitoreoService(MonitoreoRepository monitoreos, ProductoRepository productos, UsuarioRepository usuarios) {
        this.monitoreos = monitoreos;
        this.productos = productos;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<MonitoreoResponse> listar(Long usuarioId, Long productoId) {
        Producto producto = productoPropio(usuarioId, productoId);
        return monitoreos.findByProductoIdOrderByIdAsc(producto.getId()).stream().map(MonitoreoResponse::de).toList();
    }

    @Transactional
    public MonitoreoResponse crear(Long usuarioId, Long productoId, MonitoreoRequest solicitud) {
        Producto producto = productoPropio(usuarioId, productoId);
        TipoMonitoreo tipo = tipoDe(solicitud.tipo());
        if (tipo == TipoMonitoreo.PALABRA_CLAVE) {
            // SCRUM-37 (Brian) completa este caso sobre el mismo endpoint
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_PALABRA_CLAVE);
        }
        int frecuencia = frecuenciaPermitida(usuarioId, solicitud.frecuenciaHoras());
        if (monitoreos.countByProductoId(producto.getId()) >= MAX_POR_PRODUCTO) {
            throw new ErrorDeNegocio(HttpStatus.UNPROCESSABLE_CONTENT, MENSAJE_LIMITE);
        }

        String url = solicitud.valor().trim();
        PublicacionUrl publicacion = PublicacionUrl.reconocer(url);
        if (monitoreos.existsByProductoIdAndMarketplaceAndIdPublicacion(producto.getId(), publicacion.marketplace(),
                publicacion.idPublicacion())) {
            throw repetido();
        }
        try {
            // saveAndFlush: si llegan dos solicitudes iguales a la vez, el único de la BD frena la segunda aquí
            return MonitoreoResponse.de(monitoreos.saveAndFlush(
                    Monitoreo.porUrl(producto.getId(), url, publicacion, frecuencia)));
        } catch (DataIntegrityViolationException e) {
            throw repetido();
        }
    }

    /** Pausa o reactiva. ERROR no se puede elegir: lo pone el job (SCRUM-45). */
    @Transactional
    public MonitoreoResponse cambiarEstado(Long usuarioId, Long id, CambioEstadoRequest solicitud) {
        Monitoreo monitoreo = buscarPropio(usuarioId, id);
        switch (solicitud.estado().trim().toUpperCase()) {
            case "PAUSADO" -> monitoreo.pausar();
            case "ACTIVO" -> monitoreo.reactivar();
            default -> throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, CambioEstadoRequest.MENSAJE);
        }
        return MonitoreoResponse.de(monitoreos.saveAndFlush(monitoreo));
    }

    /** La base de datos borra en cascada el histórico, las incidencias y las alertas del monitoreo. */
    @Transactional
    public void eliminar(Long usuarioId, Long id) {
        monitoreos.delete(buscarPropio(usuarioId, id));
        monitoreos.flush();
    }

    private Producto productoPropio(Long usuarioId, Long productoId) {
        return productos.findByIdAndUsuarioId(productoId, usuarioId).orElseThrow(ProductoNoEncontradoException::new);
    }

    /** El monitoreo, si es de un producto del usuario; si no, 404. Lo usa también el histórico (SCRUM-42). */
    public Monitoreo buscarPropio(Long usuarioId, Long id) {
        return monitoreos.findById(id)
                .filter(m -> productos.findByIdAndUsuarioId(m.getProductoId(), usuarioId).isPresent())
                .orElseThrow(() -> new ErrorDeNegocio(HttpStatus.NOT_FOUND, MENSAJE_NO_ENCONTRADO));
    }

    private static TipoMonitoreo tipoDe(String tipo) {
        try {
            return TipoMonitoreo.valueOf(tipo.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_TIPO);
        }
    }

    /** 6 horas por defecto. Solo el plan Pro puede bajarla, hasta 1 hora. */
    private int frecuenciaPermitida(Long usuarioId, Integer pedida) {
        if (pedida == null || pedida == Monitoreo.FRECUENCIA_POR_DEFECTO) {
            return Monitoreo.FRECUENCIA_POR_DEFECTO;
        }
        if (pedida < FRECUENCIA_MINIMA_PRO || pedida > Monitoreo.FRECUENCIA_POR_DEFECTO) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_FRECUENCIA_RANGO);
        }
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("No existe el usuario " + usuarioId + " del token"));
        if (!Plan.PRO.equals(usuario.getPlan().getNombre())) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_FRECUENCIA_PLAN);
        }
        return pedida;
    }

    private static ErrorDeNegocio repetido() {
        return new ErrorDeNegocio(HttpStatus.CONFLICT, MENSAJE_REPETIDO);
    }
}
