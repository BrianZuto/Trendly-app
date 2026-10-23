package co.trendly.usuario;

import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registro de vendedores (SCRUM-30): rol VENDEDOR, plan Gratuito y constancia de la política de datos. */
@Service
public class RegistroService {

    private final UsuarioRepository usuarios;
    private final PlanRepository planes;
    private final PasswordEncoder passwordEncoder;

    public RegistroService(UsuarioRepository usuarios, PlanRepository planes, PasswordEncoder passwordEncoder) {
        this.usuarios = usuarios;
        this.planes = planes;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Crea la cuenta. El formato de los datos ya lo validó {@link RegistroRequest}.
     *
     * @throws EmailYaRegistradoException si el email ya tiene cuenta
     * @throws IllegalArgumentException   si no se aceptó la política de datos
     */
    @Transactional
    public UsuarioResponse registrar(RegistroRequest solicitud) {
        if (!Boolean.TRUE.equals(solicitud.aceptaPolitica())) {
            throw new IllegalArgumentException(RegistroRequest.MENSAJE_POLITICA);
        }
        String email = normalizarEmail(solicitud.email());
        if (usuarios.existsByEmail(email)) {
            throw new EmailYaRegistradoException();
        }
        Plan gratuito = planes.findByNombre(Plan.GRATUITO)
                .orElseThrow(() -> new IllegalStateException("No existe el plan " + Plan.GRATUITO));

        Usuario usuario = Usuario.nuevoVendedor(solicitud.nombre().trim(), email,
                passwordEncoder.encode(solicitud.password()), gratuito);
        try {
            // saveAndFlush: si otro registro con el mismo email entra al mismo tiempo, el único de la BD lo frena aquí
            return UsuarioResponse.de(usuarios.saveAndFlush(usuario));
        } catch (DataIntegrityViolationException e) {
            throw new EmailYaRegistradoException();
        }
    }

    /** Minúsculas y sin espacios. El login (SCRUM-31) lo usa para buscar el usuario igual que se guardó. */
    public static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
