package co.trendly.alerta;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import co.trendly.notificacion.ClienteExpoPush;
import co.trendly.notificacion.DispositivoPush;
import co.trendly.notificacion.DispositivoService;
import co.trendly.notificacion.MensajePush;
import co.trendly.notificacion.PushProperties;
import co.trendly.notificacion.ResultadoPush;

/**
 * Envía las alertas como notificaciones push (SCRUM-52), en el mismo momento que el correo (SCRUM-48): una notificación
 * por alerta y por celular, para que al tocarla se abra esa alerta. Igual que con el correo, lo que no se pueda enviar
 * queda pendiente para el próximo ciclo hasta que caduca ({@link CorreoAlertasService#VIGENCIA}).
 */
@Service
public class PushAlertasService {

    private static final Logger log = LoggerFactory.getLogger(PushAlertasService.class);
    private static final Locale ESPANOL = Locale.of("es", "CO");

    private final AlertasPendientesService pendientes;
    private final DispositivoService dispositivos;
    private final ClienteExpoPush expo;
    private final PushProperties propiedades;
    private final Clock reloj;

    @Autowired
    public PushAlertasService(AlertasPendientesService pendientes, DispositivoService dispositivos, ClienteExpoPush expo,
            PushProperties propiedades) {
        this(pendientes, dispositivos, expo, propiedades, Clock.systemUTC());
    }

    PushAlertasService(AlertasPendientesService pendientes, DispositivoService dispositivos, ClienteExpoPush expo,
            PushProperties propiedades, Clock reloj) {
        this.pendientes = pendientes;
        this.dispositivos = dispositivos;
        this.expo = expo;
        this.propiedades = propiedades;
        this.reloj = reloj;
    }

    /** Un vendedor que falla no impide las notificaciones de los demás. */
    public void enviarPendientes() {
        if (!propiedades.habilitado()) {
            log.info("Notificaciones push deshabilitadas (trendly.push.habilitado=false)");
            return;
        }
        Instant ahora = reloj.instant().truncatedTo(ChronoUnit.MICROS);
        List<CorreoVendedor> porVendedor = pendientes.pushDesde(ahora.minus(CorreoAlertasService.VIGENCIA));
        if (porVendedor.isEmpty()) {
            return;
        }
        Map<Long, List<DispositivoPush>> celulares = dispositivos
                .deUsuarios(porVendedor.stream().map(CorreoVendedor::usuarioId).toList()).stream()
                .collect(Collectors.groupingBy(DispositivoPush::getUsuarioId));
        for (CorreoVendedor vendedor : porVendedor) {
            List<DispositivoPush> suyos = celulares.getOrDefault(vendedor.usuarioId(), List.of());
            if (!suyos.isEmpty()) {
                enviar(vendedor, suyos, ahora);
            }
        }
    }

    private void enviar(CorreoVendedor vendedor, List<DispositivoPush> suyos, Instant ahora) {
        List<MensajePush> mensajes = new ArrayList<>();
        for (CorreoVendedor.Fila fila : vendedor.filas()) {
            for (DispositivoPush celular : suyos) {
                mensajes.add(mensaje(celular.getToken(), fila));
            }
        }
        try {
            List<ResultadoPush> resultados = expo.enviar(mensajes);
            dispositivos.olvidar(resultados.stream().filter(ResultadoPush::dispositivoNoRegistrado)
                    .map(ResultadoPush::token).distinct().toList());
            pendientes.marcarEnviadasPush(vendedor.alertaIds(), ahora);
        } catch (IllegalStateException e) {
            log.warn("Notificaciones push: no se pudieron enviar al usuario {}; se reintenta en el próximo ciclo",
                    vendedor.usuarioId(), e);
        }
    }

    /** "Audífonos: bajó de precio" / "Tienda Uno: $ 100.000 → $ 90.000 (-10 %). Sugerido: $ 89.100". */
    static MensajePush mensaje(String token, CorreoVendedor.Fila fila) {
        String titulo = fila.producto() + ": " + fila.tipo().toLowerCase(ESPANOL);
        StringBuilder cuerpo = new StringBuilder(fila.competidor());
        if (fila.precioAnterior() != null && fila.precioNuevo() != null) {
            cuerpo.append(": ").append(fila.precioAnterior()).append(" → ").append(fila.precioNuevo())
                    .append(" (").append(fila.variacion()).append(")");
        }
        if (fila.precioSugerido() != null) {
            cuerpo.append(". Sugerido: ").append(fila.precioSugerido());
        }
        return new MensajePush(token, titulo, cuerpo.toString(),
                Map.of("alertaId", fila.alertaId(), "url", "/alerta/" + fila.alertaId()));
    }
}
