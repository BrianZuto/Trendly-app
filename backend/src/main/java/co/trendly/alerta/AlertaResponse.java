package co.trendly.alerta;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Una alerta tal como la ve su dueño en la bandeja (SCRUM-49). Trae lo necesario para decidir sin otra consulta:
 * el producto con su precio y margen actuales, el competidor, el cambio y el precio sugerido con su margen.
 * La mini gráfica se arma con {@code GET /monitoreos/{monitoreoId}/historico}, filtrando por {@code publicacionId}.
 *
 * @param margenSugerido margen del producto si se vende al precio sugerido; {@code null} si no hay sugerido
 * @param decision {@code null} mientras la alerta no esté cerrada
 */
public record AlertaResponse(Long id, TipoAlerta tipo, RelevanciaAlerta relevancia, EstadoAlerta estado,
        Instant creadoEn, Long monitoreoId, String publicacionId, Long productoId, String productoNombre,
        BigDecimal precioVentaActual, BigDecimal margenActual, BigDecimal margenObjetivo, String competidor,
        String tituloPublicacion, BigDecimal precioAnterior, BigDecimal precioNuevo, BigDecimal variacionPct,
        BigDecimal precioSugerido, BigDecimal margenSugerido, Decision decision) {

    public record Decision(AccionDecision accion, BigDecimal precioAnterior, BigDecimal precioFinal, String motivo,
            Instant decididoEn) {

        static Decision de(DecisionPrecio d) {
            return d == null ? null
                    : new Decision(d.getAccion(), d.getPrecioAnterior(), d.getPrecioFinal(), d.getMotivo(),
                            d.getDecididoEn());
        }
    }
}
