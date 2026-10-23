package co.trendly.monitoreo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.transaction.annotation.Transactional;

import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/**
 * Lo que el frontend muestra de la competencia, con H2 y Flyway: las publicaciones vigentes de cada monitoreo con su
 * historial, el resumen por producto en la lista, y la reventa que se crea junto con el producto.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CompetenciaIntegracionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private String token;
    private long usuario;
    private long producto;

    @BeforeEach
    void preparar() {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Ana', 'ana@c.co', 'h', 1)");
        usuario = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'ana@c.co'", Long.class);
        token = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuario, "ana@c.co", "VENDEDOR"));
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'AUD', 50000, 99900, 30)""", usuario);
        producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, usuario);
    }

    @Test
    void laListaDeMonitoreosTraeLasPublicacionesVigentesConSuHistorial() throws Exception {
        long palabra = monitoreo("PALABRA_CLAVE", "redmi buds", "MERCADOLIBRE", "ACTIVO");
        Instant antes = Instant.now().minus(6, ChronoUnit.HOURS).truncatedTo(ChronoUnit.MICROS);
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);
        // Captura anterior: A y B. Última captura: A (bajó de precio) y C. B ya no está entre las primeras.
        punto(palabra, "MCO-A", 1, 180000, "COP", 180000, true, antes);
        punto(palabra, "MCO-B", 2, 120000, "COP", 120000, true, antes);
        punto(palabra, "MCO-A", 2, 173990, "COP", 173990, true, ahora);
        punto(palabra, "MCO-C", 1, 79900, "COP", 79900, false, ahora);
        long ali = monitoreo("URL", "https://es.aliexpress.com/item/1.html", "ALIEXPRESS", "ACTIVO");
        punto(ali, "1", null, 2.39, "USD", 7612.17, true, ahora);
        long sinCapturas = monitoreo("URL", "https://www.mercadolibre.com.co/x/p/MCO9", "MERCADOLIBRE", "ACTIVO");

        mockMvc.perform(get("/api/v1/productos/" + producto + "/monitoreos").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                // Palabra clave: solo las de la última captura, en orden de posición
                .andExpect(jsonPath("$[0].id").value(palabra))
                .andExpect(jsonPath("$[0].publicaciones.length()").value(2))
                .andExpect(jsonPath("$[0].publicaciones[0].idPublicacion").value("MCO-C"))
                .andExpect(jsonPath("$[0].publicaciones[0].posicion").value(1))
                .andExpect(jsonPath("$[0].publicaciones[0].disponible").value(false))
                .andExpect(jsonPath("$[0].publicaciones[1].idPublicacion").value("MCO-A"))
                .andExpect(jsonPath("$[0].publicaciones[1].precio").value(173990))
                .andExpect(jsonPath("$[0].publicaciones[1].historial.length()").value(2))
                .andExpect(jsonPath("$[0].publicaciones[1].historial[0].precio").value(180000))
                .andExpect(jsonPath("$[0].publicaciones[1].precioUsd").doesNotExist())
                .andExpect(jsonPath("$[0].publicaciones[1].vendedor").value("Tienda"))
                // AliExpress: precio en pesos y el original en dólares
                .andExpect(jsonPath("$[1].publicaciones[0].precio").value(7612.17))
                .andExpect(jsonPath("$[1].publicaciones[0].precioUsd").value(2.39))
                // Sin capturas todavía: lista vacía, nunca ausente
                .andExpect(jsonPath("$[2].id").value(sinCapturas))
                .andExpect(jsonPath("$[2].publicaciones.length()").value(0));
    }

    @Test
    void laListaDeProductosTraeElResumenDeLaCompetencia() throws Exception {
        long ml = monitoreo("URL", "https://www.mercadolibre.com.co/x/p/MCO1", "MERCADOLIBRE", "ACTIVO");
        long pausado = monitoreo("URL", "https://www.mercadolibre.com.co/x/p/MCO2", "MERCADOLIBRE", "PAUSADO");
        long ali = monitoreo("URL", "https://es.aliexpress.com/item/1.html", "ALIEXPRESS", "ACTIVO");
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);
        punto(ml, "MCO-1", null, 95000, "COP", 95000, true, ahora);
        punto(pausado, "MCO-2", null, 10000, "COP", 10000, true, ahora); // pausado: no cuenta
        punto(ali, "1", null, 20, "USD", 80000, false, ahora); // sin stock: no cuenta

        mockMvc.perform(get("/api/v1/productos").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].competencia.monitoreos").value(3))
                .andExpect(jsonPath("$[0].competencia.publicaciones").value(1))
                .andExpect(jsonPath("$[0].competencia.marketplaces.length()").value(2))
                .andExpect(jsonPath("$[0].competencia.minimo.precio").value(95000))
                .andExpect(jsonPath("$[0].competencia.minimo.marketplace").value("MERCADOLIBRE"));

        mockMvc.perform(get("/api/v1/productos/" + producto).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(jsonPath("$.competencia.monitoreos").value(3));
    }

    @Test
    void unProductoSinCompetidoresTraeElResumenVacio() throws Exception {
        mockMvc.perform(get("/api/v1/productos").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(jsonPath("$[0].competencia.monitoreos").value(0))
                .andExpect(jsonPath("$[0].competencia.minimo").doesNotExist());
    }

    @Test
    void alCrearElProductoConReventaSeCreanLosMonitoreosYSumaLosCostosExtra() throws Exception {
        mockMvc.perform(post("/api/v1/productos").header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"nombre": "Reloj", "sku": "REL-1", "costo": 40000, "costosExtra": 5000,
                                 "precioVenta": 90000, "margenObjetivo": 30,
                                 "reventa": {"palabraClave": "reloj amoled", "marketplaces": ["MERCADOLIBRE"], "topN": 3}}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.costo").value(45000));

        long nuevo = jdbc.queryForObject("SELECT id FROM producto WHERE sku = 'REL-1'", Long.class);
        assertThat(jdbc.queryForMap("SELECT tipo, valor, marketplace, top_n FROM monitoreo WHERE producto_id = ?", nuevo))
                .containsEntry("tipo", "PALABRA_CLAVE").containsEntry("valor", "reloj amoled").containsEntry("top_n", 3);
    }

    @Test
    void crearYPausarDevuelvenElMonitoreoConLaListaDePublicacionesVacia() throws Exception {
        String creado = mockMvc.perform(post("/api/v1/productos/" + producto + "/monitoreos").header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\": \"PALABRA_CLAVE\", \"valor\": \"audifonos\", \"marketplace\": \"MERCADOLIBRE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publicaciones.length()").value(0))
                .andReturn().getResponse().getContentAsString();
        String id = creado.replaceAll("^\\{\"id\":(\\d+).*", "$1");

        mockMvc.perform(patch("/api/v1/monitoreos/" + id).header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"estado\": \"PAUSADO\"}"))
                .andExpect(jsonPath("$.publicaciones.length()").value(0));
    }

    private long monitoreo(String tipo, String valor, String marketplace, String estado) {
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, id_publicacion, marketplace, top_n, frecuencia_horas, estado)
                VALUES (?, ?, ?, ?, ?, ?, 6, ?)""", producto, tipo, valor,
                "URL".equals(tipo) ? valor.replaceAll(".*/(p/)?", "") : null, marketplace,
                "PALABRA_CLAVE".equals(tipo) ? 5 : null, estado);
        return jdbc.queryForObject("SELECT MAX(id) FROM monitoreo", Long.class);
    }

    private void punto(long monitoreo, String publicacion, Integer posicion, double precio, String moneda,
            double precioCop, boolean disponible, Instant cuando) {
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, titulo, vendedor, posicion, precio, moneda,
                    precio_cop, disponible, fuente, capturado_en) VALUES (?, ?, ?, 'Tienda', ?, ?, ?, ?, ?, 'X', ?)""",
                monitoreo, publicacion, "Pub " + publicacion, posicion, precio, moneda, precioCop, disponible,
                Timestamp.from(cuando));
    }
}
