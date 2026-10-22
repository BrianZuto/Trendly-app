package co.trendly.monitoreo;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo de {@code PATCH /api/v1/monitoreos/{id}}: {@code { "estado": "PAUSADO" }} o {@code "ACTIVO"}. */
public record CambioEstadoRequest(@NotBlank(message = CambioEstadoRequest.MENSAJE) String estado) {

    public static final String MENSAJE = "El estado debe ser ACTIVO o PAUSADO";
}
