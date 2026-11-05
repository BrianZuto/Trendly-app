package co.trendly.historico;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import co.trendly.monitoreo.Monitoreo;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;

/**
 * Valida cada publicación antes de guardarla (SCRUM-45), para que un dato malo no contamine el histórico ni genere
 * alertas falsas: campos obligatorios, precio mayor que 0, moneda esperada del marketplace y variación de máximo ±70 %
 * frente a la captura anterior de la misma publicación.
 *
 * <p>La variación se compara en la moneda original, no en pesos: así un cambio de la TRM no parece un cambio de precio.
 */
@Component
public class ValidadorCaptura {

    static final BigDecimal VARIACION_MAXIMA_PCT = BigDecimal.valueOf(70);
    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    /**
     * @param validas   las publicaciones que se pueden guardar
     * @param descartes el motivo de cada publicación descartada, para su incidencia
     */
    public record ValidacionCaptura(List<PublicacionCapturada> validas, List<String> descartes) {
    }

    private final HistoricoPrecioRepository historico;

    public ValidadorCaptura(HistoricoPrecioRepository historico) {
        this.historico = historico;
    }

    public ValidacionCaptura validar(Monitoreo monitoreo, ResultadoScraping resultado) {
        List<PublicacionCapturada> validas = new ArrayList<>();
        List<String> descartes = new ArrayList<>();
        for (PublicacionCapturada publicacion : resultado.publicaciones()) {
            String idPublicacion = publicacion.idPublicacion() != null ? publicacion.idPublicacion()
                    : monitoreo.getIdPublicacion();
            String problema = problemaDe(monitoreo, idPublicacion, publicacion);
            if (problema == null) {
                validas.add(publicacion);
            } else {
                descartes.add(idPublicacion == null ? problema : idPublicacion + ": " + problema);
            }
        }
        return new ValidacionCaptura(List.copyOf(validas), List.copyOf(descartes));
    }

    /** {@code null} si la publicación sirve. */
    private String problemaDe(Monitoreo monitoreo, String idPublicacion, PublicacionCapturada publicacion) {
        if (idPublicacion == null || idPublicacion.isBlank()) {
            return "Falta el identificador de la publicación";
        }
        if (publicacion.titulo() == null || publicacion.titulo().isBlank()) {
            return "Falta el título de la publicación";
        }
        if (publicacion.precio() == null || publicacion.precio().signum() <= 0) {
            return "El precio debe ser mayor que 0: " + publicacion.precio();
        }
        String esperada = monitoreo.getMarketplace().monedaEsperada();
        if (!esperada.equals(publicacion.moneda())) {
            return "La moneda debía ser " + esperada + " y llegó " + publicacion.moneda();
        }
        return historico.findFirstByMonitoreoIdAndPublicacionIdOrderByCapturadoEnDescIdDesc(monitoreo.getId(), idPublicacion)
                .filter(anterior -> esperada.equals(anterior.getMoneda()))
                .map(anterior -> variacionSospechosa(anterior.getPrecio(), publicacion.precio(), esperada))
                .orElse(null);
    }

    private static String variacionSospechosa(BigDecimal anterior, BigDecimal nuevo, String moneda) {
        BigDecimal variacion = nuevo.subtract(anterior).multiply(CIEN).divide(anterior, 2, RoundingMode.HALF_UP);
        if (variacion.abs().compareTo(VARIACION_MAXIMA_PCT) <= 0) {
            return null;
        }
        return "Precio sospechoso: variación de " + variacion + " % (de " + anterior + " a " + nuevo + " " + moneda + ")";
    }
}
