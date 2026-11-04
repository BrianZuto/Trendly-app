package co.trendly.sugerencia;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.seguridad.UsuarioAutenticado;

/** Precio sugerido de un producto propio (SCRUM-46). */
@RestController
public class SugerenciaController {

    private final SugerenciaService sugerencias;

    public SugerenciaController(SugerenciaService sugerencias) {
        this.sugerencias = sugerencias;
    }

    @GetMapping("/api/v1/productos/{id}/sugerencia")
    public SugerenciaResponse consultar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        return sugerencias.consultar(usuario.id(), id);
    }
}
