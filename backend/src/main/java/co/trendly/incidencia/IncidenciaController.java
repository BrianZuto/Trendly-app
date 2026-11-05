package co.trendly.incidencia;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.comun.ErrorDeNegocio;
import co.trendly.scraping.TipoFallo;

/** Incidencias y monitoreos en ERROR (SCRUM-45). Solo ADMIN: lo exige {@code SecurityConfig} para {@code /admin/**}. */
@RestController
public class IncidenciaController {

    static final String TIPO_INVALIDO = "El tipo debe ser TIMEOUT, BLOQUEO, NO_ENCONTRADO, ESTRUCTURA o DATO_INVALIDO";

    private final IncidenciaService incidencias;

    public IncidenciaController(IncidenciaService incidencias) {
        this.incidencias = incidencias;
    }

    @GetMapping("/api/v1/admin/incidencias")
    public PanelIncidencias panel(@RequestParam(required = false) String tipo,
            @RequestParam(defaultValue = "100") int limite) {
        return incidencias.panel(tipoDe(tipo), limite);
    }

    private static TipoFallo tipoDe(String tipo) {
        if (tipo == null || tipo.isBlank()) {
            return null;
        }
        try {
            return TipoFallo.valueOf(tipo.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ErrorDeNegocio(HttpStatus.BAD_REQUEST, TIPO_INVALIDO);
        }
    }
}
