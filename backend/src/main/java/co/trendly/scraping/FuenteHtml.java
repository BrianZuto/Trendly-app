package co.trendly.scraping;

/**
 * Trae el HTML de una URL. Hay dos: {@link FuenteHttp} (Jsoup, una petición simple) y
 * {@link NavegadorHeadless} (Chrome con Selenium, para páginas que arman los datos con JavaScript).
 * En las pruebas se reemplaza por fixtures guardados en {@code src/test/resources}.
 */
@FunctionalInterface
public interface FuenteHtml {

    /**
     * @param url     página a leer
     * @param cookies cookies a enviar, en formato {@code nombre=valor; nombre2=valor2} (puede ser vacío)
     * @throws FalloDeScraping con TIMEOUT, BLOQUEO o NO_ENCONTRADO según lo que respondió el sitio
     */
    String obtener(String url, String cookies) throws FalloDeScraping;
}
