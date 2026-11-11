package co.trendly.tendencia;

import java.math.BigDecimal;
import java.math.RoundingMode;

import co.trendly.monitoreo.Monitoreo;

/**
 * Las tres variables del ranking de tendencias (SCRUM-53), cada una de 0 a 100, y el puntaje que las combina.
 * El cálculo está explicado en el README; si cambia aquí, debe cambiar allá.
 */
final class CalculoTendencia {

    static final double PESO_DEMANDA = 0.4;
    static final double PESO_MARGEN = 0.3;
    static final double PESO_COMPETENCIA = 0.3;

    /** Una búsqueda captura como mucho las 10 primeras posiciones. */
    static final int POSICIONES = Monitoreo.TOP_N_MAXIMO;
    /** Desde 20 vendedores con el mismo producto, la competencia ya es la máxima. */
    static final int TOPE_VENDEDORES = 20;

    private CalculoTendencia() {
    }

    /**
     * La API de MercadoLibre no entrega ventas ni reseñas, así que la demanda se estima con lo que sí entrega: el
     * orden de relevancia de la búsqueda (el puesto 1 vale 100 y el 10 vale 10) y la constancia con que el producto
     * aparece entre los primeros.
     *
     * @param posicionPromedio puesto promedio en las capturas en que apareció (1 es el primero)
     * @param presencia        fracción de las capturas de la búsqueda en que apareció, de 0 a 1
     */
    static BigDecimal demanda(double posicionPromedio, double presencia) {
        double porPosicion = (POSICIONES + 1 - posicionPromedio) * 100 / POSICIONES;
        return redondear(limitar(porPosicion) * Math.clamp(presencia, 0, 1));
    }

    /** Vendedores que ofrecen el mismo producto: 1 vale 5 y de 20 en adelante vale 100. Entre menos, mejor. */
    static BigDecimal competencia(int vendedores) {
        return redondear(limitar(vendedores * 100.0 / TOPE_VENDEDORES));
    }

    /** (precio en MercadoLibre − costo) / precio × 100. Si se vende por debajo del costo, vale 0. */
    static BigDecimal margen(BigDecimal precioVenta, BigDecimal costo) {
        return redondear(limitar(precioVenta.subtract(costo).doubleValue() * 100 / precioVenta.doubleValue()));
    }

    /** 0,4 × demanda + 0,3 × margen + 0,3 × (100 − competencia), con las variables ya redondeadas como se muestran. */
    static BigDecimal puntaje(BigDecimal demanda, BigDecimal margen, BigDecimal competencia) {
        return redondear(PESO_DEMANDA * demanda.doubleValue() + PESO_MARGEN * margen.doubleValue()
                + PESO_COMPETENCIA * (100 - competencia.doubleValue()));
    }

    static BigDecimal redondear(double valor) {
        return BigDecimal.valueOf(valor).setScale(1, RoundingMode.HALF_UP);
    }

    private static double limitar(double valor) {
        return Math.clamp(valor, 0, 100);
    }
}
