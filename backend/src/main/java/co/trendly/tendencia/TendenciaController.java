package co.trendly.tendencia;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.seguridad.UsuarioAutenticado;

/** Ranking de productos en tendencia del vendedor (SCRUM-53). Exige token. */
@RestController
public class TendenciaController {

    private final TendenciaService tendencias;

    public TendenciaController(TendenciaService tendencias) {
        this.tendencias = tendencias;
    }

    @GetMapping("/api/v1/tendencias")
    public List<TendenciaResponse> ranking(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestParam(defaultValue = "20") int top) {
        return tendencias.ranking(usuario.id(), top);
    }
}
