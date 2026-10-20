package co.trendly.monitoreo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/v1/productos/{id}/monitoreos}.
 * <ul>
 * <li>Por URL (SCRUM-36): {@code { "tipo": "URL", "valor": "https://...", "frecuenciaHoras": 6 }}.</li>
 * <li>Por palabra clave (SCRUM-37): además {@code marketplace} y {@code topN}.</li>
 * </ul>
 * {@code tipo} y {@code marketplace} llegan como texto para responder un 400 claro si traen un valor desconocido.
 */
public record MonitoreoRequest(

        @NotBlank(message = "El tipo es obligatorio")
        String tipo,

        @NotBlank(message = "La URL o palabra clave es obligatoria")
        @Size(max = 500, message = "La URL no puede tener más de 500 caracteres")
        String valor,

        String marketplace,

        Integer topN,

        /** Opcional; por defecto 6 horas. */
        Integer frecuenciaHoras) {
}
