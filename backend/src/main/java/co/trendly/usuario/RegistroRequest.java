package co.trendly.usuario;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/v1/auth/registro}. Son las mismas reglas que valida el frontend
 * ({@code frontend/src/shared/utils/validaciones.js}).
 */
public record RegistroRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede tener más de 100 caracteres")
        String nombre,

        @NotBlank(message = "El email es obligatorio")
        @Email(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Ingresa un email válido")
        @Size(max = 150, message = "El email no puede tener más de 150 caracteres")
        String email,

        // BCrypt solo usa los primeros 72 bytes; por eso el máximo
        @NotNull(message = RegistroRequest.MENSAJE_PASSWORD)
        @Size(min = 8, max = 72, message = RegistroRequest.MENSAJE_PASSWORD)
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d).*$", message = RegistroRequest.MENSAJE_PASSWORD)
        String password,

        @NotNull(message = RegistroRequest.MENSAJE_POLITICA)
        @AssertTrue(message = RegistroRequest.MENSAJE_POLITICA)
        Boolean aceptaPolitica) {

    public static final String MENSAJE_PASSWORD =
            "La contraseña debe tener entre 8 y 72 caracteres, con letras y números";
    public static final String MENSAJE_POLITICA = "Debe aceptar la política de tratamiento de datos";
}
