package co.trendly.alerta;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import co.trendly.historico.PrecioActualizado;

/**
 * Decide si un precio nuevo merece una alerta (SCRUM-47). Compara en COP con la captura anterior de la misma publicación.
 * Un cambio de disponibilidad manda sobre el de precio; el precio de una publicación agotada no genera alerta.
 */
final class DetectorCambios {

    private static final BigDecimal CIEN = BigDecimal.valueOf(100);
    private static final BigDecimal DOS = BigDecimal.valueOf(2);
    /** Lo máximo que cabe en {@code alerta.variacion_pct}. */
    private static final BigDecimal VARIACION_MAXIMA = new BigDecimal("99999.99");

    /** Primero las de relevancia alta y, entre iguales, la mayor variación. */
    private static final Comparator<Cambio> MAS_IMPORTANTE = Comparator
            .comparing((Cambio c) -> c.relevancia() == RelevanciaAlerta.ALTA)
            .thenComparing(c -> c.variacionPct().abs());

    private DetectorCambios() {
    }

    record Cambio(TipoAlerta tipo, RelevanciaAlerta relevancia, BigDecimal variacionPct, PrecioActualizado precio) {
    }

    /** Máximo una alerta por monitoreo en cada ciclo: de todos los cambios de la captura, el más importante. */
    static Optional<Cambio> masImportante(List<PrecioActualizado> precios, BigDecimal umbralPct, boolean avisarDisponibilidad) {
        return precios.stream()
                .flatMap(p -> detectar(p, umbralPct, avisarDisponibilidad).stream())
                .max(MAS_IMPORTANTE);
    }

    static Optional<Cambio> detectar(PrecioActualizado precio, BigDecimal umbralPct, boolean avisarDisponibilidad) {
        BigDecimal anterior = precio.precioAnteriorCop();
        if (anterior == null || anterior.signum() <= 0) {
            return Optional.empty();
        }
        // Sin dividir: 4,996 % no debe redondearse a 5 % y pasar por encima del umbral
        BigDecimal diferencia = precio.precioCop().subtract(anterior);
        BigDecimal escalada = diferencia.abs().multiply(CIEN);
        BigDecimal limite = umbralPct.multiply(anterior);
        Optional<TipoAlerta> tipo = tipo(precio, diferencia, escalada.compareTo(limite) >= 0, avisarDisponibilidad);
        RelevanciaAlerta relevancia = escalada.compareTo(limite.multiply(DOS)) >= 0 ? RelevanciaAlerta.ALTA
                : RelevanciaAlerta.NORMAL;
        return tipo.map(t -> new Cambio(t, relevancia, variacion(diferencia, anterior), precio));
    }

    private static Optional<TipoAlerta> tipo(PrecioActualizado precio, BigDecimal diferencia, boolean superaUmbral,
            boolean avisarDisponibilidad) {
        boolean cambioDisponibilidad = precio.disponibleAnterior() != null && precio.disponibleAnterior() != precio.disponible();
        if (cambioDisponibilidad && avisarDisponibilidad) {
            return Optional.of(precio.disponible() ? TipoAlerta.DISPONIBLE : TipoAlerta.AGOTADO);
        }
        if (precio.disponible() && superaUmbral) {
            return Optional.of(diferencia.signum() < 0 ? TipoAlerta.BAJA_PRECIO : TipoAlerta.SUBIDA_PRECIO);
        }
        return Optional.empty();
    }

    private static BigDecimal variacion(BigDecimal diferencia, BigDecimal anterior) {
        return diferencia.multiply(CIEN).divide(anterior, 2, RoundingMode.HALF_UP)
                .min(VARIACION_MAXIMA).max(VARIACION_MAXIMA.negate());
    }
}
