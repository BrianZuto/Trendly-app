package co.trendly.producto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cuerpo de {@code POST /api/v1/productos} y {@code PUT /api/v1/productos/{id}} (SCRUM-33). */
public record ProductoRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 150, message = "El nombre no puede tener más de 150 caracteres")
        String nombre,

        // Opcional; si viene, es único por vendedor
        @Size(max = 60, message = "El SKU no puede tener más de 60 caracteres")
        String sku,

        @NotNull(message = ProductoRequest.MENSAJE_COSTO)
        @DecimalMin(value = "0", inclusive = false, message = ProductoRequest.MENSAJE_COSTO)
        @Digits(integer = 12, fraction = 2, message = "El costo admite hasta 12 enteros y 2 decimales")
        BigDecimal costo,

        @NotNull(message = ProductoRequest.MENSAJE_PRECIO)
        @DecimalMin(value = "0", inclusive = false, message = ProductoRequest.MENSAJE_PRECIO)
        @Digits(integer = 12, fraction = 2, message = "El precio de venta admite hasta 12 enteros y 2 decimales")
        BigDecimal precioVenta,

        @NotNull(message = ProductoRequest.MENSAJE_MARGEN)
        @DecimalMin(value = "0", message = ProductoRequest.MENSAJE_MARGEN)
        @DecimalMax(value = "100", message = ProductoRequest.MENSAJE_MARGEN)
        @Digits(integer = 3, fraction = 2, message = "El margen objetivo admite hasta 2 decimales")
        BigDecimal margenObjetivo) {

    public static final String MENSAJE_COSTO = "El costo debe ser mayor que 0";
    public static final String MENSAJE_PRECIO = "El precio de venta debe ser mayor que 0";
    public static final String MENSAJE_MARGEN = "El margen objetivo debe estar entre 0 y 100";
}
