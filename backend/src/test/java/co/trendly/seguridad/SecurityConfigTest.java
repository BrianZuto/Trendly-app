package co.trendly.seguridad;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest
@AutoConfigureMockMvc
@Import(SecurityConfigTest.RutasDePrueba.class)
class SecurityConfigTest {

    private static final String FRONTEND_LOCAL = "http://localhost:5173";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Endpoints mínimos para probar las reglas mientras no existan los controladores reales. */
    @RestController
    static class RutasDePrueba {

        @GetMapping("/api/v1/auth/prueba")
        String publica() {
            return "publica";
        }

        @GetMapping("/api/v1/prueba")
        String protegida() {
            return "protegida";
        }

        @GetMapping("/api/v1/admin/prueba")
        String soloAdmin() {
            return "admin";
        }
    }

    private String bearer(String rol) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(1L, "usuario@trendly.co", rol));
    }

    @Test
    void lasRutasDeAuthYHealthSonPublicas() throws Exception {
        mockMvc.perform(get("/api/v1/auth/prueba")).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void sinTokenRespondeUn401EnJson() throws Exception {
        mockMvc.perform(get("/api/v1/prueba"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(SecurityConfig.MENSAJE_401))
                .andExpect(jsonPath("$.path").value("/api/v1/prueba"));
    }

    @Test
    void meExigeToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void conTokenInvalidoOVencidoRespondeUn401() throws Exception {
        mockMvc.perform(get("/api/v1/prueba").header(HttpHeaders.AUTHORIZATION, "Bearer token-falso"))
                .andExpect(status().isUnauthorized());

        JwtService vencido = new JwtService(new JwtProperties(
                "dHJlbmRseS1jbGF2ZS1zb2xvLXBhcmEtcHJ1ZWJhcy1uby11c2FyLWVuLXByb2R1Y2Npb24tMTIzNDU2Nzg5MA==", -1_000));
        String tokenVencido = vencido.generarToken(new UsuarioAutenticado(1L, "usuario@trendly.co", "VENDEDOR"));
        mockMvc.perform(get("/api/v1/prueba").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenVencido))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void conTokenValidoEntraALasRutasProtegidas() throws Exception {
        mockMvc.perform(get("/api/v1/prueba").header(HttpHeaders.AUTHORIZATION, bearer("VENDEDOR")))
                .andExpect(status().isOk())
                .andExpect(content().string("protegida"));
    }

    @Test
    void unVendedorRecibe403EnRutasDeAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/prueba").header(HttpHeaders.AUTHORIZATION, bearer("VENDEDOR")))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value(SecurityConfig.MENSAJE_403));
    }

    @Test
    void unAdminEntraALasRutasDeAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/prueba").header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void corsPermiteElFrontendYRechazaOtrosOrigenes() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, FRONTEND_LOCAL)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, FRONTEND_LOCAL));

        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, "https://sitio-malicioso.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void lasContrasenasSeCifranConBCrypt() {
        String hash = passwordEncoder.encode("Trendly123");

        assertThat(hash).startsWith("$2");
        assertThat(passwordEncoder.matches("Trendly123", hash)).isTrue();
        assertThat(passwordEncoder.matches("otra", hash)).isFalse();
    }
}
