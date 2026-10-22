package co.trendly.scraping;

import java.util.List;

/**
 * Resultado de una captura (SCRUM-40).
 *
 * @param estado         OK o FALLO
 * @param publicaciones  lo capturado; vacía si falló
 * @param tipoFallo      solo si falló; son los mismos tipos de la tabla {@code incidencia_scraping}
 * @param motivo         solo si falló; explicación para la incidencia
 */
public record ResultadoScraping(Estado estado, List<PublicacionCapturada> publicaciones, TipoFallo tipoFallo,
        String motivo) {

    public enum Estado {
        OK,
        FALLO
    }

    public ResultadoScraping {
        publicaciones = List.copyOf(publicaciones);
    }

    public static ResultadoScraping ok(List<PublicacionCapturada> publicaciones) {
        return new ResultadoScraping(Estado.OK, publicaciones, null, null);
    }

    public static ResultadoScraping fallo(TipoFallo tipo, String motivo) {
        return new ResultadoScraping(Estado.FALLO, List.of(), tipo, motivo);
    }

    public boolean esOk() {
        return estado == Estado.OK;
    }
}
