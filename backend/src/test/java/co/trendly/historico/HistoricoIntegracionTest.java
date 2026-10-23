package co.trendly.historico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.monitoreo.MonitoreoService;
import co.trendly.monitoreo.PublicacionUrl;
import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;
import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/**
 * Histórico de precios con H2 y las migraciones de Flyway (SCRUM-42). La TRM se simula: 1 USD = 4.000 COP.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@RecordApplicationEvents
class HistoricoIntegracionTest {

    private static final String URL_ALI = "https://es.aliexpress.com/item/1005006150134970.html";

    @MockitoBean
    private ClienteTrm clienteTrm;

    @Autowired
    private HistoricoService historicoService;

    @Autowired
    private HistoricoPrecioRepository historicoRepo;

    @Autowired
    private MonitoreoRepository monitoreoRepo;

    @Autowired
    private MonitoreoService monitoreoService;

    @Autowired
    private TrmService trmService;

    @Autowired
    private ApplicationEventPublisher publicador;

    @Autowired
    private ApplicationEvents eventos;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private long vendedor;
    private Monitoreo monitoreo;

    @BeforeEach
    void preparar() {
        when(clienteTrm.consultar(any(LocalDate.class))).thenAnswer(invocacion -> {
            LocalDate dia = invocacion.getArgument(0);
            return new Trm(dia, dia, new BigDecimal("4000.00"));
        });
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Ana', 'ana@correo.co', 'h', 1)");
        vendedor = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'ana@correo.co'", Long.class);
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 5000, 20000, 30)""", vendedor);
        long producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, vendedor);
        monitoreo = monitoreoRepo.saveAndFlush(Monitoreo.porUrl(producto, URL_ALI, PublicacionUrl.reconocer(URL_ALI), 6));
    }

    @Test
    void despuesDeUnCicloElMonitoreoTieneSuPrecioEnPesos() {
        int guardados = historicoService.guardar(monitoreo, ok("1.38", "USD", true));

        assertThat(guardados).isEqualTo(1);
        HistoricoPrecio punto = historicoRepo.findAll().getFirst();
        assertThat(punto.getPrecio()).isEqualByComparingTo("1.38");
        assertThat(punto.getMoneda()).isEqualTo("USD");
        assertThat(punto.getPrecioCop()).isEqualByComparingTo("5520.00");
        assertThat(punto.getFuente()).isEqualTo("ALIEXPRESS");
        assertThat(punto.getPublicacionId()).isEqualTo("1005006150134970");
        assertThat(punto.getVendedor()).isEqualTo("Crystal 3C Store");
        assertThat(monitoreoRepo.findById(monitoreo.getId()).orElseThrow().getUltimaCaptura())
                .isEqualTo(punto.getCapturadoEn());
    }

    @Test
    void siElCicloCorreDosVecesSeguidasNoDuplicaLaCaptura() {
        historicoService.guardar(monitoreo, ok("1.38", "USD", true));

        assertThat(historicoService.guardar(monitoreo, ok("1.40", "USD", true))).isZero();
        assertThat(historicoRepo.count()).isEqualTo(1);
    }

    @Test
    void pasadaLaHoraSiGuardaOtraCapturaYAvisaElPrecioAnterior() {
        historicoService.guardar(monitoreo, ok("1.38", "USD", true));
        HistoricoService unaHoraDespues = new HistoricoService(historicoRepo, monitoreoRepo, monitoreoService,
                trmService, publicador, Clock.offset(Clock.systemUTC(), Duration.ofMinutes(61)));

        assertThat(unaHoraDespues.guardar(monitoreo, ok("1.20", "USD", false))).isEqualTo(1);

        List<PrecioActualizado> avisos = eventos.stream(PrecioActualizado.class).toList();
        assertThat(avisos).hasSize(2);
        PrecioActualizado primero = avisos.get(0);
        assertThat(primero.precioAnteriorCop()).isNull();
        assertThat(primero.precioCop()).isEqualByComparingTo("5520.00");
        PrecioActualizado segundo = avisos.get(1);
        assertThat(segundo.monitoreoId()).isEqualTo(monitoreo.getId());
        assertThat(segundo.productoId()).isEqualTo(monitoreo.getProductoId());
        assertThat(segundo.precioAnteriorCop()).isEqualByComparingTo("5520.00");
        assertThat(segundo.precioCop()).isEqualByComparingTo("4800.00");
        assertThat(segundo.disponibleAnterior()).isTrue();
        assertThat(segundo.disponible()).isFalse();
    }

    @Test
    void unPrecioEnPesosNoSeConvierteYUnFalloNoDejaPunto() {
        assertThat(historicoService.guardar(monitoreo, ok("6090", "COP", true))).isEqualTo(1);
        assertThat(historicoRepo.findAll().getFirst().getPrecioCop()).isEqualByComparingTo("6090.00");

        assertThat(historicoService.guardar(monitoreo, ResultadoScraping.fallo(TipoFallo.TIMEOUT, "lento"))).isZero();
        assertThat(eventos.stream(PrecioActualizado.class)).hasSize(1);
    }

    @Test
    void elEndpointDevuelveLosPuntosOrdenadosPorFechaYFiltraElRango() throws Exception {
        // Se insertan desordenados a propósito
        insertarPunto("2026-10-15T12:00:00", "5000");
        insertarPunto("2026-10-10T12:00:00", "5200");
        insertarPunto("2026-10-12T12:00:00", "5100");
        String ruta = "/api/v1/monitoreos/" + monitoreo.getId() + "/historico";

        mockMvc.perform(get(ruta).header(HttpHeaders.AUTHORIZATION, token(vendedor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].fechaCaptura").value("2026-10-10T12:00:00Z"))
                .andExpect(jsonPath("$[1].fechaCaptura").value("2026-10-12T12:00:00Z"))
                .andExpect(jsonPath("$[2].fechaCaptura").value("2026-10-15T12:00:00Z"))
                .andExpect(jsonPath("$[0].idPublicacion").value("1005006150134970"))
                .andExpect(jsonPath("$[0].precio").value(1.3))
                .andExpect(jsonPath("$[0].moneda").value("USD"))
                .andExpect(jsonPath("$[0].precioCop").value(5200))
                .andExpect(jsonPath("$[0].disponible").value(true))
                .andExpect(jsonPath("$[0].fuente").value("ALIEXPRESS"));

        // Como lo manda el tablero (ISO con hora) y solo con la fecha
        mockMvc.perform(get(ruta).header(HttpHeaders.AUTHORIZATION, token(vendedor))
                        .param("desde", "2026-10-11T00:00:00.000Z").param("hasta", "2026-10-15T23:59:59.999Z"))
                .andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get(ruta).header(HttpHeaders.AUTHORIZATION, token(vendedor))
                        .param("desde", "2026-10-12").param("hasta", "2026-10-12"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].precioCop").value(5100));
    }

    @Test
    void elEndpointValidaElRangoYElDueno() throws Exception {
        String ruta = "/api/v1/monitoreos/" + monitoreo.getId() + "/historico";

        mockMvc.perform(get(ruta).header(HttpHeaders.AUTHORIZATION, token(vendedor))
                        .param("desde", "2026-10-15").param("hasta", "2026-10-10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(HistoricoService.MENSAJE_RANGO));
        mockMvc.perform(get(ruta).header(HttpHeaders.AUTHORIZATION, token(vendedor)).param("desde", "ayer"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(ruta).header(HttpHeaders.AUTHORIZATION, token(vendedor + 1000)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(ruta)).andExpect(status().isUnauthorized());
    }

    private static ResultadoScraping ok(String precio, String moneda, boolean disponible) {
        return ResultadoScraping.ok(List.of(new PublicacionCapturada("1005006150134970", "Auriculares TWS A6S",
                "Crystal 3C Store", null, new BigDecimal(precio), moneda, disponible)));
    }

    /** Por el repositorio y no con SQL: H2 leería la fecha del SQL en la hora local del computador, no en UTC. */
    private void insertarPunto(String fecha, String precioCop) {
        historicoRepo.saveAndFlush(new HistoricoPrecio(monitoreo.getId(), "1005006150134970", "Auriculares", null,
                null, new BigDecimal("1.30"), "USD", new BigDecimal(precioCop), true, "ALIEXPRESS",
                Instant.parse(fecha + "Z")));
    }

    private String token(long usuarioId) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuarioId, "ana@correo.co", "VENDEDOR"));
    }
}
