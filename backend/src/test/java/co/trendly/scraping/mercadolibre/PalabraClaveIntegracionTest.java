package co.trendly.scraping.mercadolibre;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.historico.HistoricoService;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.MonitoreoRequest;
import co.trendly.monitoreo.MonitoreoResponse;
import co.trendly.monitoreo.MonitoreoService;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;

/**
 * Monitoreo por palabra clave de punta a punta (SCRUM-37): se crea con el servicio real, el scraper de MercadoLibre
 * lee las respuestas reales de la API guardadas como fixtures, y cada resultado queda en el histórico (SCRUM-42)
 * ligado al monitoreo, con su publicación y su posición. H2 con las migraciones de Flyway.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PalabraClaveIntegracionTest {

    @Autowired
    private MonitoreoService monitoreoService;

    @Autowired
    private MonitoreoRepository monitoreoRepo;

    @Autowired
    private HistoricoService historicoService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void cadaResultadoDeLaBusquedaQuedaEnElHistoricoConSuPublicacionYPosicion() throws Exception {
        long vendedor = crearVendedor();
        long producto = crearProducto(vendedor);
        MonitoreoResponse creado = monitoreoService.crear(vendedor, producto,
                new MonitoreoRequest("PALABRA_CLAVE", "redmi buds", "MERCADOLIBRE", 3, null));
        Monitoreo monitoreo = monitoreoRepo.findById(creado.id()).orElseThrow();

        ResultadoScraping resultado = scraper().obtener(monitoreo);
        int guardados = historicoService.guardar(monitoreo, resultado);

        assertThat(guardados).isEqualTo(3);
        List<Map<String, Object>> filas = jdbc.queryForList("""
                SELECT publicacion_id, posicion, precio_cop, moneda, fuente, titulo FROM historico_precio
                WHERE monitoreo_id = ? ORDER BY posicion""", monitoreo.getId());
        assertThat(filas).extracting(f -> f.get("publicacion_id"), f -> f.get("posicion"))
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("MCO-2245703081", 1),
                        org.assertj.core.groups.Tuple.tuple("MCO-4443245004", 2),
                        org.assertj.core.groups.Tuple.tuple("MCO-2210402643", 3));
        assertThat(filas.getFirst()).containsEntry("moneda", "COP").containsEntry("fuente", "MERCADOLIBRE")
                .containsEntry("titulo", "Redmi Buds 8 Green");
        assertThat(((Number) filas.getFirst().get("precio_cop")).intValue()).isEqualTo(173990);
        assertThat(monitoreoRepo.findById(monitoreo.getId()).orElseThrow().getUltimaCaptura()).isNotNull();

        // Si el ciclo corre otra vez enseguida, no se duplican los puntos
        assertThat(historicoService.guardar(monitoreo, scraper().obtener(monitoreo))).isZero();

        // El dueño ve los 3 puntos en el API del histórico
        String token = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(vendedor, "v@trendly.co", "VENDEDOR"));
        mockMvc.perform(get("/api/v1/monitoreos/" + monitoreo.getId() + "/historico")
                        .header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void unaBusquedaSinOfertasNoDejaPuntosEnElHistorico() {
        long vendedor = crearVendedor();
        MonitoreoResponse creado = monitoreoService.crear(vendedor, crearProducto(vendedor),
                new MonitoreoRequest("PALABRA_CLAVE", "audífonos bluetooth", "MERCADOLIBRE", 5, null));
        Monitoreo monitoreo = monitoreoRepo.findById(creado.id()).orElseThrow();

        ResultadoScraping resultado = scraper().obtener(monitoreo);

        assertThat(resultado.esOk()).isFalse();
        assertThat(historicoService.guardar(monitoreo, resultado)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM historico_precio WHERE monitoreo_id = ?", Integer.class,
                monitoreo.getId())).isZero();
    }

    private static MercadoLibreScraper scraper() {
        RateLimiter libre = RateLimiter.of("libre", RateLimiterConfig.custom()
                .limitForPeriod(1_000).limitRefreshPeriod(Duration.ofSeconds(1)).timeoutDuration(Duration.ZERO).build());
        return new MercadoLibreScraper(MercadoLibreScraperTest::responder, libre);
    }

    private long crearVendedor() {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Vendedor', 'v@trendly.co', 'h', 1)");
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'v@trendly.co'", Long.class);
    }

    private long crearProducto(long vendedor) {
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'SKU-1', 50000, 89900, 30)""", vendedor);
        return jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, vendedor);
    }
}
