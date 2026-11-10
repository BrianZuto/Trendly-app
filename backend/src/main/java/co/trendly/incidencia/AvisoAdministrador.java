package co.trendly.incidencia;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import co.trendly.alerta.CorreoProperties;
import co.trendly.recoleccion.CicloConMuchosFallos;
import co.trendly.recoleccion.ResumenCiclo;
import co.trendly.usuario.Rol;
import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;

/** Avisa por correo a los administradores cuando en un ciclo falla más del 10 % de los monitoreos (SCRUM-45). */
@Component
public class AvisoAdministrador {

    private static final Logger log = LoggerFactory.getLogger(AvisoAdministrador.class);

    static final String ASUNTO = "Trendly: falló más del 10 % de la recolección de precios";

    private final UsuarioRepository usuarios;
    private final JavaMailSender correo;
    private final CorreoProperties propiedades;

    public AvisoAdministrador(UsuarioRepository usuarios, JavaMailSender correo, CorreoProperties propiedades) {
        this.usuarios = usuarios;
        this.correo = correo;
        this.propiedades = propiedades;
    }

    /** Un SMTP caído no debe afectar el ciclo, que ya dejó la advertencia en el log. */
    @EventListener
    public void avisar(CicloConMuchosFallos evento) {
        if (!propiedades.habilitado()) {
            log.info("Aviso al administrador: sin SMTP_FROM configurado, no se envía correo");
            return;
        }
        ResumenCiclo resumen = evento.resumen();
        for (Usuario admin : usuarios.findByRolAndActivoTrue(Rol.ADMIN)) {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(propiedades.remitente());
            mensaje.setTo(admin.getEmail());
            mensaje.setSubject(ASUNTO);
            mensaje.setText("Hola, " + admin.getNombre() + ". En el último ciclo de recolección fallaron "
                    + resumen.fallidos() + " de " + resumen.procesados() + " monitoreos.\n"
                    + "El detalle está en GET /api/v1/admin/incidencias.");
            try {
                correo.send(mensaje);
            } catch (MailException e) {
                log.warn("Aviso al administrador: no se pudo enviar el correo al usuario {}", admin.getId(), e);
            }
        }
    }
}
