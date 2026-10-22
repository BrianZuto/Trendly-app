package co.trendly.recoleccion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import co.trendly.monitoreo.Marketplace;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.aliexpress.AliExpressScraper;
import co.trendly.scraping.mercadolibre.MercadoLibreScraper;

/**
 * Job de recolección de punta a punta (SCRUM-39): endpoint interno con API key, ciclo en segundo plano, histórico
 * real y H2 con Flyway. Los scrapers se simulan para no salir a internet. Sin {@code @Transactional}: el ciclo corre
 * en otro hilo y tiene que ver los datos ya guardados; por eso cada prueba borra lo suyo al final.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "recoleccion.api-key=clave-de-prueba")
class RecoleccionIntegracionTest {

    private static final String RUTA = "/api/v1/interno/recoleccion/ejecutar";
    private static final String CLAVE = "clave-de-prueba";

    @MockitoBean
    private MercadoLibreScraper mercadoLibre;

    @MockitoBean
    private AliExpressScraper aliExpress;

    @Autowired
    private RecoleccionService recoleccion;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private long producto;

    @BeforeEach
    void preparar() {
        when(mercadoLibre.marketplace()).thenReturn(Marketplace.MERCADOLIBRE);
        when(aliExpress.marketplace()).thenReturn(Marketplace.ALIEXPRESS);
        when(mercadoLibre.obtener(any())).thenReturn(ResultadoScraping.ok(List.of(
                new PublicacionCapturada("MCO-111", "Audífonos", "Tienda", null, new BigDecimal("89900"), "COP", true))));
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Job', 'job@trendly.co', 'h', 1)");
        long usuario = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'job@trendly.co'", Long.class);
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'JOB-1', 50000, 99900, 30)""", usuario);
        producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, usuario);
    }

    @AfterEach
    void limpiar() {
        // La BD borra en cascada monitoreos e histórico
        jdbc.update("DELETE FROM usuario WHERE email = 'job@trendly.co'");
    }

    @Test
    void sinApiKeyOConUnaIncorrectaResponde401SinPedirToken() throws Exception {
        mockMvc.perform(post(RUTA))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(RecoleccionController.API_KEY_INVALIDA));
        mockMvc.perform(post(RUTA).header("X-Api-Key", "otra-clave"))
                .andExpect(status().isUnauthorized());
        verify(mercadoLibre, times(0)).obtener(any());
    }

    @Test
    void procesaSoloLosActivosVencidosYGuardaElHistorico() throws Exception {
        long vencido = monitoreo("MCO1", "ACTIVO", Instant.now().minus(1, ChronoUnit.HOURS));
        long pausado = monitoreo("MCO2", "PAUSADO", Instant.now().minus(1, ChronoUnit.HOURS));
        long futuro = monitoreo("MCO3", "ACTIVO", Instant.now().plus(2, ChronoUnit.HOURS));

        disparar().andExpect(status().isAccepted()).andExpect(jsonPath("$.estado").value("INICIADO"));
        esperarFin();

        assertThat(puntos(vencido)).isEqualTo(1);
        assertThat(puntos(pausado)).isZero();
        assertThat(puntos(futuro)).isZero();
        Map<String, Object> fila = jdbc.queryForMap(
                "SELECT proxima_ejecucion, ultima_captura, fallos_consecutivos FROM monitoreo WHERE id = ?", vencido);
        Instant proxima = ((Timestamp) fila.get("proxima_ejecucion")).toInstant();
        assertThat(Duration.between(Instant.now(), proxima)).isBetween(Duration.ofHours(5), Duration.ofHours(6));
        // La última captura que puso el histórico no se pierde al reprogramar
        assertThat(fila.get("ultima_captura")).isNotNull();
        assertThat(fila.get("fallos_consecutivos")).isEqualTo(0);
        verify(mercadoLibre, times(1)).obtener(any());
    }

    @Test
    void dosDisparosSeguidosNoProcesanDosVecesElMismoMonitoreo() throws Exception {
        monitoreo("MCO1", "ACTIVO", Instant.now().minus(1, ChronoUnit.HOURS));
        monitoreo("MCO2", "ACTIVO", Instant.now().minus(1, ChronoUnit.HOURS));
        when(mercadoLibre.obtener(any())).thenAnswer(i -> {
            Thread.sleep(300); // captura lenta: el segundo disparo llega con el ciclo en curso
            return ResultadoScraping.ok(List.of(
                    new PublicacionCapturada("MCO-1", "x", null, null, new BigDecimal("1000"), "COP", true)));
        });

        disparar().andExpect(status().isAccepted());
        disparar().andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("EN_CURSO"));
        esperarFin();
        // Un tercer disparo, ya terminado el primero, no encuentra nada vencido
        disparar().andExpect(status().isAccepted());
        esperarFin();

        verify(mercadoLibre, times(2)).obtener(any());
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM historico_precio h JOIN monitoreo m ON m.id = h.monitoreo_id
                WHERE m.producto_id = ?""", Integer.class, producto)).isEqualTo(2);
    }

    @Test
    void unaCapturaFallidaSumaUnFalloYQuedaReprogramada() throws Exception {
        long id = monitoreo("MCO1", "ACTIVO", Instant.now().minus(1, ChronoUnit.HOURS));
        when(mercadoLibre.obtener(any())).thenReturn(
                ResultadoScraping.fallo(co.trendly.scraping.TipoFallo.BLOQUEO, "La API respondió 403"));

        disparar().andExpect(status().isAccepted());
        esperarFin();

        assertThat(jdbc.queryForObject("SELECT fallos_consecutivos FROM monitoreo WHERE id = ?", Integer.class, id))
                .isEqualTo(1);
        assertThat(puntos(id)).isZero();
    }

    private ResultActions disparar() throws Exception {
        return mockMvc.perform(post(RUTA).header("X-Api-Key", CLAVE));
    }

    private void esperarFin() throws InterruptedException {
        long limite = System.currentTimeMillis() + 10_000;
        while (recoleccion.estaEnEjecucion() && System.currentTimeMillis() < limite) {
            Thread.sleep(20);
        }
        assertThat(recoleccion.estaEnEjecucion()).as("el ciclo debía terminar").isFalse();
    }

    private long monitoreo(String idProducto, String estado, Instant proxima) {
        String url = "https://www.mercadolibre.com.co/x/p/" + idProducto;
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, id_publicacion, marketplace, frecuencia_horas, estado,
                    proxima_ejecucion) VALUES (?, 'URL', ?, ?, 'MERCADOLIBRE', 6, ?, ?)""",
                producto, url, idProducto.replace("MCO", "MCO-"), estado, Timestamp.from(proxima));
        return jdbc.queryForObject("SELECT id FROM monitoreo WHERE valor = ?", Long.class, url);
    }

    private int puntos(long monitoreo) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM historico_precio WHERE monitoreo_id = ?", Integer.class, monitoreo);
    }
}
