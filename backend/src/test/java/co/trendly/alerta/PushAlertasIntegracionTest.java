package co.trendly.alerta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import co.trendly.notificacion.ClienteExpoPush;
import co.trendly.notificacion.DispositivoService;
import co.trendly.notificacion.MensajePush;
import co.trendly.notificacion.PushProperties;
import co.trendly.notificacion.ResultadoPush;

/** Notificaciones push de alertas (SCRUM-52) con H2 y Flyway; la Expo Push API se reemplaza por un doble. */
@SpringBootTest(properties = "trendly.push.habilitado=true")
class PushAlertasIntegracionTest {

    private static final String ANA = "ana-push@a.co";
    private static final String EVA = "eva-push@a.co";
    private static final String CELULAR_ANA = "ExponentPushToken[ana]";
    private static final String CELULAR_EVA = "ExponentPushToken[eva]";

    @MockitoBean
    private ClienteExpoPush expo;

    @Autowired
    private PushAlertasService servicio;

    @Autowired
    private DispositivoService dispositivos;

    @Autowired
    private JdbcTemplate jdbc;

    private final Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);
    private long ana;
    private long eva;

    @BeforeEach
    void preparar() {
        ana = usuario("Ana", ANA);
        eva = usuario("Eva", EVA);
        when(expo.enviar(anyList())).thenAnswer(invocacion -> {
            List<MensajePush> mensajes = invocacion.getArgument(0);
            return mensajes.stream().map(m -> new ResultadoPush(m.token(), true, null)).toList();
        });
    }

    @AfterEach
    void limpiar() {
        jdbc.update("DELETE FROM usuario WHERE email IN (?, ?)", ANA, EVA);
        reset(expo);
    }

    @Test
    void cadaAlertaLlegaComoNotificacionAlCelularConLaRutaDeLaAlertaYQuedaMarcada() {
        celular(ana, CELULAR_ANA);
        long m1 = monitoreoDe(ana, "Audífonos");
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, titulo, vendedor, precio, moneda, precio_cop, disponible, capturado_en)
                VALUES (?, 'MCO-A', 'Audífonos Redmi', 'Tienda Uno', 90000, 'COP', 90000, TRUE, ?)""", m1, Timestamp.from(ahora));
        long baja = alerta(ana, m1, "BAJA_PRECIO", 89100L, ahora);
        long agotado = alerta(ana, monitoreoDe(ana, "Parlante"), "AGOTADO", null, ahora);

        servicio.enviarPendientes();

        List<MensajePush> enviados = enviados();
        assertThat(enviados).hasSize(2).allMatch(m -> m.token().equals(CELULAR_ANA));
        MensajePush primero = enviados.getFirst();
        assertThat(primero.titulo()).isEqualTo("Audífonos: bajó de precio");
        assertThat(primero.cuerpo()).isEqualTo("Tienda Uno: $ 100.000 → $ 90.000 (-10 %). Sugerido: $ 89.100");
        assertThat(primero.datos()).containsEntry("alertaId", baja).containsEntry("url", "/alerta/" + baja);
        assertThat(enviados.get(1).datos()).containsEntry("url", "/alerta/" + agotado);
        assertThat(sinNotificar(ana)).isZero();

        // Ya notificadas: el siguiente ciclo no las repite
        reset(expo);
        servicio.enviarPendientes();
        verifyNoInteractions(expo);
    }

    @Test
    void quienDesactivoLasNotificacionesNoLasRecibeYLosDemasSi() {
        jdbc.update("INSERT INTO regla_alerta (usuario_id, recibir_push) VALUES (?, FALSE)", ana);
        celular(ana, CELULAR_ANA);
        celular(eva, CELULAR_EVA);
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", null, ahora);
        alerta(eva, monitoreoDe(eva, "Parlante"), "BAJA_PRECIO", null, ahora);

        servicio.enviarPendientes();

        assertThat(enviados()).extracting(MensajePush::token).containsExactly(CELULAR_EVA);
        assertThat(sinNotificar(ana)).isEqualTo(1);
        assertThat(sinNotificar(eva)).isZero();
    }

    @Test
    void sinCelularRegistradoNoSeEnviaNadaYLaAlertaQuedaPendiente() {
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", null, ahora);

        servicio.enviarPendientes();

        verify(expo, never()).enviar(anyList());
        assertThat(sinNotificar(ana)).isEqualTo(1);
    }

    @Test
    void unCelularQueExpoYaNoReconoceSeOlvida() {
        celular(ana, CELULAR_ANA);
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", null, ahora);
        when(expo.enviar(anyList())).thenReturn(List.of(new ResultadoPush(CELULAR_ANA, false, "DeviceNotRegistered")));

        servicio.enviarPendientes();

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM dispositivo_push WHERE usuario_id = ?", Integer.class, ana)).isZero();
        assertThat(sinNotificar(ana)).isZero();
    }

    @Test
    void siExpoFallaLaAlertaQuedaPendienteParaElProximoCiclo() {
        celular(ana, CELULAR_ANA);
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", null, ahora);
        when(expo.enviar(anyList())).thenThrow(new IllegalStateException("Expo Push respondió 503"));

        servicio.enviarPendientes();

        assertThat(sinNotificar(ana)).isEqualTo(1);
    }

    @Test
    void unaAlertaDeMasDeUnDiaYaNoSeNotifica() {
        celular(ana, CELULAR_ANA);
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", null, ahora.minus(25, ChronoUnit.HOURS));

        servicio.enviarPendientes();

        verify(expo, never()).enviar(anyList());
    }

    @Test
    void deshabilitadoNoConsultaNiEnvia() {
        AlertasPendientesService sinUso = mock(AlertasPendientesService.class);
        new PushAlertasService(sinUso, dispositivos, expo, new PushProperties(false, "", "")).enviarPendientes();

        verifyNoInteractions(sinUso, expo);
    }

    @SuppressWarnings("unchecked")
    private List<MensajePush> enviados() {
        ArgumentCaptor<List<MensajePush>> captura = ArgumentCaptor.forClass(List.class);
        verify(expo).enviar(captura.capture());
        return captura.getValue();
    }

    private long usuario(String nombre, String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES (?, ?, 'h', 1)", nombre, email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private void celular(long usuario, String token) {
        jdbc.update("INSERT INTO dispositivo_push (usuario_id, token, plataforma) VALUES (?, ?, 'IOS')", usuario, token);
    }

    private long monitoreoDe(long usuario, String producto) {
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, ?, ?, 50000, 120000, 30)""", usuario, producto, producto);
        long id = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ? AND sku = ?", Long.class, usuario, producto);
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, marketplace, top_n, frecuencia_horas, estado)
                VALUES (?, 'PALABRA_CLAVE', 'buds', 'MERCADOLIBRE', 5, 6, 'ACTIVO')""", id);
        return jdbc.queryForObject("SELECT id FROM monitoreo WHERE producto_id = ?", Long.class, id);
    }

    private long alerta(long usuario, long monitoreo, String tipo, Long sugerido, Instant cuando) {
        jdbc.update("""
                INSERT INTO alerta (monitoreo_id, usuario_id, publicacion_id, tipo, relevancia, precio_anterior, precio_nuevo,
                    variacion_pct, precio_sugerido, creado_en)
                VALUES (?, ?, 'MCO-A', ?, 'NORMAL', 100000, 90000, -10, ?, ?)""", monitoreo, usuario, tipo, sugerido,
                Timestamp.from(cuando));
        return jdbc.queryForObject("SELECT MAX(id) FROM alerta WHERE monitoreo_id = ?", Long.class, monitoreo);
    }

    private int sinNotificar(long usuario) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM alerta WHERE usuario_id = ? AND enviada_push_en IS NULL",
                Integer.class, usuario);
    }
}
