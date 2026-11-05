package co.trendly.reporte;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Métricas de la competencia con las mismas fórmulas del tablero ({@code frontend/.../dashboard/tablero.js}), para que
 * el reporte y el tablero digan lo mismo. Si cambia una, debe cambiar la otra.
 */
final class CalculoCompetencia {

    /** Como en el tablero: los precios "de hoy" salen de las capturas de los últimos 90 días. */
    static final Duration VENTANA = Duration.ofDays(90);
    /** Las capturas llegan cada 6 horas: el tiempo se parte en tramos de 6 h. */
    private static final long TRAMO_MS = Duration.ofHours(6).toMillis();
    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    /** Una captura de una publicación. */
    record Punto(String fuente, String idPublicacion, String vendedor, Instant capturadoEn, BigDecimal precioCop,
            boolean disponible) {

        private String clave() {
            return fuente + "|" + idPublicacion;
        }
    }

    /** {@code resumir} del tablero: con la captura más reciente de cada publicación con stock. */
    record Competencia(BigDecimal minimo, String fuente, String vendedor, BigDecimal promedio, int conStock,
            BigDecimal diferenciaPct) {

        static final Competencia VACIA = new Competencia(null, null, null, null, 0, null);
    }

    /** {@code leer} del tablero: cómo se movió el mínimo de la competencia en el periodo. */
    record Variacion(BigDecimal inicial, BigDecimal fin, BigDecimal porcentaje) {
    }

    /** El mercado en un día: la última captura de ese día de cada publicación con stock. */
    record ResumenDia(LocalDate dia, BigDecimal minimo, BigDecimal promedio, int conStock) {
    }

    private CalculoCompetencia() {
    }

    /** @param puntos en orden de fecha */
    static Competencia competencia(List<Punto> puntos, BigDecimal precioPropio) {
        List<Punto> vigentes = ultimaDeCadaPublicacion(puntos).stream().filter(Punto::disponible).toList();
        if (vigentes.isEmpty()) {
            return Competencia.VACIA;
        }
        Punto masBarato = vigentes.stream().min(Comparator.comparing(Punto::precioCop)).orElseThrow();
        BigDecimal minimo = masBarato.precioCop();
        BigDecimal diferencia = precioPropio.subtract(minimo).multiply(CIEN).divide(minimo, 6, RoundingMode.HALF_UP);
        return new Competencia(minimo, masBarato.fuente(), masBarato.vendedor(), promedio(vigentes, 0), vigentes.size(),
                redondear(diferencia));
    }

    /** {@code null} si no hay por lo menos dos tramos con precio, y entonces no hay nada que comparar. */
    static Variacion variacion(List<Punto> puntos, Instant desde, Instant hasta) {
        List<Long> marcas = tramos(desde, hasta);
        Map<String, List<Punto>> porPublicacion = puntos.stream()
                .collect(Collectors.groupingBy(Punto::clave, LinkedHashMap::new, Collectors.toList()));
        List<List<BigDecimal>> valores = porPublicacion.values().stream().map(pub -> valoresEnTramos(pub, marcas)).toList();

        List<BigDecimal> minimos = new ArrayList<>();
        for (int i = 0; i < marcas.size(); i++) {
            int tramo = i;
            valores.stream().map(v -> v.get(tramo)).filter(v -> v != null).min(Comparator.naturalOrder()).ifPresent(minimos::add);
        }
        if (minimos.size() < 2) {
            return null;
        }
        BigDecimal inicial = minimos.getFirst();
        BigDecimal fin = minimos.getLast();
        return new Variacion(inicial, fin, redondear(fin.subtract(inicial).multiply(CIEN).divide(inicial, 6, RoundingMode.HALF_UP)));
    }

    /** Una fila por día para el PDF; el detalle de cada captura va en el Excel. */
    static List<ResumenDia> porDia(List<Punto> puntos, ZoneId zona) {
        Map<LocalDate, List<Punto>> dias = puntos.stream().collect(Collectors.groupingBy(
                p -> LocalDate.ofInstant(p.capturadoEn(), zona), TreeMap::new, Collectors.toList()));
        return dias.entrySet().stream().map(dia -> {
            List<Punto> conStock = ultimaDeCadaPublicacion(dia.getValue()).stream().filter(Punto::disponible).toList();
            return conStock.isEmpty() ? new ResumenDia(dia.getKey(), null, null, 0)
                    : new ResumenDia(dia.getKey(), conStock.stream().map(Punto::precioCop).min(Comparator.naturalOrder()).orElseThrow(),
                            promedio(conStock, 0), conStock.size());
        }).toList();
    }

    private static List<Punto> ultimaDeCadaPublicacion(List<Punto> puntos) {
        Map<String, Punto> ultimas = new LinkedHashMap<>();
        puntos.forEach(p -> ultimas.put(p.clave(), p));
        return List.copyOf(ultimas.values());
    }

    private static BigDecimal promedio(List<Punto> puntos, int decimales) {
        BigDecimal suma = puntos.stream().map(Punto::precioCop).reduce(BigDecimal.ZERO, BigDecimal::add);
        return suma.divide(BigDecimal.valueOf(puntos.size()), decimales, RoundingMode.HALF_UP);
    }

    /** Los tramos de 6 h del periodo, y el final como última marca. */
    private static List<Long> tramos(Instant desde, Instant hasta) {
        List<Long> marcas = new ArrayList<>();
        long fin = hasta.toEpochMilli();
        for (long t = Math.floorDiv(desde.toEpochMilli(), TRAMO_MS) * TRAMO_MS; t < fin; t += TRAMO_MS) {
            marcas.add(t);
        }
        marcas.add(fin);
        return marcas;
    }

    /** En cada tramo vale el último precio conocido de la publicación; sin stock, no cuenta. */
    private static List<BigDecimal> valoresEnTramos(List<Punto> publicacion, List<Long> marcas) {
        List<BigDecimal> valores = new ArrayList<>(marcas.size());
        int i = 0;
        Punto vigente = null;
        for (long marca : marcas) {
            while (i < publicacion.size() && publicacion.get(i).capturadoEn().toEpochMilli() <= marca) {
                vigente = publicacion.get(i++);
            }
            valores.add(vigente != null && vigente.disponible() ? vigente.precioCop() : null);
        }
        return valores;
    }

    /** {@code Math.round(x * 10) / 10} de JavaScript: los empates siempre hacia arriba, también en negativos. */
    private static BigDecimal redondear(BigDecimal valor) {
        return valor.setScale(1, valor.signum() < 0 ? RoundingMode.HALF_DOWN : RoundingMode.HALF_UP);
    }
}
