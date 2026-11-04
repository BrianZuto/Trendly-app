package co.trendly.alerta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import co.trendly.historico.HistoricoService;
import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/** De punta a punta, sin transacción de prueba: el análisis solo arranca después de un commit real. */
@SpringBootTest
@AutoConfigureMockMvc
class AlertaIntegracionTest {

    private static final String EMAIL = "alertas@a.co";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private HistoricoService historico;

    @Autowired
    private MonitoreoRepository monitoreos;

    private String token;
    private long otroProducto;
    private Monitoreo monitoreo;

    @BeforeEach
    void preparar() {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Ana', ?, 'h', 1)", EMAIL);
        long usuario = jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, EMAIL);
        token = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuario, EMAIL, "VENDEDOR"));
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'ALE', 50000, 120000, 30)""", usuario);
        long producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, usuario);
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Centinela', 'CEN', 50000, 120000, 30)""", usuario);
        otroProducto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ? AND sku = 'CEN'", Long.class, usuario);
        monitoreo = monitoreos.save(Monitoreo.porPalabraClave(producto, "buds", Marketplace.MERCADOLIBRE, 5, 6));
    }

    @AfterEach
    void limpiar() {
        jdbc.update("DELETE FROM usuario WHERE email = ?", EMAIL);
    }

    private void capturaAnterior(String publicacion, long precio, boolean disponible) {
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, precio, moneda, precio_cop, disponible, capturado_en)
                VALUES (?, ?, ?, 'COP', ?, ?, DATEADD('HOUR', -6, CURRENT_TIMESTAMP))""",
                monitoreo.getId(), publicacion, precio, precio, disponible);
    }

    private static PublicacionCapturada publicacion(String id, long precio, boolean disponible) {
        return new PublicacionCapturada(id, "Audífonos", "Tienda", 1, BigDecimal.valueOf(precio), "COP", disponible);
    }

    private void capturar(PublicacionCapturada... publicaciones) {
        historico.guardar(monitoreo, ResultadoScraping.ok(List.of(publicaciones)));
    }

    /**
     * El análisis corre en una cola de un solo hilo: cuando aparece la alerta de esta captura de otro producto (siempre
     * la genera), ya terminó todo lo anterior. Así también se puede afirmar que algo NO creó alerta.
     */
    private void esperarAnalisis() {
        Monitoreo centinela = monitoreos.save(Monitoreo.porPalabraClave(otroProducto, "centinela", Marketplace.MERCADOLIBRE, 5, 6));
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, precio, moneda, precio_cop, disponible, capturado_en)
                VALUES (?, 'MCO-Z', 100000, 'COP', 100000, TRUE, DATEADD('HOUR', -6, CURRENT_TIMESTAMP))""", centinela.getId());
        historico.guardar(centinela, ResultadoScraping.ok(List.of(publicacion("MCO-Z", 50000, true))));
        await().atMost(Duration.ofSeconds(10)).until(() -> jdbc.queryForObject(
                "SELECT COUNT(*) FROM alerta WHERE monitoreo_id = ?", Integer.class, centinela.getId()) > 0);
    }

    private List<Map<String, Object>> alertas() {
        return jdbc.queryForList("SELECT * FROM alerta WHERE monitoreo_id = ?", monitoreo.getId());
    }

    @Test
    void unaBajaSobreElUmbralCreaLaAlertaConElPrecioSugerido() {
        capturaAnterior("MCO-A", 100000, true);

        capturar(publicacion("MCO-A", 95000, true));
        esperarAnalisis();

        assertThat(alertas()).singleElement().satisfies(a -> {
            assertThat(a).containsEntry("TIPO", "BAJA_PRECIO").containsEntry("RELEVANCIA", "NORMAL")
                    .containsEntry("ESTADO", "NUEVA").containsEntry("PUBLICACION_ID", "MCO-A");
            assertThat((BigDecimal) a.get("PRECIO_ANTERIOR")).isEqualByComparingTo("100000");
            assertThat((BigDecimal) a.get("PRECIO_NUEVO")).isEqualByComparingTo("95000");
            assertThat((BigDecimal) a.get("VARIACION_PCT")).isEqualByComparingTo("-5");
            // 95.000 × 0,99 con el mínimo rentable de 90.909,10
            assertThat((BigDecimal) a.get("PRECIO_SUGERIDO")).isEqualByComparingTo("94050");
        });
    }

    @Test
    void porDebajoDelUmbralNoCreaAlerta() {
        capturaAnterior("MCO-A", 100000, true);

        capturar(publicacion("MCO-A", 96000, true));
        esperarAnalisis();

        assertThat(alertas()).isEmpty();
    }

    @Test
    void variosCambiosEnLaMismaCapturaDejanUnaSolaAlerta() {
        capturaAnterior("MCO-A", 100000, true);
        capturaAnterior("MCO-B", 100000, true);
        capturaAnterior("MCO-C", 100000, true);

        capturar(publicacion("MCO-A", 94000, true), publicacion("MCO-B", 80000, true), publicacion("MCO-C", 100000, false));
        esperarAnalisis();

        assertThat(alertas()).singleElement().satisfies(a -> assertThat(a).containsEntry("PUBLICACION_ID", "MCO-B")
                .containsEntry("RELEVANCIA", "ALTA"));
    }

    @Test
    void elVendedorCambiaSuUmbralYSeAplicaEnLaSiguienteCaptura() throws Exception {
        mockMvc.perform(put("/api/v1/usuarios/me/reglas-alerta").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"umbralPct\": 20, \"avisarDisponibilidad\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.umbralPct").value(20));
        capturaAnterior("MCO-A", 100000, true);
        capturaAnterior("MCO-B", 100000, true);

        capturar(publicacion("MCO-A", 85000, true), publicacion("MCO-B", 100000, false));
        esperarAnalisis();

        assertThat(alertas()).isEmpty();
    }

    @Test
    void sinConfigurarLasReglasUsaLosValoresPorDefecto() throws Exception {
        mockMvc.perform(get("/api/v1/usuarios/me/reglas-alerta").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.umbralPct").value(5.0))
                .andExpect(jsonPath("$.avisarDisponibilidad").value(true));
    }

    @Test
    void unUmbralFueraDeRangoResponde400() throws Exception {
        mockMvc.perform(put("/api/v1/usuarios/me/reglas-alerta").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"umbralPct\": 0, \"avisarDisponibilidad\": true}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void lasReglasExigenToken() throws Exception {
        mockMvc.perform(get("/api/v1/usuarios/me/reglas-alerta")).andExpect(status().isUnauthorized());
    }
}
