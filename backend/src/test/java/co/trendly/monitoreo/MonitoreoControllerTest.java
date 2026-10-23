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

/**
 * Prueba de integración de los competidores por URL (SCRUM-36) y por palabra clave (SCRUM-37), con JWT, H2 y las
 * migraciones de Flyway.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MonitoreoControllerTest {

    private static final String URL_ML = "https://www.mercadolibre.com.co/audifonos-bluetooth/p/MCO123456789";
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

        crear(ana, "https://www.mercadolibre.com.co/otro-titulo/p/MCO123456789#position=3&wid=MCO999")
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
    void unaUrlDeMercadoLibreQueNoEsDeCatalogoResponde400() throws Exception {
        crear(ana, "https://articulo.mercadolibre.com.co/MCO-123456789-audifonos-_JM")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(PublicacionUrl.MENSAJE_SOLO_CATALOGO));
    }

    @Test
    void creaUnMonitoreoPorPalabraClaveConSuMarketplaceYTopN() throws Exception {
        crearPalabra(ana, "  audífonos   bluetooth ", "MERCADOLIBRE", 7)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo").value("PALABRA_CLAVE"))
                .andExpect(jsonPath("$.valor").value("audífonos bluetooth"))
                .andExpect(jsonPath("$.marketplace").value("MERCADOLIBRE"))
                .andExpect(jsonPath("$.topN").value(7))
                .andExpect(jsonPath("$.idPublicacion").doesNotExist())
                .andExpect(jsonPath("$.estado").value("ACTIVO"))
                .andExpect(jsonPath("$.frecuenciaHoras").value(6));

        assertThat(jdbc.queryForMap("SELECT tipo, valor, marketplace, top_n FROM monitoreo WHERE producto_id = ?",
                productoDeAna)).containsEntry("tipo", "PALABRA_CLAVE").containsEntry("top_n", 7);
    }

    @Test
    void sinTopNTomaCinco() throws Exception {
        mockMvc.perform(post(rutaMonitoreos(productoDeAna)).header(HttpHeaders.AUTHORIZATION, ana)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\": \"PALABRA_CLAVE\", \"valor\": \"redmi buds\", \"marketplace\": \"mercadolibre\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.topN").value(5));
    }

    @Test
    void unaPalabraClaveVaciaCortaOLargaResponde400() throws Exception {
        crearPalabra(ana, "   ", "MERCADOLIBRE", 5)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La URL o palabra clave es obligatoria"));
        crearPalabra(ana, "ab", "MERCADOLIBRE", 5)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_PALABRA_LARGO));
        crearPalabra(ana, "a".repeat(81), "MERCADOLIBRE", 5)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_PALABRA_LARGO));
    }

    @Test
    void laPalabraClaveExigeMarketplaceSoportadoYTopNValido() throws Exception {
        crearPalabra(ana, "redmi buds", null, 5)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_MARKETPLACE_OBLIGATORIO));
        crearPalabra(ana, "redmi buds", "AMAZON", 5)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(PublicacionUrl.MENSAJE_NO_SOPORTADO));
        crearPalabra(ana, "redmi buds", "ALIEXPRESS", 5)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_PALABRA_ALIEXPRESS));
        crearPalabra(ana, "redmi buds", "MERCADOLIBRE", 0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_TOP_N));
        crearPalabra(ana, "redmi buds", "MERCADOLIBRE", 11)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_TOP_N));
    }

    @Test
    void laMismaPalabraClaveEnElMismoProductoResponde409() throws Exception {
        crearPalabra(ana, "Redmi Buds", "MERCADOLIBRE", 5).andExpect(status().isCreated());

        crearPalabra(ana, "  redmi   buds ", "MERCADOLIBRE", 3)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(MonitoreoService.MENSAJE_PALABRA_REPETIDA));
    }

    @Test
    void lasPalabrasClaveSeListanJuntoALasUrls() throws Exception {
        crear(ana, URL_ML).andExpect(status().isCreated());
        crearPalabra(ana, "redmi buds", "MERCADOLIBRE", 3).andExpect(status().isCreated());

        mockMvc.perform(get(rutaMonitoreos(productoDeAna)).header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].tipo").value("PALABRA_CLAVE"))
                .andExpect(jsonPath("$[1].topN").value(3));
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

    private ResultActions crearPalabra(String token, String palabra, String marketplace, Integer topN)
            throws Exception {
        String json = "{\"tipo\": \"PALABRA_CLAVE\", \"valor\": \"%s\"%s%s}".formatted(palabra,
                marketplace == null ? "" : ", \"marketplace\": \"" + marketplace + "\"",
                topN == null ? "" : ", \"topN\": " + topN);
        return mockMvc.perform(post(rutaMonitoreos(productoDeAna)).header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
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
