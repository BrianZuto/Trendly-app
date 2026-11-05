package co.trendly.notificacion;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Notificaciones push (SCRUM-52).
 *
 * @param habilitado  {@code false} = no se envía nada y las alertas quedan pendientes (las pruebas lo usan)
 * @param url         endpoint de la Expo Push API
 * @param accessToken token de acceso de Expo, solo si el proyecto activó "enhanced push security"; vacío = sin él
 */
@ConfigurationProperties("trendly.push")
public record PushProperties(boolean habilitado, String url, String accessToken) {

    public boolean conAccessToken() {
        return accessToken != null && !accessToken.isBlank();
    }
}
