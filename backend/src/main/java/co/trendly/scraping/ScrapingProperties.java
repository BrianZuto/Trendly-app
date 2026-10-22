package co.trendly.scraping;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Buenas prácticas de scraping (SCRUM-40), en {@code application.properties} con el prefijo {@code scraping}.
 *
 * @param userAgent           User-Agent identificable: dice quién hace la petición y dónde ver el proyecto
 * @param timeoutMs           tiempo máximo por página (10 s)
 * @param segundosEntrePeticiones una petición cada N segundos por marketplace (2 s)
 * @param seleniumHabilitado  si se puede abrir Chrome headless (en las pruebas va en false)
 */
@ConfigurationProperties(prefix = "scraping")
public record ScrapingProperties(String userAgent, int timeoutMs, int segundosEntrePeticiones,
        boolean seleniumHabilitado) {
}
