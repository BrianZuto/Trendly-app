package co.trendly.sugerencia;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Respuesta de {@code GET /api/v1/productos/{id}/sugerencia}. Con estado PENDIENTE los demás campos van en {@code null};
 * {@code precioSugerido} también es {@code null} si margen objetivo + comisión llegan al 100 %.
 *
 * @param competitivo {@code false} = "no competitivo con el margen objetivo"
 */
public record SugerenciaResponse(Long productoId, EstadoSugerencia estado, BigDecimal precioSugerido,
        BigDecimal margenResultante, PosicionPrecio posicion, Boolean competitivo, BigDecimal precioMinimoRentable,
        BigDecimal minimoCompetencia, BigDecimal promedioCompetencia, BigDecimal medianaCompetencia,
        Instant calculadoEn) {

    static SugerenciaResponse de(SugerenciaPrecio s) {
        return new SugerenciaResponse(s.getProductoId(), s.getEstado(), s.getSugerido(), s.getMargenResultante(),
                s.getPosicion(), s.getCompetitivo(), s.getMinimoRentable(), s.getMinimo(), s.getPromedio(),
                s.getMediana(), s.getCalculadoEn());
    }
}
