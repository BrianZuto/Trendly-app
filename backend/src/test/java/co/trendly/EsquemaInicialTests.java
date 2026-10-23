package co.trendly;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/** Verifica que las migraciones de Flyway (SCRUM-29) crean el esquema y los datos iniciales. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EsquemaInicialTests {

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void creaTodasLasTablas() {
		var tablas = jdbc.queryForList(
				"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", String.class);

		assertThat(tablas).contains("plan", "usuario", "producto", "monitoreo", "historico_precio",
				"sugerencia_precio", "alerta", "decision_precio", "incidencia_scraping");
	}

	@Test
	void cargaLosPlanesYElAdministrador() {
		assertThat(jdbc.queryForObject("SELECT max_productos FROM plan WHERE nombre = 'Gratuito'", Integer.class))
				.isEqualTo(10);
		assertThat(jdbc.queryForObject("SELECT max_productos FROM plan WHERE nombre = 'Pro'", Integer.class))
				.isEqualTo(100);
		assertThat(jdbc.queryForObject("SELECT rol FROM usuario WHERE email = 'admin@trendly.co'", String.class))
				.isEqualTo("ADMIN");
	}

	@Test
	void elEmailEsUnico() {
		assertThatThrownBy(() -> insertarUsuario("admin@trendly.co"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void elSkuEsUnicoPorVendedor() {
		long vendedor = insertarUsuario("vendedor@trendly.co");
		long otro = insertarUsuario("otro@trendly.co");
		insertarProducto(vendedor, "SKU-1");
		insertarProducto(otro, "SKU-1");

		assertThatThrownBy(() -> insertarProducto(vendedor, "SKU-1"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void elProductoExigeUnUsuarioExistente() {
		assertThatThrownBy(() -> insertarProducto(9999L, "SKU-X"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	private long insertarUsuario(String email) {
		jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Prueba', ?, 'hash', 1)", email);
		return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
	}

	private void insertarProducto(long usuarioId, String sku) {
		jdbc.update("""
				INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
				VALUES (?, 'Audífonos', ?, 50000, 89900, 30)""", usuarioId, sku);
	}

}
