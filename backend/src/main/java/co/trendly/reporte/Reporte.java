package co.trendly.reporte;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import co.trendly.alerta.Alerta;
import co.trendly.alerta.DecisionPrecio;
import co.trendly.historico.HistoricoPrecio;

/**
 * Los datos de un reporte (SCRUM-50), listos para escribirlos en Excel o en PDF.
 *
 * @param historico las capturas del periodo, para la hoja de Excel
 * @param dias      las mismas capturas, una fila por día, para el PDF
 * @param alertas   las alertas del periodo, con su decisión si ya la tienen
 */
record Reporte(String producto, String sku, Instant desde, Instant hasta, Instant generadoEn, Metricas metricas,
        List<HistoricoPrecio> historico, List<CalculoCompetencia.ResumenDia> dias, List<FilaAlerta> alertas) {

    /** Las fechas de los reportes van en hora de Colombia. */
    static final ZoneId COLOMBIA = ZoneId.of("America/Bogota");

    record Metricas(BigDecimal miPrecio, CalculoCompetencia.Competencia competencia, BigDecimal margenActual,
            BigDecimal margenObjetivo, int alertas, long aceptadas, long ajustadas, long descartadas,
            CalculoCompetencia.Variacion variacion) {
    }

    /** @param decision {@code null} si el vendedor todavía no la ha decidido */
    record FilaAlerta(Alerta alerta, DecisionPrecio decision) {
    }

    /** Una fila del resumen, igual en el Excel y en el PDF. */
    record Metrica(String nombre, TipoValor tipo, BigDecimal valor, String nota) {
    }

    enum TipoValor {
        PESOS,
        PORCENTAJE,
        /** Porcentaje con signo: +10,0 % o -5,0 %. */
        VARIACION,
        CANTIDAD
    }

    /** El resumen, en un solo lugar para que el Excel y el PDF no se puedan contradecir. */
    List<Metrica> resumen() {
        Metricas m = metricas;
        CalculoCompetencia.Competencia c = m.competencia();
        CalculoCompetencia.Variacion v = m.variacion();
        return List.of(
                new Metrica("Mi precio actual", TipoValor.PESOS, m.miPrecio(), "Precio de venta"),
                new Metrica("Mínimo de la competencia", TipoValor.PESOS, c.minimo(),
                        c.minimo() == null ? "Sin publicaciones con stock" : dondeEsta(c)),
                new Metrica("Promedio de la competencia", TipoValor.PESOS, c.promedio(), c.conStock() + " publicaciones con stock"),
                new Metrica("Diferencia frente al mínimo", TipoValor.VARIACION, c.diferenciaPct(), "Mi precio frente al más barato"),
                new Metrica("Margen actual", TipoValor.PORCENTAJE, m.margenActual(), "(precio - costo) / precio"),
                new Metrica("Margen objetivo", TipoValor.PORCENTAJE, m.margenObjetivo(), ""),
                new Metrica("Alertas del periodo", TipoValor.CANTIDAD, BigDecimal.valueOf(m.alertas()), ""),
                new Metrica("Decisiones aceptadas", TipoValor.CANTIDAD, BigDecimal.valueOf(m.aceptadas()), "Precio sugerido aplicado"),
                new Metrica("Decisiones ajustadas", TipoValor.CANTIDAD, BigDecimal.valueOf(m.ajustadas()), "Precio elegido por el vendedor"),
                new Metrica("Decisiones descartadas", TipoValor.CANTIDAD, BigDecimal.valueOf(m.descartadas()), "El precio no cambió"),
                new Metrica("Variación del periodo", TipoValor.VARIACION, v == null ? null : v.porcentaje(),
                        v == null ? "Sin capturas suficientes" : "Mínimo de la competencia: de " + entero(v.inicial()) + " a " + entero(v.fin())));
    }

    private static String dondeEsta(CalculoCompetencia.Competencia c) {
        return c.vendedor() == null ? c.fuente() : c.fuente() + " · " + c.vendedor();
    }

    private static String entero(BigDecimal valor) {
        return Formato.pesos(valor);
    }
}
