package co.trendly.incidencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.scraping.TipoFallo;
import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/** {@code GET /api/v1/admin/incidencias} con JWT, H2 y las migraciones de Flyway (SCRUM-45). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class IncidenciaControllerTest {

    private static final String RUTA = "/api/v1/admin/incidencias";
    private static final String URL_ML = "https://www.mercadolibre.com.co/x/p/MCO123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private IncidenciaService servicio;

    private long monitoreo;
    private long producto;

    @BeforeEach
    void preparar() {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Ana', 'ana@correo.co', 'h', 1)");
        long vendedor = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'ana@correo.co'", Long.class);
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 5000, 20000, 30)""", vendedor);
        producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, vendedor);
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, id_publicacion, marketplace, frecuencia_horas, estado,
                    fallos_consecutivos) VALUES (?, 'URL', ?, 'MCO-123', 'MERCADOLIBRE', 6, 'ERROR', 3)""", producto, URL_ML);
        monitoreo = jdbc.queryForObject("SELECT id FROM monitoreo WHERE producto_id = ?", Long.class, producto);
    }

    @Test
    void elAdministradorVeLasIncidenciasYLosMonitoreosEnError() throws Exception {
        servicio.registrar(monitoreo, TipoFallo.TIMEOUT, "MercadoLibre no respondió", 4);
        servicio.registrar(monitoreo, TipoFallo.DATO_INVALIDO, "MCO-123: Precio sospechoso", 1);

        mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monitoreosEnError.length()").value(1))
                .andExpect(jsonPath("$.monitoreosEnError[0].id").value(monitoreo))
                .andExpect(jsonPath("$.monitoreosEnError[0].producto").value("Audífonos"))
                .andExpect(jsonPath("$.monitoreosEnError[0].marketplace").value("MERCADOLIBRE"))
                .andExpect(jsonPath("$.monitoreosEnError[0].fallosConsecutivos").value(3))
                .andExpect(jsonPath("$.incidencias.length()").value(2))
                // La más reciente primero
                .andExpect(jsonPath("$.incidencias[0].tipo").value("DATO_INVALIDO"))
                .andExpect(jsonPath("$.incidencias[1].tipo").value("TIMEOUT"))
                .andExpect(jsonPath("$.incidencias[1].detalle").value("MercadoLibre no respondió"))
                .andExpect(jsonPath("$.incidencias[1].intentos").value(4))
                .andExpect(jsonPath("$.incidencias[1].monitoreoId").value(monitoreo))
                .andExpect(jsonPath("$.incidencias[1].productoId").value(producto))
                .andExpect(jsonPath("$.incidencias[1].valor").value(URL_ML))
                .andExpect(jsonPath("$.incidencias[1].estadoMonitoreo").value("ERROR"));
    }

    @Test
    void sePuedeFiltrarPorTipoYLimitar() throws Exception {
        servicio.registrar(monitoreo, TipoFallo.TIMEOUT, "uno", 4);
        servicio.registrar(monitoreo, TipoFallo.BLOQUEO, "dos", 1);
        servicio.registrar(monitoreo, TipoFallo.BLOQUEO, "tres", 1);

        mockMvc.perform(get(RUTA).param("tipo", "bloqueo").header(HttpHeaders.AUTHORIZATION, token("ADMIN")))
                .andExpect(jsonPath("$.incidencias.length()").value(2));
        mockMvc.perform(get(RUTA).param("limite", "1").header(HttpHeaders.AUTHORIZATION, token("ADMIN")))
                .andExpect(jsonPath("$.incidencias.length()").value(1));
        mockMvc.perform(get(RUTA).param("tipo", "RARO").header(HttpHeaders.AUTHORIZATION, token("ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(IncidenciaController.TIPO_INVALIDO));
    }

    @Test
    void soloElAdministradorPuedeEntrar() throws Exception {
        mockMvc.perform(get(RUTA)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token("VENDEDOR"))).andExpect(status().isForbidden());
    }

    @Test
    void unDetalleMuyLargoSeRecortaAlTamanoDeLaColumna() {
        servicio.registrar(monitoreo, TipoFallo.ESTRUCTURA, "x".repeat(5000), 1);
        jdbc.queryForObject("SELECT COUNT(*) FROM usuario", Integer.class); // obliga a Hibernate a escribir

        assertThat(servicio.panel(TipoFallo.ESTRUCTURA, 10).incidencias().getFirst().detalle())
                .hasSize(IncidenciaScraping.DETALLE_MAXIMO);
    }

    private String token(String rol) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(1L, "admin@trendly.co", rol));
    }
}
