package co.trendly.incidencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import co.trendly.alerta.CorreoProperties;
import co.trendly.recoleccion.CicloConMuchosFallos;
import co.trendly.recoleccion.ResumenCiclo;
import co.trendly.usuario.Plan;
import co.trendly.usuario.Rol;
import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;

/** Aviso a los administradores cuando falla más del 10 % de un ciclo (SCRUM-45). */
class AvisoAdministradorTest {

    private static final CicloConMuchosFallos EVENTO = new CicloConMuchosFallos(
            new ResumenCiclo(Instant.EPOCH, Instant.EPOCH, 10, 7, 3, 7));

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final JavaMailSender correo = mock(JavaMailSender.class);

    @BeforeEach
    void preparar() {
        when(usuarios.findByRolAndActivoTrue(Rol.ADMIN)).thenReturn(List.of(admin("uno@trendly.co"), admin("dos@trendly.co")));
    }

    @Test
    void leEscribeACadaAdministradorConCuantosFallaron() {
        aviso("trendly@correo.co").avisar(EVENTO);

        ArgumentCaptor<SimpleMailMessage> enviados = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(correo, times(2)).send(enviados.capture());
        SimpleMailMessage primero = enviados.getAllValues().getFirst();
        assertThat(primero.getTo()).containsExactly("uno@trendly.co");
        assertThat(primero.getFrom()).isEqualTo("trendly@correo.co");
        assertThat(primero.getSubject()).isEqualTo(AvisoAdministrador.ASUNTO);
        assertThat(primero.getText()).contains("3 de 10");
    }

    @Test
    void sinRemitenteConfiguradoNoEnvia() {
        aviso("").avisar(EVENTO);

        verify(correo, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void unSmtpCaidoNoAfectaElCicloYSigueConElSiguiente() {
        doThrow(new MailSendException("SMTP caído")).when(correo).send(any(SimpleMailMessage.class));

        aviso("trendly@correo.co").avisar(EVENTO);

        verify(correo, times(2)).send(any(SimpleMailMessage.class));
    }

    private AvisoAdministrador aviso(String remitente) {
        return new AvisoAdministrador(usuarios, correo, new CorreoProperties(remitente, "http://localhost:5173"));
    }

    private static Usuario admin(String email) {
        return Usuario.nuevoVendedor("Admin", email, "hash", mock(Plan.class));
    }
}
