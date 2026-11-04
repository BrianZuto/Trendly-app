package co.trendly.alerta;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.seguridad.UsuarioAutenticado;
import jakarta.validation.Valid;

/** Reglas de alerta del vendedor autenticado (SCRUM-47). */
@RestController
@RequestMapping("/api/v1/usuarios/me/reglas-alerta")
public class ReglaAlertaController {

    private final ReglaAlertaService reglas;

    public ReglaAlertaController(ReglaAlertaService reglas) {
        this.reglas = reglas;
    }

    @GetMapping
    public ReglaAlertaResponse consultar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return ReglaAlertaResponse.de(reglas.deUsuario(usuario.id()));
    }

    @PutMapping
    public ReglaAlertaResponse actualizar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @Valid @RequestBody ReglaAlertaRequest solicitud) {
        return reglas.actualizar(usuario.id(), solicitud);
    }
}
