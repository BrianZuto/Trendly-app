package co.trendly.monitoreo;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.seguridad.UsuarioAutenticado;
import jakarta.validation.Valid;

/** Competidores de un producto (SCRUM-36). Exige token: el dueño sale del JWT. */
@RestController
@RequestMapping("/api/v1")
public class MonitoreoController {

    private final MonitoreoService monitoreoService;

    public MonitoreoController(MonitoreoService monitoreoService) {
        this.monitoreoService = monitoreoService;
    }

    @GetMapping("/productos/{productoId}/monitoreos")
    public List<MonitoreoResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable Long productoId) {
        return monitoreoService.listar(usuario.id(), productoId);
    }

    @PostMapping("/productos/{productoId}/monitoreos")
    @ResponseStatus(HttpStatus.CREATED)
    public MonitoreoResponse crear(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long productoId,
            @Valid @RequestBody MonitoreoRequest solicitud) {
        return monitoreoService.crear(usuario.id(), productoId, solicitud);
    }

    @PatchMapping("/monitoreos/{id}")
    public MonitoreoResponse cambiarEstado(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
            @Valid @RequestBody CambioEstadoRequest solicitud) {
        return monitoreoService.cambiarEstado(usuario.id(), id, solicitud);
    }

    @DeleteMapping("/monitoreos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        monitoreoService.eliminar(usuario.id(), id);
    }
}
