package co.trendly.scraping;

/** Error al traer una página. Los scrapers lo convierten en {@link ResultadoScraping#fallo}. */
public class FalloDeScraping extends Exception {

    private final TipoFallo tipo;

    public FalloDeScraping(TipoFallo tipo, String motivo) {
        super(motivo);
        this.tipo = tipo;
    }

    public FalloDeScraping(TipoFallo tipo, String motivo, Throwable causa) {
        super(motivo, causa);
        this.tipo = tipo;
    }

    public TipoFallo getTipo() {
        return tipo;
    }
}
