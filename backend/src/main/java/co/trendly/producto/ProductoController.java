package co.trendly.producto;

import java.util.List;

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

import co.trendly.seguridad.UsuarioAutenticado;
import jakarta.validation.Valid;

/** CRUD {@code /api/v1/productos} (SCRUM-33). Exige token: el vendedor sale del JWT, nunca del cuerpo. */
@RestController
@RequestMapping("/api/v1/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    public List<ProductoResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return productoService.listar(usuario.id());
    }

    @GetMapping("/{id}")
    public ProductoResponse consultar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        return productoService.consultar(usuario.id(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductoResponse crear(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @Valid @RequestBody ProductoRequest solicitud) {
        return productoService.crear(usuario.id(), solicitud);
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
