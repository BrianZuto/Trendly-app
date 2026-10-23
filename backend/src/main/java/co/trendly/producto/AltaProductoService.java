package co.trendly.producto;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.monitoreo.MonitoreoRequest;
import co.trendly.monitoreo.MonitoreoService;

/**
 * Alta de un producto con la vigilancia de su reventa: crea el producto (SCRUM-33) y, si viene {@code reventa}, un
 * monitoreo por palabra clave en cada marketplace elegido (SCRUM-37). Todo en una transacción: si un monitoreo no es
 * válido, tampoco queda el producto.
 */
@Service
public class AltaProductoService {

    private final ProductoService productos;
    private final MonitoreoService monitoreos;

    public AltaProductoService(ProductoService productos, MonitoreoService monitoreos) {
        this.productos = productos;
        this.monitoreos = monitoreos;
    }

    @Transactional
    public ProductoResponse crear(Long usuarioId, ProductoRequest solicitud) {
        ProductoResponse creado = productos.crear(usuarioId, solicitud);
        ProductoRequest.ReventaRequest reventa = solicitud.reventa();
        if (reventa != null) {
            for (String marketplace : reventa.marketplaces()) {
                monitoreos.crear(usuarioId, creado.id(), new MonitoreoRequest("PALABRA_CLAVE",
                        reventa.palabraClave(), marketplace, reventa.topN(), null));
            }
        }
        return creado;
    }
}
