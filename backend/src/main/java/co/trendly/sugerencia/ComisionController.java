package co.trendly.sugerencia;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.trendly.monitoreo.Marketplace;
import jakarta.validation.Valid;

/** Comisión de cada marketplace (SCRUM-46). Bajo {@code /api/v1/admin}: solo para ADMIN. */
@RestController
@RequestMapping("/api/v1/admin/comisiones")
public class ComisionController {

    private final ComisionService comisiones;

    public ComisionController(ComisionService comisiones) {
        this.comisiones = comisiones;
    }

    @GetMapping
    public List<ComisionResponse> listar() {
        return comisiones.listar();
    }

    @PutMapping("/{marketplace}")
    public ComisionResponse actualizar(@PathVariable Marketplace marketplace, @Valid @RequestBody ComisionRequest solicitud) {
        return comisiones.actualizar(marketplace, solicitud.comisionPct());
    }
}
