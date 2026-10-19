package co.trendly.seguridad;

import java.util.Date;
import java.util.Optional;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Genera y valida los JWT de Trendly (firmados con HMAC-SHA).
 * El token lleva el id del usuario en "sub", su email y su rol, y vence según {@code jwt.expiration-ms}.
 */
@Service
public class JwtService {

    static final String EMISOR = "trendly";
    static final String CLAIM_EMAIL = "email";
    static final String CLAIM_ROL = "rol";

    private static final int BYTES_MINIMOS_CLAVE = 32;

    private final SecretKey clave;
    private final long vigenciaMs;

    public JwtService(JwtProperties propiedades) {
        this.clave = crearClave(propiedades.secret());
        this.vigenciaMs = propiedades.expirationMs();
    }

    public String generarToken(UsuarioAutenticado usuario) {
        Date ahora = new Date();
        return Jwts.builder()
                .issuer(EMISOR)
                .subject(String.valueOf(usuario.id()))
                .claim(CLAIM_EMAIL, usuario.email())
                .claim(CLAIM_ROL, usuario.rol())
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + vigenciaMs))
                .signWith(clave)
                .compact();
    }

    /**
     * Devuelve el usuario del token, o vacío si el token está vencido, mal formado o con firma inválida.
     */
    public Optional<UsuarioAutenticado> validarToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(clave)
                    .requireIssuer(EMISOR)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(new UsuarioAutenticado(
                    Long.valueOf(claims.getSubject()),
                    claims.get(CLAIM_EMAIL, String.class),
                    claims.get(CLAIM_ROL, String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public long getVigenciaMs() {
        return vigenciaMs;
    }

    private static SecretKey crearClave(String secretoBase64) {
        if (secretoBase64 == null || secretoBase64.isBlank()) {
            throw new IllegalStateException("Falta la variable de entorno JWT_SECRET");
        }
        byte[] bytes;
        try {
            bytes = Decoders.BASE64.decode(secretoBase64.trim());
        } catch (RuntimeException e) {
            throw new IllegalStateException("JWT_SECRET debe estar en Base64 (openssl rand -base64 64)", e);
        }
        if (bytes.length < BYTES_MINIMOS_CLAVE) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 256 bits (32 bytes)");
        }
        return Keys.hmacShaKeyFor(bytes);
    }
}
