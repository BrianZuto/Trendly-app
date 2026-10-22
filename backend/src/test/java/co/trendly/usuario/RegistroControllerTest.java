package co.trendly.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Prueba de integración de {@code POST /api/v1/auth/registro} con H2 y las migraciones de Flyway (SCRUM-30). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RegistroControllerTest {

    private static final String URL = "/api/v1/auth/registro";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void unRegistroValidoResponde201YGuardaLaContrasenaCifrada() throws Exception {
        registrar("Ana Pérez", "Ana@Correo.co", "Secreta123", "true")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nombre").value("Ana Pérez"))
                .andExpect(jsonPath("$.email").value("ana@correo.co"))
                .andExpect(jsonPath("$.rol").value("VENDEDOR"))
                .andExpect(jsonPath("$.plan.nombre").value("Gratuito"))
                .andExpect(jsonPath("$.plan.maxProductos").value(10))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        Map<String, Object> fila = jdbc.queryForMap("""
                SELECT u.password_hash, u.rol, u.acepta_politica_datos, u.fecha_aceptacion, p.nombre AS plan
                FROM usuario u JOIN plan p ON p.id = u.plan_id
                WHERE u.email = 'ana@correo.co'""");
        String hash = (String) fila.get("password_hash");
        assertThat(hash).isNotEqualTo("Secreta123").startsWith("$2");
        assertThat(passwordEncoder.matches("Secreta123", hash)).isTrue();
        assertThat(fila.get("rol")).isEqualTo("VENDEDOR");
        assertThat(fila.get("acepta_politica_datos")).isEqualTo(true);
        assertThat(fila.get("fecha_aceptacion")).isNotNull();
        assertThat(fila.get("plan")).isEqualTo("Gratuito");
    }

    @Test
    void unEmailRepetidoResponde409() throws Exception {
        registrar("Otro admin", "ADMIN@trendly.co", "Secreta123", "true")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(EmailYaRegistradoException.MENSAJE))
                .andExpect(jsonPath("$.path").value(URL));
    }

    @Test
    void sinAceptarLaPoliticaResponde400ConElMensaje() throws Exception {
        registrar("Ana", "ana@correo.co", "Secreta123", "false")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(RegistroRequest.MENSAJE_POLITICA));
        registrar("Ana", "ana@correo.co", "Secreta123", "null")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(RegistroRequest.MENSAJE_POLITICA));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM usuario WHERE email = 'ana@correo.co'", Integer.class))
                .isZero();
    }

    @Test
    void unaContrasenaDebilResponde400() throws Exception {
        for (String debil : new String[] {"Corta1", "soloLetrasLargas", "1234567890"}) {
            registrar("Ana", "ana@correo.co", debil, "true")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(RegistroRequest.MENSAJE_PASSWORD));
        }
    }

    @Test
    void unEmailInvalidoResponde400() throws Exception {
        registrar("Ana", "ana@correo", "Secreta123", "true")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Ingresa un email válido"));
    }

    @Test
    void variosErroresVanEnUnSoloMensaje() throws Exception {
        registrar("", "ana@correo.co", "corta", "false")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString(RegistroRequest.MENSAJE_POLITICA)))
                .andExpect(jsonPath("$.message", containsString("El nombre es obligatorio")))
                .andExpect(jsonPath("$.message", containsString(RegistroRequest.MENSAJE_PASSWORD)));
    }

    @Test
    void unCuerpoQueNoEsJsonResponde400() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{no es json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private ResultActions registrar(String nombre, String email, String password, String aceptaPolitica)
            throws Exception {
        String cuerpo = """
                {"nombre": "%s", "email": "%s", "password": "%s", "aceptaPolitica": %s}"""
                .formatted(nombre, email, password, aceptaPolitica);
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }
}
