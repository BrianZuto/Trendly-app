package co.trendly.seguridad;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración del JWT, leída de las propiedades {@code jwt.*}.
 *
 * @param secret       clave HMAC en Base64 (mínimo 256 bits); viene de la variable JWT_SECRET
 * @param expirationMs vigencia del token en milisegundos (por defecto, 1 hora)
 */
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(String secret, long expirationMs) {
}
