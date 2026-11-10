package co.trendly.reporte;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Textos de los reportes con el mismo formato del tablero: $66.000 y +10,0 %. */
final class Formato {

    private static final DecimalFormatSymbols COLOMBIA = DecimalFormatSymbols.getInstance(Locale.of("es", "CO"));
    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(Reporte.COLOMBIA);
    private static final DateTimeFormatter DIA = DateTimeFormatter.ISO_LOCAL_DATE;

    /** Sin datos: un guion largo, como en el tablero. */
    static final String SIN_DATO = "—";

    private Formato() {
    }

    static String pesos(BigDecimal valor) {
        return valor == null ? SIN_DATO : "$" + new DecimalFormat("#,##0", COLOMBIA).format(valor.setScale(0, RoundingMode.HALF_UP));
    }

    static String porcentaje(BigDecimal valor) {
        return valor == null ? SIN_DATO : new DecimalFormat("0.0", COLOMBIA).format(valor) + " %";
    }

    static String variacion(BigDecimal valor) {
        return valor == null ? SIN_DATO : new DecimalFormat("+0.0;-0.0", COLOMBIA).format(valor) + " %";
    }

    static String fechaHora(Instant instante) {
        return FECHA_HORA.format(instante);
    }

    static String dia(LocalDate dia) {
        return DIA.format(dia);
    }
}
