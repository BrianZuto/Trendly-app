package co.trendly.producto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/**
 * El alta con reventa es todo o nada. Sin {@code @Transactional} en la prueba: así cada petición tiene su propia
 * transacción, como en producción, y se puede ver que el rollback borra también el producto.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AltaProductoTransaccionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private String token;

    @BeforeEach
    void preparar() {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Tx', 'tx@c.co', 'h', 1)");
        long usuario = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'tx@c.co'", Long.class);
        token = "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuario, "tx@c.co", "VENDEDOR"));
    }

    @AfterEach
    void limpiar() {
        jdbc.update("DELETE FROM usuario WHERE email = 'tx@c.co'");
    }

    @Test
    void siUnMonitoreoDeLaReventaNoEsValidoNoQuedaNiElProducto() throws Exception {
        mockMvc.perform(post("/api/v1/productos").header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"nombre": "Reloj", "sku": "TX-1", "costo": 40000, "precioVenta": 90000, "margenObjetivo": 30,
                                 "reventa": {"palabraClave": "reloj", "marketplaces": ["MERCADOLIBRE", "AMAZON"], "topN": 3}}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Marketplace no soportado"));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM producto WHERE sku = 'TX-1'", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM monitoreo m JOIN producto p ON p.id = m.producto_id WHERE p.sku = 'TX-1'""",
                Integer.class)).isZero();
    }

    @Test
    void unaReventaSinSitiosOCostosExtraNegativosSeRechazanAntesDeCrear() throws Exception {
        mockMvc.perform(post("/api/v1/productos").header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"nombre": "Reloj", "sku": "TX-2", "costo": 40000, "precioVenta": 90000, "margenObjetivo": 30,
                                 "costosExtra": -1, "reventa": {"palabraClave": "reloj", "marketplaces": []}}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Los costos extra no pueden ser negativos. Elige al menos un sitio de reventa"));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM producto WHERE sku = 'TX-2'", Integer.class)).isZero();
    }
}
