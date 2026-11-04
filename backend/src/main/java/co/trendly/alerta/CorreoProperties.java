package co.trendly.alerta;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Correo de alertas (SCRUM-48).
 *
 * @param remitente   dirección verificada en el SMTP; vacía = no se envían correos
 * @param frontendUrl base de los enlaces del correo
 */
@ConfigurationProperties("trendly.correo")
public record CorreoProperties(String remitente, String frontendUrl) {

    boolean habilitado() {
        return remitente != null && !remitente.isBlank();
    }
}
