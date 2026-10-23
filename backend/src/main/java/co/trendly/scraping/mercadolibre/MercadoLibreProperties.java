package co.trendly.scraping.mercadolibre;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Acceso a la API oficial de MercadoLibre (SCRUM-40), con el prefijo {@code mercadolibre}.
 * Las credenciales son de la aplicación creada en developers.mercadolibre.com.co y solo viven en variables de entorno.
 *
 * @param apiUrl       https://api.mercadolibre.com
 * @param clientId     App ID (variable ML_CLIENT_ID)
 * @param clientSecret Secret Key (variable ML_CLIENT_SECRET)
 */
@ConfigurationProperties(prefix = "mercadolibre")
public record MercadoLibreProperties(String apiUrl, String clientId, String clientSecret) {

    boolean tieneCredenciales() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }
}
