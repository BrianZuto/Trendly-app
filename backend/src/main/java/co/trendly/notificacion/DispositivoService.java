package co.trendly.notificacion;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Celulares registrados para recibir notificaciones push (SCRUM-52). */
@Service
public class DispositivoService {

    private final DispositivoPushRepository dispositivos;

    public DispositivoService(DispositivoPushRepository dispositivos) {
        this.dispositivos = dispositivos;
    }

    /** Idempotente: la app lo llama cada vez que inicia sesión. */
    @Transactional
    public void registrar(Long usuarioId, DispositivoRequest solicitud) {
        PlataformaDispositivo plataforma = PlataformaDispositivo.valueOf(solicitud.plataforma());
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MICROS);
        dispositivos.findByToken(solicitud.token()).ifPresentOrElse(
                existente -> existente.asignarA(usuarioId, plataforma, ahora),
                () -> dispositivos.save(new DispositivoPush(usuarioId, solicitud.token(), plataforma, ahora)));
    }

    /** Al cerrar sesión en la app. Un token que no existe o es de otro vendedor no se toca (y no es error). */
    @Transactional
    public void quitar(Long usuarioId, String token) {
        dispositivos.borrarDeUsuario(token, usuarioId);
    }

    @Transactional(readOnly = true)
    public List<DispositivoPush> deUsuarios(Collection<Long> usuarioIds) {
        return dispositivos.findByUsuarioIdIn(usuarioIds);
    }

    @Transactional
    public void olvidar(Collection<String> tokens) {
        if (!tokens.isEmpty()) {
            dispositivos.borrarTokens(tokens);
        }
    }
}
