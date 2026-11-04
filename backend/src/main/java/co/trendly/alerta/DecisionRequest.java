package co.trendly.alerta;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code PATCH /api/v1/alertas/{id}/decision} (SCRUM-49):
 * {@code { "accion": "ACEPTAR | AJUSTAR | DESCARTAR", "precioFinal": 99900, "motivo": "..." }}.
 * {@code precioFinal} solo se usa al ajustar (al aceptar se toma el sugerido de la alerta) y {@code motivo} es
 * obligatorio al descartar. {@code accion} llega como texto para responder un 400 claro si trae un valor desconocido.
 */
public record DecisionRequest(
        @NotBlank(message = DecisionRequest.MENSAJE_ACCION)
        String accion,

        @Digits(integer = 12, fraction = 2, message = "El precio final admite hasta 12 enteros y 2 decimales")
        BigDecimal precioFinal,

        @Size(max = 500, message = "El motivo no puede tener más de 500 caracteres")
        String motivo) {

    public static final String MENSAJE_ACCION = "La acción debe ser ACEPTAR, AJUSTAR o DESCARTAR";
}
