package co.trendly.seguridad;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.usuario.RegistroService;
import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;
import co.trendly.usuario.UsuarioResponse;

/** Inicio de sesión y datos del usuario autenticado (SCRUM-31). */
@Service
public class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Hash de una contraseña cualquiera. Si el email no existe se compara contra él, para que el login
     * tarde lo mismo y no deje adivinar qué emails están registrados.
     */
    private final String hashDeRelleno;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.hashDeRelleno = passwordEncoder.encode("relleno-para-igualar-tiempos");
    }

    /**
     * @throws CredencialesInvalidasException si el email no existe, la contraseña no coincide o la cuenta está inactiva
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest solicitud) {
        Usuario usuario = usuarios.findByEmail(RegistroService.normalizarEmail(solicitud.email())).orElse(null);
        String hash = usuario != null ? usuario.getPasswordHash() : hashDeRelleno;
        boolean contrasenaCorrecta = passwordEncoder.matches(solicitud.password(), hash);
        if (usuario == null || !contrasenaCorrecta || !usuario.isActivo()) {
            throw new CredencialesInvalidasException();
        }
        String token = jwtService.generarToken(
                new UsuarioAutenticado(usuario.getId(), usuario.getEmail(), usuario.getRol().name()));
        return new LoginResponse(token, "Bearer", jwtService.getVigenciaMs() / 1000);
    }

    /**
     * Datos actuales del usuario del token. Si lo borraron o lo desactivaron después de emitir el token,
     * responde como si el token ya no sirviera.
     */
    @Transactional(readOnly = true)
    public UsuarioResponse perfil(UsuarioAutenticado autenticado) {
        return usuarios.findById(autenticado.id())
                .filter(Usuario::isActivo)
                .map(UsuarioResponse::de)
                .orElseThrow(TokenSinUsuarioException::new);
    }
}
