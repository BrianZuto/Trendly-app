package co.trendly.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/** Pruebas unitarias del registro (SCRUM-30), sin Spring ni base de datos. */
class RegistroServiceTest {

    private UsuarioRepository usuarios;
    private PlanRepository planes;
    private PasswordEncoder passwordEncoder;
    private RegistroService servicio;
    private Plan gratuito;

    @BeforeEach
    void preparar() {
        usuarios = mock(UsuarioRepository.class);
        planes = mock(PlanRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        servicio = new RegistroService(usuarios, planes, passwordEncoder);

        gratuito = instanciar(Plan.class);
        ReflectionTestUtils.setField(gratuito, "id", 1L);
        ReflectionTestUtils.setField(gratuito, "nombre", Plan.GRATUITO);
        ReflectionTestUtils.setField(gratuito, "maxProductos", 10);
        when(planes.findByNombre(Plan.GRATUITO)).thenReturn(Optional.of(gratuito));
        when(passwordEncoder.encode("Secreta123")).thenReturn("hash-bcrypt");
        when(usuarios.saveAndFlush(any(Usuario.class))).thenAnswer(invocacion -> {
            Usuario guardado = invocacion.getArgument(0);
            ReflectionTestUtils.setField(guardado, "id", 7L);
            return guardado;
        });
    }

    @Test
    void creaUnVendedorConPlanGratuitoYConstanciaDeLaPolitica() {
        UsuarioResponse respuesta = servicio.registrar(solicitud("  Ana Pérez ", " Ana@Correo.CO ", true));

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).saveAndFlush(captor.capture());
        Usuario guardado = captor.getValue();
        assertThat(guardado.getNombre()).isEqualTo("Ana Pérez");
        assertThat(guardado.getEmail()).isEqualTo("ana@correo.co");
        assertThat(guardado.getPasswordHash()).isEqualTo("hash-bcrypt");
        assertThat(guardado.getRol()).isEqualTo(Rol.VENDEDOR);
        assertThat(guardado.getPlan()).isSameAs(gratuito);
        assertThat(guardado.isAceptaPoliticaDatos()).isTrue();
        assertThat(guardado.getFechaAceptacion()).isNotNull();
        assertThat(guardado.isActivo()).isTrue();

        assertThat(respuesta).isEqualTo(new UsuarioResponse(7L, "Ana Pérez", "ana@correo.co", Rol.VENDEDOR,
                new UsuarioResponse.PlanResponse(1L, Plan.GRATUITO, 10)));
    }

    @Test
    void unEmailRepetidoNoSeGuarda() {
        when(usuarios.existsByEmail("ana@correo.co")).thenReturn(true);

        assertThatThrownBy(() -> servicio.registrar(solicitud("Ana", "ANA@correo.co", true)))
                .isInstanceOf(EmailYaRegistradoException.class)
                .hasMessage(EmailYaRegistradoException.MENSAJE);
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test
    void siLaBaseDeDatosRechazaElEmailTambienEsRepetido() {
        when(usuarios.saveAndFlush(any(Usuario.class))).thenThrow(new DataIntegrityViolationException("uk_usuario_email"));

        assertThatThrownBy(() -> servicio.registrar(solicitud("Ana", "ana@correo.co", true)))
                .isInstanceOf(EmailYaRegistradoException.class);
    }

    @Test
    void sinAceptarLaPoliticaNoSeRegistra() {
        assertThatThrownBy(() -> servicio.registrar(solicitud("Ana", "ana@correo.co", false)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(RegistroRequest.MENSAJE_POLITICA);
        assertThatThrownBy(() -> servicio.registrar(solicitud("Ana", "ana@correo.co", null)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test
    void fallaSiNoExisteElPlanGratuito() {
        when(planes.findByNombre(Plan.GRATUITO)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.registrar(solicitud("Ana", "ana@correo.co", true)))
                .isInstanceOf(IllegalStateException.class);
    }

    private static RegistroRequest solicitud(String nombre, String email, Boolean aceptaPolitica) {
        return new RegistroRequest(nombre, email, "Secreta123", aceptaPolitica);
    }

    private static <T> T instanciar(Class<T> clase) {
        try {
            var constructor = clase.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
