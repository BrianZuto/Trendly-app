package co.trendly.reporte;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.historico.HistoricoController;
import co.trendly.reporte.ReporteService.ArchivoReporte;
import co.trendly.seguridad.UsuarioAutenticado;

/** Descarga del reporte de un producto propio (SCRUM-50). Exige token; un producto ajeno responde 404. */
@RestController
public class ReporteController {

    private final ReporteService reportes;

    public ReporteController(ReporteService reportes) {
        this.reportes = reportes;
    }

    /** {@code desde} y {@code hasta} son opcionales y se escriben como en el histórico (SCRUM-42). */
    @GetMapping("/api/v1/reportes")
    public ResponseEntity<byte[]> descargar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestParam String formato, @RequestParam Long productoId,
            @RequestParam(required = false) String desde, @RequestParam(required = false) String hasta) {
        ArchivoReporte archivo = reportes.generar(usuario.id(), productoId, FormatoReporte.de(formato),
                HistoricoController.instante(desde, false), HistoricoController.instante(hasta, true));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(archivo.tipoContenido()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(archivo.nombre()).build().toString())
                .body(archivo.contenido());
    }
}
