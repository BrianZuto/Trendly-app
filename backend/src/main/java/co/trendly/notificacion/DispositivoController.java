package co.trendly.notificacion;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.seguridad.UsuarioAutenticado;
import jakarta.validation.Valid;

/** Celulares del vendedor autenticado que reciben notificaciones push (SCRUM-52). */
@RestController
@RequestMapping("/api/v1/usuarios/me/dispositivos")
public class DispositivoController {

    private final DispositivoService dispositivos;

    public DispositivoController(DispositivoService dispositivos) {
        this.dispositivos = dispositivos;
    }

    @PostMapping
    public ResponseEntity<Void> registrar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @Valid @RequestBody DispositivoRequest solicitud) {
        dispositivos.registrar(usuario.id(), solicitud);
        return ResponseEntity.noContent().build();
    }

    /** El token va como parámetro porque lleva corchetes, que no van bien en la ruta. */
    @DeleteMapping
    public ResponseEntity<Void> quitar(@AuthenticationPrincipal UsuarioAutenticado usuario, @RequestParam String token) {
        dispositivos.quitar(usuario.id(), token);
        return ResponseEntity.noContent().build();
    }
}
