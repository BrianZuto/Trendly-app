package co.trendly.reporte;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

import co.trendly.alerta.Alerta;
import co.trendly.alerta.DecisionPrecio;
import co.trendly.historico.HistoricoPrecio;
import co.trendly.monitoreo.NombreVendedor;

/**
 * Escribe el reporte en Excel con Apache POI (SCRUM-50): hojas Resumen, Histórico y Alertas y decisiones. Los precios y
 * las fechas van como números y fechas de verdad, para poder sumarlos y filtrarlos. Usa el modo por flujo (SXSSF), que
 * guarda las filas en disco y no en memoria: un producto puede tener decenas de miles de capturas.
 */
final class ExcelReporte {

    static final String HOJA_RESUMEN = "Resumen";
    static final String HOJA_HISTORICO = "Histórico";
    static final String HOJA_ALERTAS = "Alertas y decisiones";

    private static final int ANCHO_CARACTER = 256;

    private final Workbook libro;
    private final CellStyle titulo;
    private final CellStyle encabezado;
    private final CellStyle pesos;
    private final CellStyle precio;
    private final CellStyle porcentaje;
    private final CellStyle variacion;
    private final CellStyle cantidad;
    private final CellStyle fecha;

    private ExcelReporte(Workbook libro) {
        this.libro = libro;
        titulo = conFuente(libro, 14);
        encabezado = conFuente(libro, 11);
        pesos = conFormato(libro, "\"$\"#,##0");
        precio = conFormato(libro, "#,##0.00");
        // Con tres secciones: con menos, POI toma el "%" del texto como un porcentaje real y multiplica por 100
        porcentaje = conFormato(libro, "0.0\" %\";-0.0\" %\";0.0\" %\"");
        variacion = conFormato(libro, "+0.0\" %\";-0.0\" %\";0.0\" %\"");
        cantidad = conFormato(libro, "0");
        fecha = conFormato(libro, "yyyy-mm-dd hh:mm");
        fecha.setAlignment(HorizontalAlignment.LEFT);
    }

    static byte[] generar(Reporte reporte) {
        try (SXSSFWorkbook libro = new SXSSFWorkbook(200); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            ExcelReporte excel = new ExcelReporte(libro);
            excel.resumen(reporte);
            excel.historico(reporte.historico());
            excel.alertas(reporte.alertas());
            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el Excel", e);
        }
    }

    private void resumen(Reporte reporte) {
        Sheet hoja = hoja(HOJA_RESUMEN, 30, 18, 60);
        int fila = 0;
        escribir(hoja.createRow(fila++), 0, "Reporte de " + reporte.producto(), titulo);
        escribir(hoja.createRow(fila++), 0, "SKU", null);
        escribir(hoja.getRow(fila - 1), 1, reporte.sku() == null ? Formato.SIN_DATO : reporte.sku(), null);
        Row periodo = hoja.createRow(fila++);
        escribir(periodo, 0, "Periodo", null);
        escribir(periodo, 1, Formato.fechaHora(reporte.desde()) + " a " + Formato.fechaHora(reporte.hasta()), null);
        Row generado = hoja.createRow(fila++);
        escribir(generado, 0, "Generado", null);
        escribir(generado, 1, Formato.fechaHora(reporte.generadoEn()), null);
        fila++;
        encabezados(hoja.createRow(fila++), "Métrica", "Valor", "Detalle");
        for (Reporte.Metrica metrica : reporte.resumen()) {
            Row filaMetrica = hoja.createRow(fila++);
            escribir(filaMetrica, 0, metrica.nombre(), null);
            CellStyle estilo = switch (metrica.tipo()) {
                case PESOS -> pesos;
                case PORCENTAJE -> porcentaje;
                case VARIACION -> variacion;
                case CANTIDAD -> cantidad;
            };
            numero(filaMetrica, 1, metrica.valor(), estilo);
            escribir(filaMetrica, 2, metrica.nota(), null);
        }
    }

