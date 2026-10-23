package co.trendly.producto;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;

/**
 * CRUD de productos propios (SCRUM-33). Todas las operaciones reciben el id del vendedor autenticado:
 * nadie ve ni toca productos ajenos.
 */
@Service
public class ProductoService {

    private final ProductoRepository productos;
    private final UsuarioRepository usuarios;

    public ProductoService(ProductoRepository productos, UsuarioRepository usuarios) {
        this.productos = productos;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<ProductoResponse> listar(Long usuarioId) {
        return productos.findByUsuarioIdOrderByIdAsc(usuarioId).stream().map(ProductoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public ProductoResponse consultar(Long usuarioId, Long id) {
        return ProductoResponse.de(buscarPropio(usuarioId, id));
    }

    /**
     * @throws LimitePlanException  si ya tiene el máximo de productos de su plan
     * @throws SkuRepetidoException si ya tiene otro producto con ese SKU
     */
    @Transactional
    public ProductoResponse crear(Long usuarioId, ProductoRequest solicitud) {
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("No existe el usuario " + usuarioId + " del token"));
        if (productos.countByUsuarioId(usuarioId) >= usuario.getPlan().getMaxProductos()) {
            throw new LimitePlanException();
        }
        String sku = normalizarSku(solicitud.sku());
        if (sku != null && productos.existsByUsuarioIdAndSkuIgnoreCase(usuarioId, sku)) {
            throw new SkuRepetidoException();
        }
        Producto producto = new Producto(usuarioId);
        aplicar(producto, solicitud, sku);
        return ProductoResponse.de(guardar(producto));
    }

    @Transactional
    public ProductoResponse editar(Long usuarioId, Long id, ProductoRequest solicitud) {
        Producto producto = buscarPropio(usuarioId, id);
        String sku = normalizarSku(solicitud.sku());
        if (sku != null && productos.existsByUsuarioIdAndSkuIgnoreCaseAndIdNot(usuarioId, sku, id)) {
            throw new SkuRepetidoException();
        }
        aplicar(producto, solicitud, sku);
        return ProductoResponse.de(guardar(producto));
    }

    /** Borra el producto. La base de datos borra en cascada sus monitoreos, histórico, sugerencias y decisiones. */
    @Transactional
    public void eliminar(Long usuarioId, Long id) {
        productos.delete(buscarPropio(usuarioId, id));
        productos.flush();
    }

    private Producto buscarPropio(Long usuarioId, Long id) {
        return productos.findByIdAndUsuarioId(id, usuarioId).orElseThrow(ProductoNoEncontradoException::new);
    }

    private static void aplicar(Producto producto, ProductoRequest solicitud, String sku) {
        producto.actualizar(solicitud.nombre().trim(), sku, solicitud.costoTotal(), solicitud.precioVenta(),
                solicitud.margenObjetivo());
    }

    private Producto guardar(Producto producto) {
        try {
            // saveAndFlush: si dos solicitudes crean el mismo SKU a la vez, el único de la BD lo frena aquí
            return productos.saveAndFlush(producto);
        } catch (DataIntegrityViolationException e) {
            throw new SkuRepetidoException();
        }
    }

    /** SKU sin espacios a los lados; vacío equivale a no tener SKU. */
    static String normalizarSku(String sku) {
        return sku == null || sku.isBlank() ? null : sku.trim();
    }
}
