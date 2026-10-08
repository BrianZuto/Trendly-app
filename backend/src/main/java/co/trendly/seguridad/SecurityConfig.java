package co.trendly.seguridad;

import java.io.IOException;
import java.util.Base64;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/**
 * Seguridad del API: sin sesión (stateless), autenticación con JWT y permisos
 * por rol.
 * <ul>
 * <li>Públicas: {@code /api/v1/auth/**} (excepto {@code /api/v1/auth/me}) y
 * {@code /actuator/health}.</li>
 * <li>Solo ADMIN: {@code /api/v1/admin/**}.</li>
 * <li>Todo lo demás exige un token válido.</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

        static final String MENSAJE_401 = "Token vencido o ausente";
        static final String MENSAJE_403 = "No tienes permiso para realizar esta acción";

        @Bean
        SecurityFilterChain securityFilterChain(HttpSecurity http, JsonMapper jsonMapper)
                        throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .cors(Customizer.withDefaults())
                                .httpBasic(basic -> basic.disable())
                                .formLogin(form -> form.disable())
                                .logout(logout -> logout.disable())
                                .sessionManagement(
                                                sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(rutas -> rutas
                                                .requestMatchers("/api/v1/auth/me").authenticated()
                                                .requestMatchers("/api/v1/auth/**", "/actuator/health", "/error")
                                                .permitAll()
                                                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                                                .anyRequest().authenticated())
                                .exceptionHandling(errores -> errores
                                                .authenticationEntryPoint((request, response, e) -> escribirError(
                                                                jsonMapper, request, response, HttpStatus.UNAUTHORIZED,
                                                                MENSAJE_401))
                                                .accessDeniedHandler((request, response, e) -> escribirError(jsonMapper,
                                                                request, response, HttpStatus.FORBIDDEN, MENSAJE_403)))
                                .oauth2ResourceServer(recurso -> recurso
                                                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
                return http.build();
        }

        @Bean
        JwtDecoder jwtDecoder(@Value("${JWT_SECRET}") String secretoBase64) {
                byte[] bytesSecreto = Base64.getDecoder().decode(secretoBase64.trim());
                if (bytesSecreto.length < 32) {
                        throw new IllegalArgumentException("JWT_SECRET debe tener al menos 256 bits");
                }
                SecretKey clave = new SecretKeySpec(bytesSecreto, "HmacSHA256");
                return NimbusJwtDecoder.withSecretKey(clave).macAlgorithm(MacAlgorithm.HS256).build();
        }

        @Bean
        JwtAuthenticationConverter jwtAuthenticationConverter() {
                JwtAuthenticationConverter conversor = new JwtAuthenticationConverter();
                conversor.setPrincipalClaimName("id");
                conversor.setJwtGrantedAuthoritiesConverter(jwt -> {
                        String rol = jwt.getClaimAsString("rol");
                        return rol == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + rol));
                });
                return conversor;
        }

        @Bean
        PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        /**
         * Orígenes permitidos desde {@code cors.allowed-origins} (separados por comas;
         * admite patrones como
         * {@code https://trendly-*.vercel.app} para las vistas previas de Vercel).
         */
        @Bean
        CorsConfigurationSource corsConfigurationSource(@Value("${cors.allowed-origins}") List<String> origenes) {
                CorsConfiguration cors = new CorsConfiguration();
                cors.setAllowedOriginPatterns(origenes);
                cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
                cors.setMaxAge(3600L);
                UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
                fuente.registerCorsConfiguration("/**", cors);
                return fuente;
        }

        private static void escribirError(JsonMapper jsonMapper, HttpServletRequest request,
                        HttpServletResponse response, HttpStatus estado, String mensaje) throws IOException {
                response.setStatus(estado.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                jsonMapper.writeValue(response.getOutputStream(),
                                new RespuestaError(estado.value(), estado.getReasonPhrase(), mensaje,
                                                request.getRequestURI()));
        }
}
