package co.trendly.seguridad;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo de {@code POST /api/v1/auth/login}. */
public record LoginRequest(

        @NotBlank(message = "El email es obligatorio")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        String password) {
}
