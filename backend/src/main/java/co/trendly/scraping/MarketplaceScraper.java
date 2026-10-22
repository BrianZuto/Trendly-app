package co.trendly.scraping;

import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;

/**
 * Interfaz común de los scrapers (SCRUM-40). Cada marketplace tiene su implementación (patrón Strategy/Adapter):
 * si un sitio cambia su HTML, solo se toca su clase.
 *
 * <p>Contrato: {@link #obtener(Monitoreo)} <b>nunca lanza excepciones</b>. Un timeout, un bloqueo o una página que
 * cambió devuelven {@link ResultadoScraping#fallo} con el motivo, para no romper el ciclo del job (SCRUM-39).
 */
public interface MarketplaceScraper {

    /** Marketplace que atiende; el job elige el scraper según {@link Monitoreo#getMarketplace()}. */
    Marketplace marketplace();

    /**
     * Modo URL: una sola publicación. Modo palabra clave (SCRUM-37): las N primeras publicaciones de la búsqueda,
     * cada una con su posición.
     */
    ResultadoScraping obtener(Monitoreo monitoreo);
}
