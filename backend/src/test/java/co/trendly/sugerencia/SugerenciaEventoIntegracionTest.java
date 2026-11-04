package co.trendly.sugerencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import co.trendly.historico.HistoricoService;
import co.trendly.monitoreo.Marketplace;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;

/** De punta a punta y sin transacción de prueba: el evento solo llega al listener después de un commit real. */
@SpringBootTest
class SugerenciaEventoIntegracionTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private HistoricoService historico;

    @Autowired
    private MonitoreoRepository monitoreos;

    @AfterEach
    void limpiar() {
        jdbc.update("DELETE FROM usuario WHERE email = 'evento@s.co'");
    }

    @Test
    void guardarUnPrecioNuevoDejaLaSugerenciaCalculada() {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Ana', 'evento@s.co', 'h', 1)");
        long usuario = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'evento@s.co'", Long.class);
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'EVT', 50000, 120000, 30)""", usuario);
        long producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, usuario);
        Monitoreo monitoreo = monitoreos.save(Monitoreo.porPalabraClave(producto, "buds", Marketplace.MERCADOLIBRE, 5, 6));
        // Captura anterior, fuera de la ventana anti duplicados de una hora
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, precio, moneda, precio_cop, disponible, capturado_en)
                VALUES (?, 'MCO-A', 150000, 'COP', 150000, TRUE, DATEADD('HOUR', -6, CURRENT_TIMESTAMP))""", monitoreo.getId());

        assertThat(historico.guardar(monitoreo, ResultadoScraping.ok(List.of(publicacion())))).isEqualTo(1);

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> assertThat(jdbc.queryForObject(
                "SELECT precio_sugerido FROM sugerencia_precio WHERE producto_id = ? AND estado = 'CALCULADA'",
                BigDecimal.class, producto)).isEqualByComparingTo("99000"));
    }

    private static PublicacionCapturada publicacion() {
        return new PublicacionCapturada("MCO-A", "Audífonos", "Tienda", 1, new BigDecimal("100000"), "COP", true);
    }
}
