package co.trendly.alerta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

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

/** Bandeja de alertas y decisión de precio (SCRUM-49), con JWT, H2 y las migraciones de Flyway. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AlertaControllerTest {

    private static final String RUTA = "/api/v1/alertas";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private String ana;
    private String beto;
    private long producto;
    private long monitoreo;

    @BeforeEach
    void preparar() {
        long idAna = crearVendedor("ana@alertas.co");
        ana = token(idAna);
        beto = token(crearVendedor("beto@alertas.co"));
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'SKU-A', 50000, 120000, 30)""", idAna);
        producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, idAna);
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, marketplace, top_n)
                VALUES (?, 'PALABRA_CLAVE', 'audifonos', 'MERCADOLIBRE', 5)""", producto);
        monitoreo = jdbc.queryForObject("SELECT id FROM monitoreo WHERE producto_id = ?", Long.class, producto);
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, titulo, vendedor, precio, moneda, precio_cop)
                VALUES (?, 'MCO-1', 'Audífonos Bluetooth Pro', '123456', 99000, 'COP', 99000)""", monitoreo);
    }

    @Test
    void elVendedorVeSusAlertasConTodoLoQueNecesitaParaDecidir() throws Exception {
        long vieja = alerta("NORMAL", "LEIDA", new BigDecimal("98000"), "2026-11-01 10:00:00");
        long nueva = alerta("ALTA", "NUEVA", new BigDecimal("98000"), "2026-11-03 10:00:00");

        listar(ana, "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(nueva))
                .andExpect(jsonPath("$[1].id").value(vieja))
                .andExpect(jsonPath("$[0].productoNombre").value("Audífonos"))
                .andExpect(jsonPath("$[0].precioVentaActual").value(120000))
                .andExpect(jsonPath("$[0].competidor").value("Vendedor 123456"))
                .andExpect(jsonPath("$[0].tituloPublicacion").value("Audífonos Bluetooth Pro"))
                .andExpect(jsonPath("$[0].precioAnterior").value(110000))
                .andExpect(jsonPath("$[0].precioNuevo").value(99000))
                .andExpect(jsonPath("$[0].precioSugerido").value(98000))
                .andExpect(jsonPath("$[0].margenSugerido").value(48.98))
                .andExpect(jsonPath("$[0].monitoreoId").value(monitoreo))
                .andExpect(jsonPath("$[0].publicacionId").value("MCO-1"))
                .andExpect(jsonPath("$[0].decision").doesNotExist());
    }

    @Test
    void filtraPorEstadoYRelevancia() throws Exception {
        long nuevaAlta = alerta("ALTA", "NUEVA", null, "2026-11-03 10:00:00");
        alerta("NORMAL", "NUEVA", null, "2026-11-02 10:00:00");
        alerta("ALTA", "CERRADA", null, "2026-11-01 10:00:00");

        listar(ana, "?estado=NUEVA").andExpect(jsonPath("$.length()").value(2));
        listar(ana, "?estado=nueva&relevancia=ALTA")
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(nuevaAlta));
        listar(ana, "?estado=ARCHIVADA")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(BandejaAlertasService.MENSAJE_ESTADO));
    }

    @Test
    void lasAlertasDeOtroVendedorNoExistenParaEl() throws Exception {
        long id = alerta("ALTA", "NUEVA", new BigDecimal("98000"), "2026-11-03 10:00:00");

        listar(beto, "").andExpect(jsonPath("$.length()").value(0));
        decidir(beto, id, "{\"accion\": \"ACEPTAR\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(AlertaNoEncontradaException.MENSAJE));
        mockMvc.perform(get(RUTA)).andExpect(status().isUnauthorized());
    }

    @Test
    void abrirUnaAlertaNuevaLaMarcaComoLeida() throws Exception {
        long id = alerta("ALTA", "NUEVA", null, "2026-11-03 10:00:00");

        mockMvc.perform(patch(RUTA + "/" + id + "/leida").header(HttpHeaders.AUTHORIZATION, ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("LEIDA"));
        listar(ana, "?estado=NUEVA").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void aceptarElSugeridoCambiaElPrecioDelProductoYCierraLaAlerta() throws Exception {
        long id = alerta("ALTA", "NUEVA", new BigDecimal("98000"), "2026-11-03 10:00:00");

        decidir(ana, id, "{\"accion\": \"ACEPTAR\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CERRADA"))
                .andExpect(jsonPath("$.precioVentaActual").value(98000))
                .andExpect(jsonPath("$.decision.accion").value("ACEPTAR"))
                .andExpect(jsonPath("$.decision.precioAnterior").value(120000))
                .andExpect(jsonPath("$.decision.precioFinal").value(98000));
        assertThat(precioDeVenta()).isEqualByComparingTo("98000");
        assertThat(jdbc.queryForObject("SELECT accion FROM decision_precio WHERE alerta_id = ?", String.class, id))
                .isEqualTo("ACEPTAR");

        decidir(ana, id, "{\"accion\": \"DESCARTAR\", \"motivo\": \"otra vez\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(AlertaYaDecididaException.MENSAJE));
    }

    @Test
    void sinPrecioSugeridoNoSePuedeAceptar() throws Exception {
        long id = alerta("NORMAL", "NUEVA", null, "2026-11-03 10:00:00");

        decidir(ana, id, "{\"accion\": \"ACEPTAR\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(BandejaAlertasService.MENSAJE_SIN_SUGERIDO));
        assertThat(precioDeVenta()).isEqualByComparingTo("120000");
    }

    @Test
    void ajustarExigeUnPrecioYLoPoneEnElProducto() throws Exception {
        long id = alerta("NORMAL", "NUEVA", new BigDecimal("98000"), "2026-11-03 10:00:00");

        decidir(ana, id, "{\"accion\": \"AJUSTAR\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(BandejaAlertasService.MENSAJE_PRECIO_FINAL));
        decidir(ana, id, "{\"accion\": \"AJUSTAR\", \"precioFinal\": 0}").andExpect(status().isBadRequest());

        decidir(ana, id, "{\"accion\": \"AJUSTAR\", \"precioFinal\": 104900, \"motivo\": \"Redondeo\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision.accion").value("AJUSTAR"))
                .andExpect(jsonPath("$.decision.precioFinal").value(104900))
                .andExpect(jsonPath("$.decision.motivo").value("Redondeo"));
        assertThat(precioDeVenta()).isEqualByComparingTo("104900");
    }

    @Test
    void descartarPideMotivoYNoCambiaElPrecio() throws Exception {
        long id = alerta("NORMAL", "NUEVA", new BigDecimal("98000"), "2026-11-03 10:00:00");

        decidir(ana, id, "{\"accion\": \"DESCARTAR\", \"motivo\": \"   \"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(BandejaAlertasService.MENSAJE_MOTIVO));

        decidir(ana, id, "{\"accion\": \"DESCARTAR\", \"motivo\": \"La oferta es de un vendedor sin reputación\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CERRADA"))
                .andExpect(jsonPath("$.decision.accion").value("DESCARTAR"))
                .andExpect(jsonPath("$.decision.precioFinal").doesNotExist());
        assertThat(precioDeVenta()).isEqualByComparingTo("120000");
    }

    @Test
    void unaAccionDesconocidaRespondeUnMensajeClaro() throws Exception {
        long id = alerta("NORMAL", "NUEVA", null, "2026-11-03 10:00:00");

        decidir(ana, id, "{\"accion\": \"IGNORAR\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(DecisionRequest.MENSAJE_ACCION));
        decidir(ana, id, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(DecisionRequest.MENSAJE_ACCION));
    }

    private long alerta(String relevancia, String estado, BigDecimal sugerido, String creadoEn) {
        jdbc.update("""
                INSERT INTO alerta (monitoreo_id, usuario_id, publicacion_id, tipo, relevancia, precio_anterior,
                    precio_nuevo, variacion_pct, precio_sugerido, estado, creado_en)
                SELECT ?, p.usuario_id, 'MCO-1', 'BAJA_PRECIO', ?, 110000, 99000, -10, ?, ?, ?
                FROM producto p WHERE p.id = ?""", monitoreo, relevancia, sugerido, estado, creadoEn, producto);
        return jdbc.queryForObject("SELECT MAX(id) FROM alerta", Long.class);
    }

    private BigDecimal precioDeVenta() {
        return jdbc.queryForObject("SELECT precio_venta FROM producto WHERE id = ?", BigDecimal.class, producto);
    }

    private ResultActions listar(String token, String filtros) throws Exception {
        return mockMvc.perform(get(RUTA + filtros).header(HttpHeaders.AUTHORIZATION, token));
    }

    private ResultActions decidir(String token, long id, String cuerpo) throws Exception {
        return mockMvc.perform(patch(RUTA + "/" + id + "/decision").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }

    private long crearVendedor(String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Prueba', ?, 'hash', 1)",
                email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private String token(long usuarioId) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuarioId, "x@correo.co", "VENDEDOR"));
    }
}
