package co.trendly.scraping;

/** Error al traer una página. Los scrapers lo convierten en {@link ResultadoScraping#fallo}. */
public class FalloDeScraping extends Exception {

    private final TipoFallo tipo;
    private final boolean reintentable;

    public FalloDeScraping(TipoFallo tipo, String motivo) {
        this(tipo, motivo, null);
    }

    public FalloDeScraping(TipoFallo tipo, String motivo, Throwable causa) {
        this(tipo, motivo, causa, tipo == TipoFallo.TIMEOUT);
    }

    private FalloDeScraping(TipoFallo tipo, String motivo, Throwable causa, boolean reintentable) {
        super(motivo, causa);
        this.tipo = tipo;
        this.reintentable = reintentable;
    }

    /** Respuesta HTTP de error. Solo vale la pena reintentar los 5xx y el 429 (SCRUM-45). */
    public static FalloDeScraping porEstadoHttp(TipoFallo tipo, int estado, String motivo, Throwable causa) {
        return new FalloDeScraping(tipo, motivo, causa, estado >= 500 || estado == 429);
    }

    public TipoFallo getTipo() {
        return tipo;
    }

    public boolean isReintentable() {
        return reintentable;
    }
}
