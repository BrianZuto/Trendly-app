package co.trendly.notificacion;

import java.util.Map;

/**
 * Una notificación para un celular.
 *
 * @param token  token de Expo Push del celular
 * @param titulo primera línea, en negrita
 * @param cuerpo texto de la notificación
 * @param datos  lo que recibe la app al tocarla (p. ej. la ruta de la alerta)
 */
public record MensajePush(String token, String titulo, String cuerpo, Map<String, Object> datos) {
}
