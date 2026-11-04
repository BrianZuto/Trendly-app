package co.trendly.alerta;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record ReglaAlertaRequest(
        @NotNull(message = "El umbral es obligatorio")
        @DecimalMin(value = "0.01", message = "El umbral debe estar entre 0,01 y 100")
        @DecimalMax(value = "100", message = "El umbral debe estar entre 0,01 y 100")
        @Digits(integer = 3, fraction = 2, message = "El umbral admite hasta 2 decimales")
        BigDecimal umbralPct,
        @NotNull(message = "Indique si quiere avisos de disponibilidad")
        Boolean avisarDisponibilidad,
        @NotNull(message = "Indique si quiere recibir correos")
        Boolean recibirCorreos) {
}
