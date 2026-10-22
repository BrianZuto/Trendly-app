package co.trendly.monitoreo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/** Prueba de integración de los competidores por URL con JWT, H2 y las migraciones de Flyway (SCRUM-36). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MonitoreoControllerTest {

    private static final String URL_ML = "https://articulo.mercadolibre.com.co/MCO-123456789-audifonos-_JM";
    private static final String URL_ALI = "https://es.aliexpress.com/item/1005001234567890.html";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private String ana;
    private String beto;
    private long productoDeAna;

    @BeforeEach
    void preparar() {
        long idAna = crearVendedor("ana@correo.co");
        ana = token(idAna);
        beto = token(crearVendedor("beto@correo.co"));
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'SKU-1', 50000, 89900, 30)""", idAna);
        productoDeAna = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, idAna);
    }

    @Test
    void unaUrlDeMercadoLibreODeAliExpressCreaElMonitoreo() throws Exception {
        crear(ana, URL_ML)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.productoId").value(productoDeAna))
                .andExpect(jsonPath("$.tipo").value("URL"))
                .andExpect(jsonPath("$.valor").value(URL_ML))
                .andExpect(jsonPath("$.marketplace").value("MERCADOLIBRE"))
                .andExpect(jsonPath("$.idPublicacion").value("MCO-123456789"))
                .andExpect(jsonPath("$.frecuenciaHoras").value(6))
                .andExpect(jsonPath("$.estado").value("ACTIVO"))
                .andExpect(jsonPath("$.proximaEjecucion").isNotEmpty());
        crear(ana, URL_ALI)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.marketplace").value("ALIEXPRESS"))
                .andExpect(jsonPath("$.idPublicacion").value("1005001234567890"));

        mockMvc.perform(get(rutaMonitoreos(productoDeAna)).header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].marketplace").value("MERCADOLIBRE"))
                .andExpect(jsonPath("$[1].marketplace").value("ALIEXPRESS"));
    }

    @Test
    void unaUrlDeOtroSitioResponde400() throws Exception {
        crear(ana, "https://www.amazon.com/dp/B0ABCDEFGH")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(PublicacionUrl.MENSAJE_NO_SOPORTADO));
        crear(ana, "esto no es una url")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(PublicacionUrl.MENSAJE_URL_INVALIDA));
    }

    @Test
    void unCompetidorRepetidoResponde409AunqueLaUrlCambie() throws Exception {
        crear(ana, URL_ML).andExpect(status().isCreated());

        crear(ana, "https://articulo.mercadolibre.com.co/MCO-123456789-otro-titulo?tracking=1")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_REPETIDO));
    }

    @Test
    void unVendedorNoVeNiPausaNiBorraLosMonitoreosDeOtro() throws Exception {
        long id = idCreado(crear(ana, URL_ML));

        mockMvc.perform(get(rutaMonitoreos(productoDeAna)).header(HttpHeaders.AUTHORIZATION, beto))
                .andExpect(status().isNotFound());
        crear(beto, URL_ALI).andExpect(status().isNotFound());
        cambiarEstado(beto, id, "PAUSADO").andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/monitoreos/" + id).header(HttpHeaders.AUTHORIZATION, beto))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_NO_ENCONTRADO));

        assertThat(jdbc.queryForObject("SELECT estado FROM monitoreo WHERE id = ?", String.class, id))
                .isEqualTo("ACTIVO");
    }

    @Test
    void elDuenoPausaReactivaYElimina() throws Exception {
        long id = idCreado(crear(ana, URL_ML));

        cambiarEstado(ana, id, "PAUSADO").andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("PAUSADO"));
        cambiarEstado(ana, id, "ACTIVO").andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ACTIVO"));
        cambiarEstado(ana, id, "ERROR").andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/v1/monitoreos/" + id).header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM monitoreo WHERE id = ?", Integer.class, id)).isZero();
    }

    @Test
    void elPlanGratuitoNoPuedeCambiarLaFrecuencia() throws Exception {
        mockMvc.perform(post(rutaMonitoreos(productoDeAna)).header(HttpHeaders.AUTHORIZATION, ana)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\": \"URL\", \"valor\": \"%s\", \"frecuenciaHoras\": 2}".formatted(URL_ML)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_FRECUENCIA_PLAN));
    }

    @Test
    void sinTokenResponde401() throws Exception {
        mockMvc.perform(get(rutaMonitoreos(productoDeAna))).andExpect(status().isUnauthorized());
    }

    private long crearVendedor(String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Prueba', ?, 'hash', 1)",
                email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private String token(long usuarioId) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuarioId, "x@correo.co", "VENDEDOR"));
    }

    private static String rutaMonitoreos(long productoId) {
        return "/api/v1/productos/" + productoId + "/monitoreos";
    }

    private ResultActions crear(String token, String url) throws Exception {
        return mockMvc.perform(post(rutaMonitoreos(productoDeAna)).header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tipo\": \"URL\", \"valor\": \"%s\", \"frecuenciaHoras\": 6}".formatted(url)));
    }

    private ResultActions cambiarEstado(String token, long id, String estado) throws Exception {
        return mockMvc.perform(patch("/api/v1/monitoreos/" + id).header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\": \"%s\"}".formatted(estado)));
    }

    private static long idCreado(ResultActions resultado) throws Exception {
        String json = resultado.andReturn().getResponse().getContentAsString();
        return Long.parseLong(json.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
    }
}
