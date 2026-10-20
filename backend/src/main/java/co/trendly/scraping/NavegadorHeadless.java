package co.trendly.scraping;

import java.net.URI;
import java.time.Duration;

import org.openqa.selenium.By;
import org.openqa.selenium.Cookie;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebDriverException;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Chrome headless con Selenium (SCRUM-41). Solo para AliExpress: su página de producto llega vacía y el precio
 * lo pone JavaScript. Cada llamada abre y cierra su propio Chrome; es lento (unos segundos), pero el job corre
 * cada 6 h y con 1 petición cada 2 s, así que no importa. Selenium Manager descarga el chromedriver correcto.
 *
 * <p>Requiere Chrome instalado en el servidor. Se apaga con {@code scraping.selenium-habilitado=false}.
 */
@Component
@ConditionalOnProperty(name = "scraping.selenium-habilitado", havingValue = "true")
public class NavegadorHeadless implements FuenteHtml {

    /** Lo que se espera en la página ya renderizada: el JSON-LD del producto o la pantalla de verificación. */
    private static final By LISTO = By.cssSelector("script[type='application/ld+json'], #nc_1_n1z, .baxia-punish");
    private final ScrapingProperties propiedades;

    public NavegadorHeadless(ScrapingProperties propiedades) {
        this.propiedades = propiedades;
    }

    @Override
    public String obtener(String url, String cookies) throws FalloDeScraping {
        WebDriver chrome = null;
        try {
            chrome = new ChromeDriver(opciones());
            chrome.manage().timeouts().pageLoadTimeout(Duration.ofMillis(propiedades.timeoutMs()));
            if (cookies != null && !cookies.isBlank()) {
                ponerCookies(chrome, url, cookies);
            }
            chrome.get(url);
            try {
                new WebDriverWait(chrome, Duration.ofMillis(propiedades.timeoutMs()))
                        .until(d -> !d.findElements(LISTO).isEmpty());
            } catch (TimeoutException e) {
                // Sin JSON-LD a tiempo: se devuelve lo que haya y el parser dirá si cambió la estructura
            }
            return chrome.getPageSource();
        } catch (TimeoutException e) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "La página no cargó en " + propiedades.timeoutMs() + " ms", e);
        } catch (WebDriverException e) {
            throw new FalloDeScraping(TipoFallo.TIMEOUT, "No se pudo abrir Chrome headless: " + primeraLinea(e), e);
        } finally {
            if (chrome != null) {
                chrome.quit();
            }
        }
    }

    private ChromeOptions opciones() {
        ChromeOptions opciones = new ChromeOptions();
        opciones.addArguments("--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
                "--window-size=1366,900", "--lang=es-CO", "--user-agent=" + propiedades.userAgent());
        return opciones;
    }

    /**
     * Las cookies solo se pueden poner estando en el dominio: primero se abre una página liviana del sitio.
     * Van para el dominio padre ({@code .aliexpress.com}, no solo {@code es.aliexpress.com}), que es donde las lee
     * el sitio.
     */
    private static void ponerCookies(WebDriver chrome, String url, String cookies) {
        URI uri = URI.create(url);
        chrome.get(uri.getScheme() + "://" + uri.getHost() + "/robots.txt");
        String dominio = dominioPadre(uri.getHost());
        for (String par : cookies.split(";")) {
            String[] partes = par.trim().split("=", 2);
            if (partes.length == 2) {
                chrome.manage().addCookie(new Cookie.Builder(partes[0], partes[1]).domain(dominio).path("/").build());
            }
        }
    }

    /** {@code es.aliexpress.com} → {@code .aliexpress.com}. */
    static String dominioPadre(String host) {
        int punto = host.indexOf('.');
        return host.chars().filter(c -> c == '.').count() > 1 ? host.substring(punto) : "." + host;
    }

    private static String primeraLinea(Exception e) {
        String mensaje = String.valueOf(e.getMessage());
        int salto = mensaje.indexOf('\n');
        return salto < 0 ? mensaje : mensaje.substring(0, salto);
    }
}
