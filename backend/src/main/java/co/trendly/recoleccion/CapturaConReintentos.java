package co.trendly.recoleccion;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import co.trendly.monitoreo.Monitoreo;
import co.trendly.scraping.MarketplaceScraper;
import co.trendly.scraping.ResultadoScraping;
import io.github.resilience4j.core.IntervalFunction;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;

/**
 * Reintentos de una captura con Resilience4j (SCRUM-45): esperas de 2, 4 y 8 s, es decir, el intento inicial y 3
 * reintentos. Solo para lo pasajero (timeout, 5xx y 429): reintentar un 404 o un 403 no cambia nada y solo insiste
 * ante el sitio. Las esperas bloquean el hilo del ciclo, que corre en segundo plano.
 */
@Component
public class CapturaConReintentos {

    static final int INTENTOS_MAXIMOS = 4;

    /** Lo que devolvió el scraper en su último intento y cuántos intentos hizo. */
    public record Captura(ResultadoScraping resultado, int intentos) {
    }

    private final Retry reintentos;

    @Autowired
    public CapturaConReintentos(@Value("${recoleccion.espera-reintento-ms}") long esperaInicialMs) {
        this(esperas(esperaInicialMs));
    }

    /** Cada espera dura el doble que la anterior. */
    static IntervalFunction esperas(long esperaInicialMs) {
        return IntervalFunction.ofExponentialBackoff(Duration.ofMillis(esperaInicialMs), 2);
    }

    CapturaConReintentos(IntervalFunction esperas) {
        this.reintentos = Retry.of("captura", RetryConfig.<ResultadoScraping>custom()
                .maxAttempts(INTENTOS_MAXIMOS)
                .intervalFunction(esperas)
                .retryOnResult(ResultadoScraping::reintentable)
                .retryOnException(e -> false)
                .build());
    }

    public Captura capturar(MarketplaceScraper scraper, Monitoreo monitoreo) {
        AtomicInteger intentos = new AtomicInteger();
        ResultadoScraping resultado = Retry.decorateSupplier(reintentos, () -> {
            intentos.incrementAndGet();
            return scraper.obtener(monitoreo);
        }).get();
        return new Captura(resultado, intentos.get());
    }
}
