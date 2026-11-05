package co.trendly.monitoreo;

/** Marketplaces soportados. Se guardan como texto en la columna {@code monitoreo.marketplace}. */
public enum Marketplace {
    MERCADOLIBRE("COP"),
    ALIEXPRESS("USD");

    private final String monedaEsperada;

    Marketplace(String monedaEsperada) {
        this.monedaEsperada = monedaEsperada;
    }

    /** Moneda en la que deben llegar los precios; otra indica un dato malo (SCRUM-45). */
    public String monedaEsperada() {
        return monedaEsperada;
    }
}
