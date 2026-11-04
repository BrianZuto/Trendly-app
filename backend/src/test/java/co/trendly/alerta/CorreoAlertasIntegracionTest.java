package co.trendly.alerta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.thymeleaf.TemplateEngine;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;

import co.trendly.recoleccion.CicloTerminado;
import co.trendly.recoleccion.ResumenCiclo;
import jakarta.mail.internet.MimeMessage;

/** Correos reales contra un SMTP de prueba en memoria, con H2 y Flyway. */
@SpringBootTest(properties = { "spring.mail.port=3025", "spring.mail.properties.mail.smtp.auth=false",
        "spring.mail.properties.mail.smtp.starttls.enable=false", "spring.mail.properties.mail.smtp.starttls.required=false",
        "trendly.correo.remitente=alertas@trendly.co", "trendly.correo.frontend-url=https://trendly.test/" })
class CorreoAlertasIntegracionTest {

    private static final String ANA = "ana-correo@a.co";
    private static final String EVA = "eva-correo@a.co";

    @RegisterExtension
    static final GreenMailExtension SMTP = new GreenMailExtension(ServerSetupTest.SMTP);

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CorreoAlertasService servicio;

    @Autowired
    private AlertasPendientesService pendientes;

    @Autowired
    private TemplateEngine plantillas;

    @Autowired
    private JavaMailSender enviador;

    @Autowired
    private ApplicationEventPublisher eventos;

