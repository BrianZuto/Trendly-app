package co.trendly.sugerencia;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record ComisionRequest(
        @NotNull(message = "La comisión es obligatoria")
        @DecimalMin(value = "0", message = "La comisión debe estar entre 0 y 99,99")
        @DecimalMax(value = "99.99", message = "La comisión debe estar entre 0 y 99,99")
        @Digits(integer = 2, fraction = 2, message = "La comisión admite hasta 2 decimales")
        BigDecimal comisionPct) {
}
