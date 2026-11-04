package co.trendly.sugerencia;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;

/**
 * Regla del precio sugerido (SCRUM-46). Los montos van en COP con IVA incluido y los porcentajes de 0 a 100.
 *
 * <ul>
 * <li>Precio mínimo rentable = costo ÷ (1 − margen objetivo − comisión). Se redondea hacia arriba para no perder margen.</li>
 * <li>Si el mínimo de la competencia alcanza el mínimo rentable, se sugiere ese mínimo × 0,99, sin bajar del mínimo
 * rentable. Si no, se sugiere el mínimo rentable y el producto queda "no competitivo".</li>
 * <li>Si margen + comisión llegan al 100 %, ningún precio cumple el objetivo: no hay sugerencia.</li>
 * </ul>
 */
final class CalculadoraPrecio {

    private static final BigDecimal CIEN = BigDecimal.valueOf(100);
    private static final BigDecimal DOS = BigDecimal.valueOf(2);
    private static final BigDecimal BAJO_LA_COMPETENCIA = new BigDecimal("0.99");

    private CalculadoraPrecio() {
    }

    /** @param margenResultante después de la comisión, para que sea comparable con el margen objetivo */
    record Calculo(BigDecimal minimo, BigDecimal promedio, BigDecimal mediana, BigDecimal minimoRentable,
            BigDecimal sugerido, BigDecimal margenResultante, PosicionPrecio posicion, boolean competitivo) {
    }

    /** @param competencia precios vigentes de la competencia; al menos uno */
    static Calculo calcular(BigDecimal costo, BigDecimal precioVenta, BigDecimal margenObjetivo, BigDecimal comision,
            List<BigDecimal> competencia) {
        List<BigDecimal> precios = competencia.stream().sorted().toList();
        BigDecimal minimo = precios.getFirst();
        BigDecimal rentable = minimoRentable(costo, margenObjetivo, comision);
        boolean competitivo = rentable != null && minimo.compareTo(rentable) >= 0;
        BigDecimal sugerido = rentable;
        if (competitivo) {
            sugerido = minimo.multiply(BAJO_LA_COMPETENCIA).setScale(2, RoundingMode.HALF_UP).max(rentable);
        }
        return new Calculo(minimo, promedio(precios), mediana(precios), rentable, sugerido,
                sugerido == null ? null : margen(sugerido, costo, comision), posicion(precioVenta, precios), competitivo);
    }

    private static BigDecimal minimoRentable(BigDecimal costo, BigDecimal margenObjetivo, BigDecimal comision) {
        BigDecimal restante = CIEN.subtract(margenObjetivo).subtract(comision);
        if (restante.signum() <= 0) {
            return null;
        }
        return costo.multiply(CIEN).divide(restante, 2, RoundingMode.CEILING);
    }

    private static BigDecimal margen(BigDecimal precio, BigDecimal costo, BigDecimal comision) {
        BigDecimal cobrado = precio.multiply(comision).divide(CIEN, MathContext.DECIMAL64);
        return precio.subtract(costo).subtract(cobrado).multiply(CIEN).divide(precio, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal promedio(List<BigDecimal> precios) {
        return precios.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(precios.size()), 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal mediana(List<BigDecimal> ordenados) {
        int mitad = ordenados.size() / 2;
        if (ordenados.size() % 2 == 1) {
            return ordenados.get(mitad);
        }
        return ordenados.get(mitad - 1).add(ordenados.get(mitad)).divide(DOS, 2, RoundingMode.HALF_UP);
    }

    private static PosicionPrecio posicion(BigDecimal precioVenta, List<BigDecimal> ordenados) {
        if (precioVenta.compareTo(ordenados.getFirst()) < 0) {
            return PosicionPrecio.MAS_BARATO;
        }
        return precioVenta.compareTo(ordenados.getLast()) > 0 ? PosicionPrecio.MAS_CARO : PosicionPrecio.EN_RANGO;
    }
}
