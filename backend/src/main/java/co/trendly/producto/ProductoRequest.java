package co.trendly.producto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/v1/productos} y {@code PUT /api/v1/productos/{id}} (SCRUM-33).
 * Al crear, el frontend puede mandar además {@code costosExtra} (envío, comisión, empaque: se suman al costo) y
 * {@code reventa} (dónde vigilar la reventa: se crean los monitoreos por palabra clave junto con el producto).
 */
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
        BigDecimal margenObjetivo,

        @DecimalMin(value = "0", message = "Los costos extra no pueden ser negativos")
        @Digits(integer = 12, fraction = 2, message = "Los costos extra admiten hasta 12 enteros y 2 decimales")
        BigDecimal costosExtra,

        @Valid
        ReventaRequest reventa) {

    /** Sin costos extra ni reventa (editar, y las pruebas de SCRUM-33). */
    public ProductoRequest(String nombre, String sku, BigDecimal costo, BigDecimal precioVenta, BigDecimal margenObjetivo) {
        this(nombre, sku, costo, precioVenta, margenObjetivo, null, null);
    }

    /** Costo del producto más los costos extra, que es lo que cuenta para el margen. */
    public BigDecimal costoTotal() {
        return costosExtra == null || costo == null ? costo : costo.add(costosExtra);
    }

    /**
     * Dónde vigilar la reventa al crear el producto: una búsqueda por palabra clave en cada marketplace. Las reglas de
     * la palabra clave, el marketplace y el Top N son las del monitoreo (SCRUM-37).
     */
    public record ReventaRequest(
            @NotBlank(message = "La palabra clave de la reventa es obligatoria")
            String palabraClave,

            @NotEmpty(message = "Elige al menos un sitio de reventa")
            List<String> marketplaces,

            Integer topN) {
    }

    public static final String MENSAJE_COSTO = "El costo debe ser mayor que 0";
    public static final String MENSAJE_PRECIO = "El precio de venta debe ser mayor que 0";
    public static final String MENSAJE_MARGEN = "El margen objetivo debe estar entre 0 y 100";
}
