package co.trendly.incidencia;

import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.monitoreo.EstadoMonitoreo;
import co.trendly.monitoreo.Monitoreo;
import co.trendly.monitoreo.MonitoreoRepository;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoRepository;
import co.trendly.scraping.TipoFallo;

/** Registra las incidencias del job y arma lo que ve el administrador (SCRUM-45). */
@Service
public class IncidenciaService {

    static final int LIMITE_MAXIMO = 500;

    private final IncidenciaRepository incidencias;
    private final MonitoreoRepository monitoreos;
    private final ProductoRepository productos;
    private final Clock reloj;

    @Autowired
    public IncidenciaService(IncidenciaRepository incidencias, MonitoreoRepository monitoreos, ProductoRepository productos) {
        this(incidencias, monitoreos, productos, Clock.systemUTC());
    }

    IncidenciaService(IncidenciaRepository incidencias, MonitoreoRepository monitoreos, ProductoRepository productos,
            Clock reloj) {
        this.incidencias = incidencias;
        this.monitoreos = monitoreos;
        this.productos = productos;
        this.reloj = reloj;
    }

    public void registrar(Long monitoreoId, TipoFallo tipo, String detalle, int intentos) {
        incidencias.save(new IncidenciaScraping(monitoreoId, tipo, detalle, intentos,
                reloj.instant().truncatedTo(ChronoUnit.MICROS)));
    }

    /**
     * @param tipo   solo las de este tipo; {@code null} para todas
     * @param limite cuántas incidencias traer, las más recientes (máximo {@value #LIMITE_MAXIMO})
     */
    @Transactional(readOnly = true)
    public PanelIncidencias panel(TipoFallo tipo, int limite) {
        Pageable pagina = PageRequest.of(0, Math.clamp(limite, 1, LIMITE_MAXIMO));
        List<IncidenciaScraping> lista = tipo == null ? incidencias.findByOrderByOcurridoEnDescIdDesc(pagina)
                : incidencias.findByTipoOrderByOcurridoEnDescIdDesc(tipo, pagina);
        List<Monitoreo> enError = monitoreos.findByEstadoOrderByIdAsc(EstadoMonitoreo.ERROR);

        Map<Long, Monitoreo> porId = new HashMap<>(monitoreos.findAllById(lista.stream()
                .map(IncidenciaScraping::getMonitoreoId).distinct().toList())
                .stream().collect(Collectors.toMap(Monitoreo::getId, Function.identity())));
        enError.forEach(m -> porId.put(m.getId(), m));
        Map<Long, String> nombres = productos.findAllById(porId.values().stream().map(Monitoreo::getProductoId).distinct().toList())
                .stream().collect(Collectors.toMap(Producto::getId, Producto::getNombre));

        return new PanelIncidencias(
                enError.stream().map(m -> new PanelIncidencias.MonitoreoEnError(m.getId(), m.getProductoId(),
                        nombres.get(m.getProductoId()), m.getMarketplace(), m.getValor(), m.getFallosConsecutivos(),
                        m.getUltimaCaptura())).toList(),
                lista.stream().map(i -> {
                    Monitoreo m = porId.get(i.getMonitoreoId());
                    return new PanelIncidencias.Incidencia(i.getId(), i.getMonitoreoId(), m.getProductoId(),
                            nombres.get(m.getProductoId()), m.getMarketplace(), m.getValor(), m.getEstado(), i.getTipo(),
                            i.getDetalle(), i.getIntentos(), i.getOcurridoEn());
                }).toList());
    }
}
