package co.trendly.scraping;

import java.util.List;

/**
 * Resultado de una captura (SCRUM-40).
 *
 * @param estado         OK o FALLO
 * @param publicaciones  lo capturado; vacía si falló
 * @param tipoFallo      solo si falló; son los mismos tipos de la tabla {@code incidencia_scraping}
 * @param motivo         solo si falló; explicación para la incidencia
 * @param reintentable   si falló por algo pasajero (timeout, 5xx o 429) y vale la pena reintentar (SCRUM-45)
 */
public record ResultadoScraping(Estado estado, List<PublicacionCapturada> publicaciones, TipoFallo tipoFallo,
        String motivo, boolean reintentable) {

    public enum Estado {
        OK,
        FALLO
    }

    public ResultadoScraping {
        publicaciones = List.copyOf(publicaciones);
    }

    public static ResultadoScraping ok(List<PublicacionCapturada> publicaciones) {
        return new ResultadoScraping(Estado.OK, publicaciones, null, null, false);
    }

    public static ResultadoScraping fallo(TipoFallo tipo, String motivo) {
        return new ResultadoScraping(Estado.FALLO, List.of(), tipo, motivo, tipo == TipoFallo.TIMEOUT);
    }

    public static ResultadoScraping fallo(FalloDeScraping fallo) {
        return new ResultadoScraping(Estado.FALLO, List.of(), fallo.getTipo(), fallo.getMessage(), fallo.isReintentable());
    }

    public boolean esOk() {
        return estado == Estado.OK;
    }
}
