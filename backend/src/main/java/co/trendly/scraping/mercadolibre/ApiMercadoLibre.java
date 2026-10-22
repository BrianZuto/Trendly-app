package co.trendly.scraping.mercadolibre;

import co.trendly.scraping.FalloDeScraping;
import tools.jackson.databind.JsonNode;

/**
 * Consulta un recurso de la API de MercadoLibre y devuelve el JSON. En las pruebas se reemplaza por respuestas
 * reales guardadas en {@code src/test/resources/scraping/mercadolibre}.
 */
@FunctionalInterface
public interface ApiMercadoLibre {

    /**
     * @param ruta recurso con su consulta, por ejemplo {@code /items/MCO123} o {@code /sites/MCO/search?q=...}
     * @throws FalloDeScraping NO_ENCONTRADO (404), BLOQUEO (credenciales, 401/403/429) o TIMEOUT (red, 5xx)
     */
    JsonNode consultar(String ruta) throws FalloDeScraping;
}