    private void historico(List<HistoricoPrecio> puntos) {
        Sheet hoja = hoja(HOJA_HISTORICO, 18, 16, 22, 50, 24, 10, 12, 9, 14, 12);
        hoja.createFreezePane(0, 1);
        encabezados(hoja.createRow(0), "Fecha", "Marketplace", "Publicación", "Título", "Vendedor", "Posición", "Precio",
                "Moneda", "Precio COP", "Disponible");
        int fila = 1;
        for (HistoricoPrecio p : puntos) {
            Row r = hoja.createRow(fila++);
            fecha(r, 0, p.getCapturadoEn());
            escribir(r, 1, p.getFuente(), null);
            escribir(r, 2, p.getPublicacionId(), null);
            escribir(r, 3, p.getTitulo(), null);
            escribir(r, 4, NombreVendedor.de(p.getVendedor()), null);
            numero(r, 5, p.getPosicion() == null ? null : BigDecimal.valueOf(p.getPosicion()), cantidad);
            numero(r, 6, p.getPrecio(), precio);
            escribir(r, 7, p.getMoneda(), null);
            numero(r, 8, p.getPrecioCop(), pesos);
            escribir(r, 9, p.isDisponible() ? "Sí" : "No", null);
        }
    }

    private void alertas(List<Reporte.FilaAlerta> filas) {
        Sheet hoja = hoja(HOJA_ALERTAS, 18, 16, 11, 22, 15, 15, 11, 15, 10, 12, 15, 40, 18);
        hoja.createFreezePane(0, 1);
        encabezados(hoja.createRow(0), "Fecha", "Tipo", "Relevancia", "Publicación", "Precio anterior", "Precio nuevo",
                "Variación", "Precio sugerido", "Estado", "Decisión", "Precio final", "Motivo", "Decidida el");
        int fila = 1;
        for (Reporte.FilaAlerta f : filas) {
            Alerta a = f.alerta();
            Row r = hoja.createRow(fila++);
            fecha(r, 0, a.getCreadoEn());
            escribir(r, 1, a.getTipo().name(), null);
            escribir(r, 2, a.getRelevancia().name(), null);
            escribir(r, 3, a.getPublicacionId(), null);
            numero(r, 4, a.getPrecioAnterior(), pesos);
            numero(r, 5, a.getPrecioNuevo(), pesos);
            numero(r, 6, a.getVariacionPct(), porcentaje);
            numero(r, 7, a.getPrecioSugerido(), pesos);
            escribir(r, 8, a.getEstado().name(), null);
            DecisionPrecio d = f.decision();
            if (d != null) {
                escribir(r, 9, d.getAccion().name(), null);
                numero(r, 10, d.getPrecioFinal(), pesos);
                escribir(r, 11, d.getMotivo(), null);
                fecha(r, 12, d.getDecididoEn());
            }
        }
    }

    private Sheet hoja(String nombre, int... anchos) {
        Sheet hoja = libro.createSheet(nombre);
        for (int i = 0; i < anchos.length; i++) {
            hoja.setColumnWidth(i, anchos[i] * ANCHO_CARACTER);
        }
        return hoja;
    }

    private void encabezados(Row fila, String... textos) {
        for (int i = 0; i < textos.length; i++) {
            escribir(fila, i, textos[i], encabezado);
        }
    }

    private static void escribir(Row fila, int columna, String texto, CellStyle estilo) {
        if (texto == null) {
            return;
        }
        Cell celda = fila.createCell(columna);
        celda.setCellValue(texto);
        if (estilo != null) {
            celda.setCellStyle(estilo);
        }
    }

    /** Sin dato: la celda queda con el guion del tablero, para que se note que no es un cero. */
    private void numero(Row fila, int columna, BigDecimal valor, CellStyle estilo) {
        if (valor == null) {
            escribir(fila, columna, Formato.SIN_DATO, null);
            return;
        }
        Cell celda = fila.createCell(columna);
        celda.setCellValue(valor.doubleValue());
        celda.setCellStyle(estilo);
    }

    private void fecha(Row fila, int columna, Instant instante) {
        Cell celda = fila.createCell(columna);
        celda.setCellValue(LocalDateTime.ofInstant(instante, Reporte.COLOMBIA));
        celda.setCellStyle(fecha);
    }

    private static CellStyle conFuente(Workbook libro, int puntos) {
        Font fuente = libro.createFont();
        fuente.setBold(true);
        fuente.setFontHeightInPoints((short) puntos);
        CellStyle estilo = libro.createCellStyle();
        estilo.setFont(fuente);
        return estilo;
    }

    private static CellStyle conFormato(Workbook libro, String formato) {
        CellStyle estilo = libro.createCellStyle();
        estilo.setDataFormat(libro.createDataFormat().getFormat(formato));
        return estilo;
    }
}
