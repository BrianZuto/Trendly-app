package co.trendly.scraping.mercadolibre;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;
import tools.jackson.databind.JsonNode;

/**
 * Convierte las respuestas de la API de catálogo de MercadoLibre en publicaciones capturadas (SCRUM-40).
 * No hace peticiones.
 * <ul>
 * <li>{@code /products/{id}}: nombre del producto.</li>
 * <li>{@code /products/{id}/items}: ofertas activas de los vendedores, la mejor primero; cada una con precio,
 * moneda y vendedor.</li>
 * <li>{@code /products/search}: productos de catálogo que coinciden con una palabra clave.</li>
 * </ul>
 */
public final class MercadoLibreParser {

    /** Producto de catálogo encontrado en una búsqueda. */
    public record ProductoCatalogo(String id, String nombre) {
    }

    private MercadoLibreParser() {
    }

    /**
     * Primera oferta de {@code /products/{id}/items} con el nombre del producto. Si se pidió una oferta puntual
     * ({@code ?item_id=}), es la única de la lista.
     */
    public static ResultadoScraping publicacion(JsonNode producto, JsonNode ofertas) {
        JsonNode resultados = ofertas.path("results");
        if (!resultados.isArray()) {
            return ResultadoScraping.fallo(TipoFallo.ESTRUCTURA, "La respuesta de las ofertas no trae resultados");
        }
        if (resultados.isEmpty()) {
            return ResultadoScraping.fallo(TipoFallo.NO_ENCONTRADO, "La oferta ya no está activa en MercadoLibre");
        }
        PublicacionCapturada p = oferta(resultados.path(0), producto.path("name").asString(""), null);
        String error = validar(p);
        return error == null ? ResultadoScraping.ok(List.of(p)) : ResultadoScraping.fallo(TipoFallo.DATO_INVALIDO, error);
    }

    /** Primera oferta válida de un producto encontrado en la búsqueda, o {@code null} si no sirve. */
    public static PublicacionCapturada mejorOferta(JsonNode ofertas, String nombre, int posicion) {
        JsonNode primera = ofertas.path("results").path(0);
        if (primera.isMissingNode()) {
            return null;
        }
        PublicacionCapturada p = oferta(primera, nombre, posicion);
        return validar(p) == null ? p : null;
    }

    /**
     * Productos de {@code /products/search}, en el orden de relevancia de MercadoLibre.
     *
     * @throws IllegalArgumentException si la respuesta no trae la lista de resultados
     */
    public static List<ProductoCatalogo> productos(JsonNode busqueda) {
        JsonNode resultados = busqueda.path("results");
        if (!resultados.isArray()) {
            throw new IllegalArgumentException("La respuesta de la búsqueda no trae resultados");
        }
        List<ProductoCatalogo> productos = new ArrayList<>();
        for (JsonNode producto : resultados) {
            String id = producto.path("id").asString("");
            if (!id.isBlank()) {
                productos.add(new ProductoCatalogo(id, producto.path("name").asString("")));
            }
        }
        return productos;
    }

    private static PublicacionCapturada oferta(JsonNode oferta, String titulo, Integer posicion) {
        // Las ofertas que lista el catálogo están activas; si la API informa unidades, se respetan
        boolean disponible = oferta.path("available_quantity").asInt(1) > 0;
        return new PublicacionCapturada(conGuion(oferta.path("item_id").asString("")), titulo,
                texto(oferta.path("seller_id")), posicion, decimal(oferta.path("price")),
                oferta.path("currency_id").asString(""), disponible);
    }

    /** Mensaje del problema, o {@code null} si la oferta sirve. */
    private static String validar(PublicacionCapturada p) {
        if (p.precio() == null || p.precio().signum() <= 0) {
            return "El precio de la oferta no es válido";
        }
        if (!p.moneda().matches("[A-Z]{3}")) {
            return "La oferta no indica la moneda del precio";
        }
        return null;
    }

    private static BigDecimal decimal(JsonNode valor) {
        return valor.isNumber() ? valor.decimalValue() : null;
    }

    private static String texto(JsonNode valor) {
        return valor.isMissingNode() || valor.isNull() ? null : valor.asString();
    }

    /** La API usa "MCO123"; en Trendly se guarda "MCO-123", igual que en el monitoreo (SCRUM-36). */
    static String conGuion(String id) {
        return id.matches("MCO\\d+") ? "MCO-" + id.substring(3) : id;
    }

    /** "MCO-123" → "MCO123", el formato de la API. */
    static String sinGuion(String id) {
        return id.replace("-", "");
    }
}
