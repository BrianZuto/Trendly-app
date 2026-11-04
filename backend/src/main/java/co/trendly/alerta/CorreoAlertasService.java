package co.trendly.alerta;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Envía las alertas por correo (SCRUM-48): uno por vendedor, con todas sus alertas pendientes. Lo que no se pueda enviar
 * queda pendiente para el próximo ciclo, salvo que ya tenga más de {@link #VIGENCIA}: un aviso de precio viejo no sirve,
 * y así quien reactive los correos no recibe todo lo que se perdió.
 */
@Service
public class CorreoAlertasService {

    private static final Logger log = LoggerFactory.getLogger(CorreoAlertasService.class);

    static final Duration VIGENCIA = Duration.ofHours(24);

    private final AlertasPendientesService pendientes;
    private final JavaMailSender correo;
    private final TemplateEngine plantillas;
    private final CorreoProperties propiedades;
    private final Clock reloj;

    @Autowired
    public CorreoAlertasService(AlertasPendientesService pendientes, JavaMailSender correo, TemplateEngine plantillas,
            CorreoProperties propiedades) {
        this(pendientes, correo, plantillas, propiedades, Clock.systemUTC());
    }

    CorreoAlertasService(AlertasPendientesService pendientes, JavaMailSender correo, TemplateEngine plantillas,
            CorreoProperties propiedades, Clock reloj) {
        this.pendientes = pendientes;
        this.correo = correo;
        this.plantillas = plantillas;
        this.propiedades = propiedades;
        this.reloj = reloj;
    }

    /** Un vendedor que falla no impide los correos de los demás. */
    public void enviarPendientes() {
        if (!propiedades.habilitado()) {
            log.info("Correo de alertas: sin SMTP_FROM configurado, no se envía nada");
            return;
        }
        Instant ahora = reloj.instant().truncatedTo(ChronoUnit.MICROS);
        for (CorreoVendedor vendedor : pendientes.correosDesde(ahora.minus(VIGENCIA))) {
            try {
                correo.send(mensaje(vendedor));
                pendientes.marcarEnviadas(vendedor.alertaIds(), ahora);
            } catch (MailException | MessagingException e) {
                log.warn("Correo de alertas: no se pudo enviar al usuario {}; se reintenta en el próximo ciclo",
                        vendedor.usuarioId(), e);
            }
        }
    }

    private MimeMessage mensaje(CorreoVendedor vendedor) throws MessagingException {
        Context contexto = new Context();
        contexto.setVariable("nombre", vendedor.nombre());
        contexto.setVariable("filas", vendedor.filas());
        contexto.setVariable("baseUrl", baseUrl());
        MimeMessage mensaje = correo.createMimeMessage();
        MimeMessageHelper ayudante = new MimeMessageHelper(mensaje, true, StandardCharsets.UTF_8.name());
        ayudante.setFrom(propiedades.remitente());
        ayudante.setTo(vendedor.email());
        ayudante.setSubject(asunto(vendedor.filas().size()));
        ayudante.setText(textoPlano(vendedor), plantillas.process("correo/alertas", contexto));
        return mensaje;
    }

    /** Para los clientes de correo que no muestran HTML. */
    private String textoPlano(CorreoVendedor vendedor) {
        StringBuilder texto = new StringBuilder("Hola, ").append(vendedor.nombre())
                .append(". Esto cambió en la competencia de tus productos:\n");
        for (CorreoVendedor.Fila fila : vendedor.filas()) {
            texto.append("\n").append(fila.producto()).append(": ").append(fila.tipo())
                    .append("\nCompetidor: ").append(fila.competidor())
                    .append("\nAntes: ").append(fila.precioAnterior())
                    .append("\nAhora: ").append(fila.precioNuevo()).append(" (").append(fila.variacion()).append(")");
            if (fila.precioSugerido() != null) {
                texto.append("\nPrecio sugerido: ").append(fila.precioSugerido());
            }
            texto.append("\nVer en Trendly: ").append(baseUrl()).append("/productos/").append(fila.productoId()).append("\n");
        }
        return texto.toString();
    }

    private String baseUrl() {
        return StringUtils.trimTrailingCharacter(propiedades.frontendUrl(), '/');
    }

    private static String asunto(int alertas) {
        return alertas == 1 ? "Trendly: 1 alerta de precio" : "Trendly: " + alertas + " alertas de precio";
    }
}
