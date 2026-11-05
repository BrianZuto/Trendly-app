package co.trendly.reporte;

import org.springframework.http.HttpStatus;

import co.trendly.comun.ErrorDeNegocio;

/** Formatos de descarga del reporte (SCRUM-50). */
public enum FormatoReporte {
    XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
    PDF("application/pdf", "pdf");

    static final String MENSAJE_INVALIDO = "El formato debe ser xlsx o pdf";

    private final String tipoContenido;
    private final String extension;

    FormatoReporte(String tipoContenido, String extension) {
        this.tipoContenido = tipoContenido;
        this.extension = extension;
    }

    static FormatoReporte de(String formato) {
        for (FormatoReporte candidato : values()) {
            if (candidato.extension.equalsIgnoreCase(formato == null ? "" : formato.trim())) {
                return candidato;
            }
        }
        throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, MENSAJE_INVALIDO);
    }

    public String tipoContenido() {
        return tipoContenido;
    }

    public String extension() {
        return extension;
    }
}
