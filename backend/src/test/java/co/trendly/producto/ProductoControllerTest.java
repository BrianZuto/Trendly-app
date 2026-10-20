package co.trendly.producto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

/** Prueba de integración de {@code /api/v1/productos} con JWT, H2 y las migraciones de Flyway (SCRUM-33). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductoControllerTest {

    private static final String URL = "/api/v1/productos";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private String ana;
    private String beto;

    @BeforeEach
    void crearVendedores() {
        ana = token(crearVendedor("ana@correo.co"));
        beto = token(crearVendedor("beto@correo.co"));
    }

    @Test
    void elVendedorCreaListaConsultaEditaYEliminaSusProductos() throws Exception {
        long id = idCreado(crear(ana, producto("Audífonos", "SKU-1", 50000, 89900, 30))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Audífonos"))
                .andExpect(jsonPath("$.sku").value("SKU-1"))
                .andExpect(jsonPath("$.costo").value(50000))
                .andExpect(jsonPath("$.precioVenta").value(89900))
                .andExpect(jsonPath("$.margenObjetivo").value(30))
                .andExpect(jsonPath("$.margenActual").value(44.38)));

        mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(id));

        mockMvc.perform(get(URL + "/" + id).header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Audífonos"));

        mockMvc.perform(put(URL + "/" + id).header(HttpHeaders.AUTHORIZATION, ana)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(producto("Audífonos Pro", "SKU-1", 60000, 120000, 35)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Audífonos Pro"))
                .andExpect(jsonPath("$.margenActual").value(50));

        mockMvc.perform(delete(URL + "/" + id).header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM producto WHERE id = ?", Integer.class, id)).isZero();
    }

    @Test
    void unVendedorNoVeNiEditaNiEliminaProductosDeOtro() throws Exception {
        long id = idCreado(crear(ana, producto("Audífonos", "SKU-1", 50000, 89900, 30)));

        mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, beto))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get(URL + "/" + id).header(HttpHeaders.AUTHORIZATION, beto))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(ProductoNoEncontradoException.MENSAJE));
        mockMvc.perform(put(URL + "/" + id).header(HttpHeaders.AUTHORIZATION, beto)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(producto("Robado", "SKU-1", 1, 2, 3)))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(URL + "/" + id).header(HttpHeaders.AUTHORIZATION, beto))
                .andExpect(status().isNotFound());

        assertThat(jdbc.queryForObject("SELECT nombre FROM producto WHERE id = ?", String.class, id))
                .isEqualTo("Audífonos");
    }

    @Test
    void alSuperarElCupoDelPlanResponde422() throws Exception {
        for (int i = 1; i <= 10; i++) {
            crear(ana, producto("Producto " + i, "SKU-" + i, 100, 200, 30)).andExpect(status().isCreated());
        }

        crear(ana, producto("Producto 11", "SKU-11", 100, 200, 30))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value(LimitePlanException.MENSAJE));
        // El cupo es por vendedor: Beto todavía puede crear
        crear(beto, producto("Producto 1", "SKU-1", 100, 200, 30)).andExpect(status().isCreated());
    }

    @Test
    void elSkuEsUnicoPorVendedor() throws Exception {
        crear(ana, producto("Audífonos", "SKU-1", 100, 200, 30)).andExpect(status().isCreated());

        crear(ana, producto("Otro", "sku-1", 100, 200, 30))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(SkuRepetidoException.MENSAJE));
        crear(beto, producto("Audífonos", "SKU-1", 100, 200, 30)).andExpect(status().isCreated());
    }

    @Test
    void validaLosCampos() throws Exception {
        crear(ana, producto("", "SKU-1", 100, 200, 30))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("El nombre es obligatorio"));
        crear(ana, producto("Audífonos", "SKU-1", 0, 200, 30))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ProductoRequest.MENSAJE_COSTO));
        crear(ana, producto("Audífonos", "SKU-1", 100, -5, 30))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ProductoRequest.MENSAJE_PRECIO));
        crear(ana, producto("Audífonos", "SKU-1", 100, 200, 101))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ProductoRequest.MENSAJE_MARGEN));
    }

    @Test
    void sinTokenResponde401() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(producto("A", "B", 1, 2, 3)))
                .andExpect(status().isUnauthorized());
    }

    private long crearVendedor(String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Prueba', ?, 'hash', 1)",
                email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private String token(long usuarioId) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuarioId, "x@correo.co", "VENDEDOR"));
    }

    private ResultActions crear(String token, String cuerpo) throws Exception {
        return mockMvc.perform(post(URL).header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }

    private static long idCreado(ResultActions resultado) throws Exception {
        String json = resultado.andReturn().getResponse().getContentAsString();
        return Long.parseLong(json.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    private static String producto(String nombre, String sku, double costo, double precio, double margen) {
        return """
                {"nombre": "%s", "sku": "%s", "costo": %s, "precioVenta": %s, "margenObjetivo": %s}"""
                .formatted(nombre, sku, costo, precio, margen);
    }
}
