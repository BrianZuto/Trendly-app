package co.trendly.alerta;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.seguridad.UsuarioAutenticado;
import jakarta.validation.Valid;

/** Bandeja de alertas del vendedor autenticado y decisión de precio (SCRUM-49). */
@RestController
@RequestMapping("/api/v1/alertas")
public class AlertaController {

    private final BandejaAlertasService bandeja;

    public AlertaController(BandejaAlertasService bandeja) {
        this.bandeja = bandeja;
    }

    @GetMapping
    public List<AlertaResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestParam(required = false) String estado, @RequestParam(required = false) String relevancia) {
        return bandeja.listar(usuario.id(), estado, relevancia);
    }

    @PatchMapping("/{id}/leida")
    public AlertaResponse marcarLeida(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        return bandeja.marcarLeida(usuario.id(), id);
    }

    @PatchMapping("/{id}/decision")
    public AlertaResponse decidir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
            @Valid @RequestBody DecisionRequest solicitud) {
        return bandeja.decidir(usuario.id(), id, solicitud);
    }
}
