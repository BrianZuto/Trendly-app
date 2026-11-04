package co.trendly.alerta;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.historico.CapturaGuardada;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoRepository;
import co.trendly.sugerencia.SugerenciaService;

/** Crea las alertas de una captura según las reglas del dueño del producto (SCRUM-47). */
@Service
public class AlertaService {

    private final AlertaRepository alertas;
    private final ProductoRepository productos;
    private final ReglaAlertaService reglas;
    private final SugerenciaService sugerencias;

    public AlertaService(AlertaRepository alertas, ProductoRepository productos, ReglaAlertaService reglas,
            SugerenciaService sugerencias) {
        this.alertas = alertas;
        this.productos = productos;
        this.reglas = reglas;
        this.sugerencias = sugerencias;
    }

    /** @return la alerta creada; vacío si nada superó el umbral o si el producto ya se borró */
    @Transactional
    public Optional<Alerta> evaluar(CapturaGuardada captura) {
        return productos.findById(captura.productoId()).map(Producto::getUsuarioId).flatMap(usuarioId -> {
            ReglaAlerta regla = reglas.deUsuario(usuarioId);
            return DetectorCambios.masImportante(captura.precios(), regla.getUmbralPct(), regla.isAvisarDisponibilidad())
                    .map(cambio -> alertas.save(new Alerta(usuarioId, cambio,
                            sugerencias.sugeridoVigente(captura.productoId()).orElse(null))));
        });
    }
}