    private final Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);
    private long ana;
    private long eva;

    @BeforeEach
    void preparar() {
        ana = usuario("Ana", ANA);
        eva = usuario("Eva", EVA);
    }

    @AfterEach
    void limpiar() {
        jdbc.update("DELETE FROM usuario WHERE email IN (?, ?)", ANA, EVA);
    }

    private long usuario(String nombre, String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES (?, ?, 'h', 1)", nombre, email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
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

    private long alerta(long usuario, long monitoreo, String tipo, String relevancia, Long sugerido, Instant cuando) {
        jdbc.update("""
                INSERT INTO alerta (monitoreo_id, usuario_id, publicacion_id, tipo, relevancia, precio_anterior, precio_nuevo,
                    variacion_pct, precio_sugerido, creado_en)
                VALUES (?, ?, 'MCO-A', ?, ?, 100000, 90000, -10, ?, ?)""", monitoreo, usuario, tipo, relevancia, sugerido,
                Timestamp.from(cuando));
        return jdbc.queryForObject("SELECT MAX(id) FROM alerta WHERE monitoreo_id = ?", Long.class, monitoreo);
    }

    private List<MimeMessage> correosPara(String email) throws Exception {
        List<MimeMessage> para = new ArrayList<>();
        for (MimeMessage mensaje : SMTP.getReceivedMessages()) {
            if (email.equals(mensaje.getAllRecipients()[0].toString())) {
                para.add(mensaje);
            }
        }
        return para;
    }

    private int sinEnviar(long usuario) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM alerta WHERE usuario_id = ? AND enviada_correo_en IS NULL", Integer.class, usuario);
    }

    @Test
    void variasAlertasDelVendedorLleganEnUnSoloCorreoYQuedanMarcadas() throws Exception {
        long m1 = monitoreoDe(ana, "Audífonos");
        long m2 = monitoreoDe(ana, "Parlante");
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, titulo, vendedor, precio, moneda, precio_cop, disponible, capturado_en)
                VALUES (?, 'MCO-A', 'Audífonos Redmi', 'Tienda Uno', 90000, 'COP', 90000, TRUE, ?)""", m1, Timestamp.from(ahora));
        alerta(ana, m1, "BAJA_PRECIO", "ALTA", 89100L, ahora);
        alerta(ana, m2, "AGOTADO", "NORMAL", null, ahora);

        servicio.enviarPendientes();

        assertThat(correosPara(ANA)).singleElement().satisfies(correo -> {
            assertThat(correo.getSubject()).isEqualTo("Trendly: 2 alertas de precio");
            assertThat(correo.getFrom()[0].toString()).isEqualTo("alertas@trendly.co");
            String cuerpo = GreenMailUtil.getBody(correo);
            assertThat(correo.getContentType()).startsWith("multipart/");
            assertThat(cuerpo).contains("Tienda Uno", "$ 100.000", "$ 90.000", "$ 89.100", "-10 %", "Parlante",
                    "https://trendly.test/productos/");
        });
        assertThat(sinEnviar(ana)).isZero();
    }

    @Test
    void unaAlertaYaEnviadaNoSeRepite() throws Exception {
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", "NORMAL", null, ahora);

        servicio.enviarPendientes();
        servicio.enviarPendientes();

        assertThat(correosPara(ANA)).singleElement()
                .satisfies(correo -> assertThat(correo.getSubject()).isEqualTo("Trendly: 1 alerta de precio"));
    }

    @Test
    void quienDesactivoLosCorreosNoLosRecibeYLosDemasSi() throws Exception {
        jdbc.update("INSERT INTO regla_alerta (usuario_id, recibir_correos) VALUES (?, FALSE)", ana);
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", "NORMAL", null, ahora);
        alerta(eva, monitoreoDe(eva, "Parlante"), "BAJA_PRECIO", "NORMAL", null, ahora);

        servicio.enviarPendientes();

        assertThat(correosPara(ANA)).isEmpty();
        assertThat(correosPara(EVA)).hasSize(1);
        assertThat(sinEnviar(ana)).isEqualTo(1);
    }

    @Test
    void unaAlertaDeMasDeUnDiaYaNoSeEnvia() throws Exception {
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", "NORMAL", null, ahora.minus(25, ChronoUnit.HOURS));

        servicio.enviarPendientes();

        assertThat(correosPara(ANA)).isEmpty();
    }

    @Test
    void elNombreDelProductoSeEscapaEnElHtml() throws Exception {
        alerta(ana, monitoreoDe(ana, "<script>x</script>"), "BAJA_PRECIO", "NORMAL", null, ahora);

        servicio.enviarPendientes();

        String html = GreenMailUtil.getBody(correosPara(ANA).getFirst());
        assertThat(html).contains("&lt;script&gt;x&lt;/script&gt;").doesNotContain("<div style=\"font-size:16px;font-weight:bold;\"><script>");
    }

    @Test
    void alTerminarElCicloSalenLosCorreosEnSegundoPlano() throws Exception {
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", "NORMAL", null, ahora);

        eventos.publishEvent(new CicloTerminado(new ResumenCiclo(ahora, ahora, 1, 1, 0, 1)));

        assertThat(SMTP.waitForIncomingEmail(10_000, 1)).isTrue();
    }

    @Test
    void siFallaElSmtpLaAlertaQuedaPendienteYNoAfectaAlSiguiente() {
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", "NORMAL", null, ahora);
        alerta(eva, monitoreoDe(eva, "Parlante"), "BAJA_PRECIO", "NORMAL", null, ahora);
        JavaMailSender caido = mock(JavaMailSender.class);
        when(caido.createMimeMessage()).thenAnswer(i -> enviador.createMimeMessage());
        doThrow(new MailSendException("SMTP caído")).when(caido).send(any(MimeMessage.class));
        CorreoAlertasService conFallo = new CorreoAlertasService(pendientes, caido, plantillas,
                new CorreoProperties("alertas@trendly.co", "https://trendly.test"));

        assertThatCode(conFallo::enviarPendientes).doesNotThrowAnyException();

        verify(caido, atLeast(2)).send(any(MimeMessage.class));
        assertThat(sinEnviar(ana)).isEqualTo(1);
        assertThat(sinEnviar(eva)).isEqualTo(1);
    }

    @Test
    void sinRemitenteConfiguradoNoIntentaEnviar() {
        alerta(ana, monitoreoDe(ana, "Audífonos"), "BAJA_PRECIO", "NORMAL", null, ahora);
        JavaMailSender enviadorMock = mock(JavaMailSender.class);

        new CorreoAlertasService(pendientes, enviadorMock, plantillas, new CorreoProperties(" ", "https://trendly.test")).enviarPendientes();

        verify(enviadorMock, never()).send(any(MimeMessage.class));
        assertThat(sinEnviar(ana)).isEqualTo(1);
    }
}
