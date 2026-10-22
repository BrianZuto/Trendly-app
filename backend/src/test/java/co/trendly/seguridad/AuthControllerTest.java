package co.trendly.seguridad;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/** Prueba de integración de {@code POST /api/v1/auth/login} y {@code GET /api/v1/auth/me} con H2 y Flyway (SCRUM-31). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    private static final String LOGIN = "/api/v1/auth/login";
    private static final String ME = "/api/v1/auth/me";
    private static final String CONTRASENA = "Secreta123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void crearUsuarios() {
        crearUsuario("vendedor@trendly.co", true);
        crearUsuario("inactivo@trendly.co", false);
    }

    @Test
    void unLoginCorrectoDevuelveUnTokenConElIdYElRol() throws Exception {
        String respuesta = login("vendedor@trendly.co", CONTRASENA)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.expiraEnSegundos").value(3600))
                .andReturn().getResponse().getContentAsString();

        String token = JsonPath.read(respuesta, "$.token");
        UsuarioAutenticado usuario = jwtService.validarToken(token).orElseThrow();
        assertThat(usuario.id()).isEqualTo(idDe("vendedor@trendly.co"));
        assertThat(usuario.email()).isEqualTo("vendedor@trendly.co");
        assertThat(usuario.rol()).isEqualTo("VENDEDOR");
    }

    @Test
    void elEmailNoDistingueMayusculasNiEspacios() throws Exception {
        login("  Vendedor@Trendly.CO ", CONTRASENA).andExpect(status().isOk());
    }

    @Test
    void elAdministradorInicialPuedeIniciarSesionComoAdmin() throws Exception {
        String respuesta = login("admin@trendly.co", "Trendly123")
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String token = JsonPath.read(respuesta, "$.token");
        assertThat(jwtService.validarToken(token).orElseThrow().rol()).isEqualTo("ADMIN");
    }

    @Test
    void unaContrasenaIncorrectaResponde401() throws Exception {
        login("vendedor@trendly.co", "Incorrecta123")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(CredencialesInvalidasException.MENSAJE));
    }

    @Test
    void unEmailInexistenteRespondeLoMismoQueUnaContrasenaIncorrecta() throws Exception {
        login("nadie@trendly.co", CONTRASENA)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(CredencialesInvalidasException.MENSAJE));
    }

    @Test
    void unaCuentaInactivaNoPuedeIniciarSesion() throws Exception {
        login("inactivo@trendly.co", CONTRASENA)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(CredencialesInvalidasException.MENSAJE));
    }

    @Test
    void sinEmailOContrasenaResponde400() throws Exception {
        login("", "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("El email es obligatorio. La contraseña es obligatoria"));
    }

    @Test
    void conElTokenDelLoginMeDevuelveLosDatosDelUsuario() throws Exception {
        String respuesta = login("vendedor@trendly.co", CONTRASENA).andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(respuesta, "$.token");

        mockMvc.perform(get(ME).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(idDe("vendedor@trendly.co")))
                .andExpect(jsonPath("$.nombre").value("Vendedor de prueba"))
                .andExpect(jsonPath("$.email").value("vendedor@trendly.co"))
                .andExpect(jsonPath("$.rol").value("VENDEDOR"))
                .andExpect(jsonPath("$.plan.nombre").value("Gratuito"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void meResponde401SiElUsuarioDelTokenYaNoExiste() throws Exception {
        String token = jwtService.generarToken(new UsuarioAutenticado(999_999L, "borrado@trendly.co", "VENDEDOR"));

        mockMvc.perform(get(ME).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SecurityConfig.MENSAJE_401));
    }

    @Test
    void meResponde401SiLaCuentaFueDesactivada() throws Exception {
        String token = jwtService.generarToken(
                new UsuarioAutenticado(idDe("inactivo@trendly.co"), "inactivo@trendly.co", "VENDEDOR"));

        mockMvc.perform(get(ME).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post(LOGIN)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "password": "%s"}""".formatted(email, password)));
    }

    private void crearUsuario(String email, boolean activo) {
        jdbc.update("""
                INSERT INTO usuario (nombre, email, password_hash, rol, acepta_politica_datos, plan_id, activo)
                VALUES ('Vendedor de prueba', ?, ?, 'VENDEDOR', TRUE, 1, ?)""",
                email, passwordEncoder.encode(CONTRASENA), activo);
    }

    private long idDe(String email) {
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }
}
