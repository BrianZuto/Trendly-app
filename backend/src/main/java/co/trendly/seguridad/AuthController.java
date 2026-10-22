package co.trendly.seguridad;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.usuario.UsuarioResponse;
import jakarta.validation.Valid;

/**
 * {@code POST /api/v1/auth/login} (público) y {@code GET /api/v1/auth/me} (exige token). SCRUM-31.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest solicitud) {
        return authService.login(solicitud);
    }

    @GetMapping("/me")
    public UsuarioResponse me(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return authService.perfil(usuario);
    }
}
