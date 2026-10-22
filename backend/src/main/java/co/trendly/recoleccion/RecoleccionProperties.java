package co.trendly.recoleccion;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Job de recolección (SCRUM-39), con el prefijo {@code recoleccion}.
 *
 * @param apiKey     clave que debe mandar la Azure Function en {@code X-Api-Key}; viene de RECOLECCION_API_KEY.
 *                   Si está vacía, el endpoint interno queda cerrado (503)
 * @param tamanoLote monitoreos que se leen por consulta (20)
 */
@ConfigurationProperties(prefix = "recoleccion")
public record RecoleccionProperties(String apiKey, int tamanoLote) {

    boolean tieneApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }
}
