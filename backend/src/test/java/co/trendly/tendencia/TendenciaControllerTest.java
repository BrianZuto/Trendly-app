package co.trendly.tendencia;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/** {@code GET /api/v1/tendencias} de punta a punta (SCRUM-53). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TendenciaControllerTest {

    private static final String RUTA = "/api/v1/tendencias";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private long vendedor;
    private long producto;
    private long busqueda;
    private final Instant ahora = Instant.now().truncatedTo(ChronoUnit.SECONDS).minusSeconds(60);
    private final Instant cicloAnterior = ahora.minus(Duration.ofHours(6));

    @BeforeEach
    void preparar() {
        vendedor = crearVendedor("ana@correo.co");
        producto = crearProducto(vendedor, "Audífonos", "30000");
        busqueda = crearMonitoreo(producto, "PALABRA_CLAVE", "audifonos bluetooth", "MERCADOLIBRE");

        // Primero en las dos capturas, con margen del 50 % y solo 2 vendedores
        captura(busqueda, "MCO-1", "Audífonos Pro", 1, "60000", 2, true, cicloAnterior);
        captura(busqueda, "MCO-9", "Audífonos Pro", 1, "60000", 2, true, ahora); // la mejor oferta cambió de vendedor
        // Segundo, pero solo en la última captura, con poco margen y mucha competencia
        captura(busqueda, "MCO-2", "Audífonos Lite", 2, "40000", 20, true, ahora);
        // Fuera del ranking: ya no sale en la búsqueda, no tiene stock o no se sabe cuántos vendedores tiene
        captura(busqueda, "MCO-3", "Audífonos Viejos", 2, "50000", 3, true, cicloAnterior);
        captura(busqueda, "MCO-4", "Audífonos Agotados", 3, "50000", 3, false, ahora);
        captura(busqueda, "MCO-5", "Audífonos Sin Dato", 4, "50000", null, true, ahora);
    }

    @Test
    void ordenaPorPuntajeYMuestraLasTresVariables() throws Exception {
        consultar(vendedor)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                // 0,4 × 100 + 0,3 × 50 + 0,3 × (100 − 10) = 82
                .andExpect(jsonPath("$[0].posicion").value(1))
                .andExpect(jsonPath("$[0].titulo").value("Audífonos Pro"))
                .andExpect(jsonPath("$[0].publicacionId").value("MCO-9"))
                .andExpect(jsonPath("$[0].palabraClave").value("audifonos bluetooth"))
                .andExpect(jsonPath("$[0].productoId").value(producto))
                .andExpect(jsonPath("$[0].precioVenta").value(60000.0))
                .andExpect(jsonPath("$[0].costo").value(30000.0))
                .andExpect(jsonPath("$[0].vendedores").value(2))
                .andExpect(jsonPath("$[0].posicionBusqueda").value(1.0))
                .andExpect(jsonPath("$[0].demanda").value(100.0))
                .andExpect(jsonPath("$[0].margen").value(50.0))
                .andExpect(jsonPath("$[0].competencia").value(10.0))
                .andExpect(jsonPath("$[0].puntaje").value(82.0))
                // 0,4 × 45 + 0,3 × 25 + 0,3 × (100 − 100) = 25,5
                .andExpect(jsonPath("$[1].posicion").value(2))
                .andExpect(jsonPath("$[1].titulo").value("Audífonos Lite"))
                .andExpect(jsonPath("$[1].demanda").value(45.0))
                .andExpect(jsonPath("$[1].margen").value(25.0))
                .andExpect(jsonPath("$[1].competencia").value(100.0))
                .andExpect(jsonPath("$[1].puntaje").value(25.5));
    }

    @Test
    void elCostoSaleDeAliExpressSiElProductoLoVigila() throws Exception {
        long proveedor = crearMonitoreo(producto, "URL", "https://es.aliexpress.com/item/1005006150134970.html", "ALIEXPRESS");
        captura(proveedor, "1005006150134970", "Wireless earbuds", null, "24000", null, true, ahora);

        // (60.000 − 24.000) / 60.000 = 60 % → 0,4 × 100 + 0,3 × 60 + 0,3 × 90 = 85
        consultar(vendedor)
                .andExpect(jsonPath("$[0].costo").value(24000.0))
                .andExpect(jsonPath("$[0].margen").value(60.0))
                .andExpect(jsonPath("$[0].puntaje").value(85.0));
    }

    @Test
    void unProductoRepetidoEnDosBusquedasSaleUnaVezConSuMejorPuntaje() throws Exception {
        long otroProducto = crearProducto(vendedor, "Audífonos baratos", "45000");
        long otraBusqueda = crearMonitoreo(otroProducto, "PALABRA_CLAVE", "audifonos", "MERCADOLIBRE");
        captura(otraBusqueda, "MCO-9", "Audífonos Pro", 1, "60000", 2, true, ahora);

        consultar(vendedor)
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].titulo").value("Audífonos Pro"))
                .andExpect(jsonPath("$[0].productoId").value(producto))
                .andExpect(jsonPath("$[0].puntaje").value(82.0));
    }

    @Test
    void topLimitaElRankingYCadaVendedorVeSoloElSuyo() throws Exception {
        mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token(vendedor)).param("top", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titulo").value("Audífonos Pro"));
        mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token(vendedor)).param("top", "muchos"))
                .andExpect(status().isBadRequest());

        consultar(crearVendedor("beto@correo.co")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get(RUTA)).andExpect(status().isUnauthorized());
    }

    private ResultActions consultar(long usuarioId) throws Exception {
        return mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token(usuarioId)));
    }

    private long crearVendedor(String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Prueba', ?, 'hash', 1)", email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private long crearProducto(long usuarioId, String nombre, String costo) {
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, costo, precio_venta, margen_objetivo)
                VALUES (?, ?, ?, 66000, 30)""", usuarioId, nombre, new BigDecimal(costo));
        return jdbc.queryForObject("SELECT MAX(id) FROM producto", Long.class);
    }

    private long crearMonitoreo(long productoId, String tipo, String valor, String marketplace) {
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, marketplace, frecuencia_horas, estado)
                VALUES (?, ?, ?, ?, 6, 'ACTIVO')""", productoId, tipo, valor, marketplace);
        return jdbc.queryForObject("SELECT MAX(id) FROM monitoreo", Long.class);
    }

    private void captura(long monitoreoId, String publicacion, String titulo, Integer posicion, String precio,
            Integer vendedores, boolean disponible, Instant cuando) {
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, titulo, vendedor, posicion, precio, moneda,
                    precio_cop, disponible, fuente, capturado_en, vendedores)
                VALUES (?, ?, ?, 'Tienda', ?, ?, 'COP', ?, ?, 'MERCADOLIBRE', ?, ?)""",
                monitoreoId, publicacion, titulo, posicion, new BigDecimal(precio), new BigDecimal(precio), disponible,
                Timestamp.from(cuando), vendedores);
    }

    private String token(long usuarioId) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuarioId, "ana@correo.co", "VENDEDOR"));
    }
}
