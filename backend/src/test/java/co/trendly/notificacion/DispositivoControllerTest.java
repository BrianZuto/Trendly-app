package co.trendly.notificacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/** Registro de celulares y preferencia de notificaciones push (SCRUM-52), con JWT, H2 y Flyway. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DispositivoControllerTest {

    private static final String RUTA = "/api/v1/usuarios/me/dispositivos";
    private static final String TOKEN = "ExponentPushToken[abc123_XYZ-9]";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private DispositivoPushRepository dispositivos;

    private long idAna;
    private long idBeto;
    private String ana;
    private String beto;

    @BeforeEach
    void preparar() {
        idAna = crearVendedor("ana@push.co");
        idBeto = crearVendedor("beto@push.co");
        ana = token(idAna);
        beto = token(idBeto);
    }

    @Test
    void registrarElCelularLoGuardaYRepetirloNoLoDuplica() throws Exception {
        registrar(ana, TOKEN, "IOS").andExpect(status().isNoContent());
        registrar(ana, TOKEN, "IOS").andExpect(status().isNoContent());

        assertThat(celulares()).containsExactly(idAna + " " + TOKEN + " IOS");
    }

    @Test
    void siOtroVendedorIniciaSesionEnElMismoCelularElTokenPasaASerSuyo() throws Exception {
        registrar(ana, TOKEN, "ANDROID");
        registrar(beto, TOKEN, "ANDROID").andExpect(status().isNoContent());

        assertThat(celulares()).containsExactly(idBeto + " " + TOKEN + " ANDROID");
    }

    @Test
    void rechazaTokensQueNoSonDeExpoYPlataformasDesconocidas() throws Exception {
        registrar(ana, "abc", "IOS")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(DispositivoRequest.MENSAJE_FORMATO));
        registrar(ana, TOKEN, "WINDOWS")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La plataforma debe ser IOS o ANDROID"));
        mockMvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"" + TOKEN + "\", \"plataforma\": \"IOS\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(celulares()).isEmpty();
    }

    @Test
    void alCerrarSesionSeQuitaElCelularPeroSoloSuDuenoPuedeQuitarlo() throws Exception {
        registrar(ana, TOKEN, "IOS");

        quitar(beto, TOKEN).andExpect(status().isNoContent());
        assertThat(celulares()).hasSize(1);

        quitar(ana, TOKEN).andExpect(status().isNoContent());
        assertThat(celulares()).isEmpty();
    }

    @Test
    void elVendedorPuedeDesactivarLasNotificacionesPushSinTocarLoDemas() throws Exception {
        String reglas = "/api/v1/usuarios/me/reglas-alerta";
        mockMvc.perform(get(reglas).header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(jsonPath("$.recibirPush").value(true));

        mockMvc.perform(put(reglas).header(HttpHeaders.AUTHORIZATION, ana).contentType(MediaType.APPLICATION_JSON)
                .content("{\"umbralPct\": 8, \"avisarDisponibilidad\": true, \"recibirCorreos\": true, \"recibirPush\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recibirPush").value(false));

        // La web no envía recibirPush: se conserva lo que eligió en la app
        mockMvc.perform(put(reglas).header(HttpHeaders.AUTHORIZATION, ana).contentType(MediaType.APPLICATION_JSON)
                .content("{\"umbralPct\": 10, \"avisarDisponibilidad\": true, \"recibirCorreos\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recibirPush").value(false))
                .andExpect(jsonPath("$.recibirCorreos").value(false));
    }

    private ResultActions registrar(String usuario, String token, String plataforma) throws Exception {
        return mockMvc.perform(post(RUTA).header(HttpHeaders.AUTHORIZATION, usuario).contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"" + token + "\", \"plataforma\": \"" + plataforma + "\"}"));
    }

    private ResultActions quitar(String usuario, String token) throws Exception {
        return mockMvc.perform(delete(RUTA).param("token", token).header(HttpHeaders.AUTHORIZATION, usuario));
    }

    /** Por JPA y no por SQL directo: así Hibernate escribe los cambios pendientes de la transacción antes de leer. */
    private List<String> celulares() {
        return dispositivos.findByUsuarioIdIn(List.of(idAna, idBeto)).stream()
                .map(d -> d.getUsuarioId() + " " + d.getToken() + " " + d.getPlataforma()).toList();
    }

    private long crearVendedor(String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Prueba', ?, 'hash', 1)", email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private String token(long usuarioId) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuarioId, "x@correo.co", "VENDEDOR"));
    }
}
