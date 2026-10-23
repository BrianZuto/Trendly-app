package co.trendly.producto;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.monitoreo.CompetenciaService;
import co.trendly.monitoreo.ResumenCompetencia;
import co.trendly.seguridad.UsuarioAutenticado;
import jakarta.validation.Valid;

/** CRUD {@code /api/v1/productos} (SCRUM-33). Exige token: el vendedor sale del JWT, nunca del cuerpo. */
@RestController
@RequestMapping("/api/v1/productos")
public class ProductoController {

    private final ProductoService productoService;
    private final AltaProductoService altaProducto;
    private final CompetenciaService competencia;

    public ProductoController(ProductoService productoService, AltaProductoService altaProducto,
            CompetenciaService competencia) {
        this.productoService = productoService;
        this.altaProducto = altaProducto;
        this.competencia = competencia;
    }

    /** Cada producto con el resumen de su competencia (cuántos competidores y el más barato). */
    @GetMapping
    public List<ProductoResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        List<ProductoResponse> lista = productoService.listar(usuario.id());
        Map<Long, ResumenCompetencia> resumenes = competencia.resumenes(lista.stream().map(ProductoResponse::id).toList());
        return lista.stream().map(p -> p.conCompetencia(resumenes.get(p.id()))).toList();
    }

    @GetMapping("/{id}")
    public ProductoResponse consultar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        ProductoResponse producto = productoService.consultar(usuario.id(), id);
        return producto.conCompetencia(competencia.resumenes(List.of(producto.id())).get(producto.id()));
    }

    /** Con {@code reventa}, crea también los monitoreos por palabra clave (todo o nada). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductoResponse crear(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @Valid @RequestBody ProductoRequest solicitud) {
        return altaProducto.crear(usuario.id(), solicitud);
    }

    @PutMapping("/{id}")
    public ProductoResponse editar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
            @Valid @RequestBody ProductoRequest solicitud) {
        return productoService.editar(usuario.id(), id, solicitud);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        productoService.eliminar(usuario.id(), id);
    }
}
