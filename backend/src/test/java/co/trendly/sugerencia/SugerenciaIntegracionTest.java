package co.trendly.sugerencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/** El endpoint de la sugerencia y las comisiones, con H2 y Flyway. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SugerenciaIntegracionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    @PersistenceContext
    private EntityManager entidades;

    private String token;
    private long usuario;
    private long producto;
    private final Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);

    @BeforeEach
    void preparar() {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Ana', 'ana@s.co', 'h', 1)");
        usuario = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'ana@s.co'", Long.class);
        token = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuario, "ana@s.co", "VENDEDOR"));
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'AUD', 50000, 120000, 30)""", usuario);
        producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, usuario);
    }

    private ResultActions consultar() throws Exception {
        return mockMvc.perform(get("/api/v1/productos/" + producto + "/sugerencia").header(HttpHeaders.AUTHORIZATION, token));
    }

    private long monitoreo(String valor, String marketplace, String estado) {
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, marketplace, top_n, frecuencia_horas, estado)
                VALUES (?, 'PALABRA_CLAVE', ?, ?, 5, 6, ?)""", producto, valor, marketplace, estado);
        return jdbc.queryForObject("SELECT id FROM monitoreo WHERE producto_id = ? AND valor = ?", Long.class, producto, valor);
    }

    private void punto(long monitoreo, String publicacion, long precio, boolean disponible, Instant cuando) {
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, precio, moneda, precio_cop, disponible, capturado_en)
                VALUES (?, ?, ?, 'COP', ?, ?, ?)""", monitoreo, publicacion, precio, precio, disponible, Timestamp.from(cuando));
    }

    private int filasDeSugerencia() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM sugerencia_precio WHERE producto_id = ?", Integer.class, producto);
    }

    @Test
    void conSuficienteHistoricoDevuelveElSugeridoElMargenYLaPosicion() throws Exception {
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-A", 150000, true, ahora.minus(6, ChronoUnit.HOURS));
        punto(id, "MCO-A", 130000, true, ahora);
        punto(id, "MCO-B", 100000, true, ahora);
        punto(id, "MCO-C", 160000, true, ahora);

        consultar().andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CALCULADA"))
                .andExpect(jsonPath("$.precioSugerido").value(99000.0))
                .andExpect(jsonPath("$.margenResultante").value(34.49))
                .andExpect(jsonPath("$.posicion").value("EN_RANGO"))
                .andExpect(jsonPath("$.competitivo").value(true))
                .andExpect(jsonPath("$.precioMinimoRentable").value(90909.10))
                .andExpect(jsonPath("$.minimoCompetencia").value(100000.0))
                .andExpect(jsonPath("$.promedioCompetencia").value(130000.0))
                .andExpect(jsonPath("$.medianaCompetencia").value(130000.0));
    }

    @Test
    void conUnaSolaCapturaQuedaPendienteAunqueTraigaVariasPublicaciones() throws Exception {
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-A", 130000, true, ahora);
        punto(id, "MCO-B", 100000, true, ahora);

        consultar().andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.precioSugerido").doesNotExist());
    }

    @Test
    void lasCapturasDeHaceMasDeSieteDiasNoCuentan() throws Exception {
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-A", 130000, true, ahora.minus(8, ChronoUnit.DAYS));
        punto(id, "MCO-A", 120000, true, ahora);

        consultar().andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    @Test
    void sinCompetidoresQuedaPendiente() throws Exception {
        consultar().andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    @Test
    void siTodoEstaAgotadoQuedaPendiente() throws Exception {
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-A", 130000, false, ahora.minus(6, ChronoUnit.HOURS));
        punto(id, "MCO-A", 130000, false, ahora);

        consultar().andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    @Test
    void noCuentaLoPausadoNiLoAgotadoNiLoQueYaNoSalioEnLaUltimaCaptura() throws Exception {
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-VIEJA", 95000, true, ahora.minus(6, ChronoUnit.HOURS));
        punto(id, "MCO-AGOTADA", 96000, false, ahora);
        punto(id, "MCO-A", 140000, true, ahora);
        long pausado = monitoreo("otra", "MERCADOLIBRE", "PAUSADO");
        punto(pausado, "MCO-PAUSADA", 97000, true, ahora);

        consultar().andExpect(jsonPath("$.minimoCompetencia").value(140000.0));
    }

    @Test
    void usaLaComisionDelMarketplaceDeLaPublicacionMasBarata() throws Exception {
        long ml = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(ml, "MCO-A", 150000, true, ahora.minus(6, ChronoUnit.HOURS));
        punto(ml, "MCO-A", 150000, true, ahora);
        long ali = monitoreo("buds ali", "ALIEXPRESS", "ACTIVO");
        punto(ali, "1", 100000, true, ahora);

        // 50.000 ÷ (1 − 0,30 − 0,08) = 80.645,16… con la comisión de AliExpress (8 %)
        consultar().andExpect(jsonPath("$.precioMinimoRentable").value(80645.17));
    }

    @Test
    void siElResultadoNoCambiaNoAgregaOtraFila() throws Exception {
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-A", 150000, true, ahora.minus(6, ChronoUnit.HOURS));
        punto(id, "MCO-A", 100000, true, ahora);

        consultar();
        consultar();
        assertThat(filasDeSugerencia()).isEqualTo(1);
    }

    @Test
    void siCambiaElCostoDelProductoLaConsultaYaLoRefleja() throws Exception {
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-A", 150000, true, ahora.minus(6, ChronoUnit.HOURS));
        punto(id, "MCO-A", 100000, true, ahora);
        consultar().andExpect(jsonPath("$.competitivo").value(true));

        jdbc.update("UPDATE producto SET costo = 90000 WHERE id = ?", producto);
        entidades.flush();
        entidades.clear();

        consultar().andExpect(jsonPath("$.competitivo").value(false));
        assertThat(filasDeSugerencia()).isEqualTo(2);
    }

    @Test
    void unProductoAjenoResponde404() throws Exception {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Eva', 'eva@s.co', 'h', 1)");
        long eva = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'eva@s.co'", Long.class);
        String tokenEva = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(eva, "eva@s.co", "VENDEDOR"));

        mockMvc.perform(get("/api/v1/productos/" + producto + "/sugerencia").header(HttpHeaders.AUTHORIZATION, tokenEva))
                .andExpect(status().isNotFound());
    }

    @Test
    void sinTokenResponde401() throws Exception {
        mockMvc.perform(get("/api/v1/productos/" + producto + "/sugerencia")).andExpect(status().isUnauthorized());
    }

    @Test
    void elAdministradorCambiaLaComisionYSeUsaEnElCalculo() throws Exception {
        String admin = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(1L, "admin@trendly.co", "ADMIN"));
        mockMvc.perform(put("/api/v1/admin/comisiones/MERCADOLIBRE").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"comisionPct\": 20}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comisionPct").value(20));
        long id = monitoreo("buds", "MERCADOLIBRE", "ACTIVO");
        punto(id, "MCO-A", 150000, true, ahora.minus(6, ChronoUnit.HOURS));
        punto(id, "MCO-A", 100000, true, ahora);

        // 50.000 ÷ (1 − 0,30 − 0,20) = 100.000
        consultar().andExpect(jsonPath("$.precioMinimoRentable").value(100000.0));
    }

    @Test
    void unaComisionFueraDeRangoResponde400() throws Exception {
        String admin = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(1L, "admin@trendly.co", "ADMIN"));
        mockMvc.perform(put("/api/v1/admin/comisiones/MERCADOLIBRE").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"comisionPct\": 100}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unVendedorNoPuedeVerNiCambiarComisiones() throws Exception {
        mockMvc.perform(get("/api/v1/admin/comisiones").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/admin/comisiones/MERCADOLIBRE").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"comisionPct\": 1}"))
                .andExpect(status().isForbidden());
    }
}
