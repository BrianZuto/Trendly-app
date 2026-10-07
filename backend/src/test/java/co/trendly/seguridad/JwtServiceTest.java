package co.trendly.seguridad;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import java.util.Date;

import org.junit.jupiter.api.Test;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

class JwtServiceTest {

    private static final String SECRETO = Base64.getEncoder()
            .encodeToString("clave-de-prueba-de-trendly-con-mas-de-32-bytes".getBytes());
    private static final String OTRO_SECRETO = Base64.getEncoder()
            .encodeToString("otra-clave-distinta-de-trendly-con-mas-de-32-bytes".getBytes());
    private static final long UNA_HORA_MS = 3_600_000;

    private final UsuarioAutenticado vendedor = new UsuarioAutenticado(7L, "vendedor@trendly.co", "VENDEDOR");
    private final JwtService jwtService = new JwtService(new JwtProperties(SECRETO, UNA_HORA_MS));

    @Test
    void generaUnTokenQueSeValidaConLosMismosDatos() {
        String token = jwtService.generarToken(vendedor);

        assertThat(jwtService.validarToken(token)).contains(vendedor);
    }

    @Test
    void elTokenLlevaIdRolEmisorYVenceEnUnaHora() {
        Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRETO)))
                .build()
                .parseSignedClaims(jwtService.generarToken(vendedor))
                .getPayload();

        assertThat(claims.getSubject()).isEqualTo("7");
        assertThat(claims.get("rol", String.class)).isEqualTo("VENDEDOR");
        assertThat(claims.get("email", String.class)).isEqualTo("vendedor@trendly.co");
        assertThat(claims.getIssuer()).isEqualTo("trendly");
        assertThat(claims.getExpiration().getTime() - claims.getIssuedAt().getTime()).isEqualTo(UNA_HORA_MS);
        assertThat(jwtService.getVigenciaMs()).isEqualTo(UNA_HORA_MS);
    }

    @Test
    void rechazaUnTokenVencido() {
        JwtService yaVencido = new JwtService(new JwtProperties(SECRETO, -1_000));

        assertThat(jwtService.validarToken(yaVencido.generarToken(vendedor))).isEmpty();
    }

    @Test
    void rechazaUnTokenFirmadoConOtraClave() {
        JwtService otraClave = new JwtService(new JwtProperties(OTRO_SECRETO, UNA_HORA_MS));

        assertThat(jwtService.validarToken(otraClave.generarToken(vendedor))).isEmpty();
    }

    @Test
    void rechazaUnTokenDeOtroEmisor() {
        String token = Jwts.builder()
                .issuer("otro-sistema")
                .subject("7")
                .expiration(new Date(System.currentTimeMillis() + UNA_HORA_MS))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRETO)))
                .compact();

        assertThat(jwtService.validarToken(token)).isEmpty();
    }

    @Test
    void rechazaTokensVaciosOMalFormados() {
        assertThat(jwtService.validarToken(null)).isEmpty();
        assertThat(jwtService.validarToken("  ")).isEmpty();
        assertThat(jwtService.validarToken("esto.no.es-un-jwt")).isEmpty();
    }

    @Test
    void fallaAlArrancarSiElSecretoFaltaOEsInvalido() {
        assertThatThrownBy(() -> new JwtService(new JwtProperties(null, UNA_HORA_MS)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
        assertThatThrownBy(() -> new JwtService(new JwtProperties("no es base64 !!", UNA_HORA_MS)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Base64");
        assertThatThrownBy(() -> new JwtService(new JwtProperties(Base64.getEncoder().encodeToString("corta".getBytes()), UNA_HORA_MS)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("256 bits");
    }
}
