package co.trendly.scraping;

/** Por qué falló una captura. Son los valores del CHECK de {@code incidencia_scraping.tipo}. */
public enum TipoFallo {
    /** El sitio no respondió a tiempo o hubo un error de red. */
    TIMEOUT,
    /** El sitio respondió con 403/429 o con una página de verificación (captcha). */
    BLOQUEO,
    /** La publicación no existe o ya no está publicada. */
    NO_ENCONTRADO,
    /** La página cambió y no se encontraron los datos donde se esperaban. */
    ESTRUCTURA,
    /** Los datos están, pero no sirven (precio vacío, cero o negativo). */
    DATO_INVALIDO
}
