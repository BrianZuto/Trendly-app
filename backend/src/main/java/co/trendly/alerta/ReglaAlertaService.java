package co.trendly.alerta;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reglas de alerta del vendedor (SCRUM-47). El cambio se aplica desde la siguiente captura. */
@Service
public class ReglaAlertaService {

    private final ReglaAlertaRepository reglas;

    public ReglaAlertaService(ReglaAlertaRepository reglas) {
        this.reglas = reglas;
    }

    /** La regla guardada o, si no ha configurado ninguna, los valores por defecto (sin guardarlos). */
    @Transactional(readOnly = true)
    public ReglaAlerta deUsuario(Long usuarioId) {
        return reglas.findById(usuarioId).orElseGet(() -> new ReglaAlerta(usuarioId));
    }

    @Transactional
    public ReglaAlertaResponse actualizar(Long usuarioId, ReglaAlertaRequest solicitud) {
        ReglaAlerta regla = deUsuario(usuarioId);
        regla.actualizar(solicitud.umbralPct(), solicitud.avisarDisponibilidad(), solicitud.recibirCorreos(),
                Instant.now().truncatedTo(ChronoUnit.MICROS));
        return ReglaAlertaResponse.de(reglas.save(regla));
    }
}
