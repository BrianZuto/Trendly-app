package co.trendly.notificacion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Cuerpo de {@code POST /api/v1/usuarios/me/dispositivos}.
 *
 * @param token      token de Expo Push, p. ej. {@code ExponentPushToken[xxxxxxxx]}
 * @param plataforma {@code IOS} o {@code ANDROID}
 */
public record DispositivoRequest(
        @NotBlank(message = "El token es obligatorio")
        @Pattern(regexp = TOKEN_EXPO, message = MENSAJE_TOKEN)
        String token,
        @NotBlank(message = "La plataforma es obligatoria")
        @Pattern(regexp = "IOS|ANDROID", message = "La plataforma debe ser IOS o ANDROID")
        String plataforma) {

    /** Sin cuantificadores anidados: la validación es lineal en el tamaño del token. */
    static final String TOKEN_EXPO = "Expo(nent)?PushToken\\[[A-Za-z0-9_-]{1,180}]";
    static final String MENSAJE_TOKEN = "El token no es un token de Expo Push válido";
}
