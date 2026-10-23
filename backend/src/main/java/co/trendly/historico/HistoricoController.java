package co.trendly.historico;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.comun.ErrorDeNegocio;
import co.trendly.seguridad.UsuarioAutenticado;

/** Histórico de un monitoreo para la gráfica de evolución de precios (SCRUM-42/43). Exige token. */
@RestController
public class HistoricoController {

    private final HistoricoService historicoService;

    public HistoricoController(HistoricoService historicoService) {
        this.historicoService = historicoService;
    }

    /**
     * {@code desde} y {@code hasta} son opcionales: fecha y hora ISO ({@code 2026-10-20T15:00:00.000Z}, como las manda
     * el tablero) o solo la fecha ({@code 2026-10-20}, el día completo en UTC).
     */
    @GetMapping("/api/v1/monitoreos/{id}/historico")
    public List<HistoricoResponse> historico(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable Long id, @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {
        return historicoService.consultar(usuario.id(), id, instante(desde, false), instante(hasta, true));
    }

    static Instant instante(String texto, boolean finDelDia) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            if (texto.length() == 10) {
                LocalDate dia = LocalDate.parse(texto);
                return finDelDia ? dia.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC).minusNanos(1000)
                        : dia.atStartOfDay().toInstant(ZoneOffset.UTC);
            }
            return Instant.parse(texto);
        } catch (DateTimeParseException e) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, HistoricoService.MENSAJE_RANGO);
        }
    }
}
