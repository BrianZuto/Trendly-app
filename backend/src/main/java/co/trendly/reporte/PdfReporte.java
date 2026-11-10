package co.trendly.reporte;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import co.trendly.reporte.CalculoCompetencia.ResumenDia;

/**
 * Escribe el reporte en PDF con OpenPDF (SCRUM-50): logo, resumen, histórico y fecha de generación. El histórico va con
 * una fila por día: con todas las capturas serían cientos de páginas, y el detalle ya está en el Excel.
 */
final class PdfReporte {

    private static final String LOGO = "/reportes/logo.png";
    private static final Color GRIS = new Color(110, 110, 115);
    private static final Color FONDO_ENCABEZADO = new Color(255, 210, 63);

    private static final Font TITULO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
    private static final Font SECCION = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    private static final Font NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 9.5f);
    private static final Font NEGRITA = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f);
    private static final Font TENUE = FontFactory.getFont(FontFactory.HELVETICA, 9, GRIS);

    private PdfReporte() {
    }

    static byte[] generar(Reporte reporte) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4, 40, 40, 40, 40);
        try {
            PdfWriter.getInstance(documento, salida);
            documento.addTitle("Reporte de " + reporte.producto());
            documento.open();
            encabezado(documento, reporte);
            resumen(documento, reporte);
            historico(documento, reporte);
            documento.close();
            return salida.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("No se pudo generar el PDF", e);
        }
    }

    private static void encabezado(Document documento, Reporte reporte) {
        documento.add(logo());
        documento.add(new Paragraph("Reporte de " + reporte.producto(), TITULO));
        documento.add(new Paragraph((reporte.sku() == null ? "" : "SKU " + reporte.sku() + " · ")
                + "Periodo: " + Formato.fechaHora(reporte.desde()) + " a " + Formato.fechaHora(reporte.hasta()), TENUE));
        documento.add(new Paragraph("Generado el " + Formato.fechaHora(reporte.generadoEn()) + " (hora de Colombia)", TENUE));
    }

    private static Image logo() {
        try (InputStream entrada = PdfReporte.class.getResourceAsStream(LOGO)) {
            if (entrada == null) {
                throw new IllegalStateException("Falta el logo " + LOGO);
            }
            Image logo = Image.getInstance(entrada.readAllBytes());
            logo.scaleToFit(36, 36);
            logo.setSpacingAfter(6);
            return logo;
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el logo", e);
        }
    }

    private static void resumen(Document documento, Reporte reporte) {
        documento.add(seccion("Resumen"));
        PdfPTable tabla = tabla(new float[] {34, 16, 50}, "Métrica", "Valor", "Detalle");
        for (Reporte.Metrica metrica : reporte.resumen()) {
            tabla.addCell(celda(metrica.nombre(), Element.ALIGN_LEFT));
            tabla.addCell(celda(valor(metrica), Element.ALIGN_RIGHT));
            tabla.addCell(celda(metrica.nota(), Element.ALIGN_LEFT));
        }
        documento.add(tabla);
    }

    private static void historico(Document documento, Reporte reporte) {
        documento.add(seccion("Histórico de la competencia por día"));
        if (reporte.dias().isEmpty()) {
            documento.add(new Paragraph("No hay capturas en este periodo.", TENUE));
            return;
        }
        PdfPTable tabla = tabla(new float[] {25, 25, 25, 25}, "Fecha", "Mínimo", "Promedio", "Publicaciones con stock");
        for (ResumenDia dia : reporte.dias()) {
            tabla.addCell(celda(Formato.dia(dia.dia()), Element.ALIGN_LEFT));
            tabla.addCell(celda(dia.minimo() == null ? "Sin stock" : Formato.pesos(dia.minimo()), Element.ALIGN_RIGHT));
            tabla.addCell(celda(dia.promedio() == null ? "Sin stock" : Formato.pesos(dia.promedio()), Element.ALIGN_RIGHT));
            tabla.addCell(celda(String.valueOf(dia.conStock()), Element.ALIGN_RIGHT));
        }
        documento.add(tabla);
        documento.add(new Paragraph("El detalle de cada captura está en el reporte de Excel.", TENUE));
    }

    private static String valor(Reporte.Metrica metrica) {
        if (metrica.valor() == null) {
            return Formato.SIN_DATO;
        }
        return switch (metrica.tipo()) {
            case PESOS -> Formato.pesos(metrica.valor());
            case PORCENTAJE -> Formato.porcentaje(metrica.valor());
            case VARIACION -> Formato.variacion(metrica.valor());
            case CANTIDAD -> metrica.valor().toPlainString();
        };
    }

    private static Paragraph seccion(String texto) {
        Paragraph parrafo = new Paragraph(texto, SECCION);
        parrafo.setSpacingBefore(18);
        parrafo.setSpacingAfter(8);
        return parrafo;
    }

    /** Con el encabezado repetido en cada página. */
    private static PdfPTable tabla(float[] anchos, String... encabezados) {
        PdfPTable tabla = new PdfPTable(anchos);
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);
        for (String encabezado : encabezados) {
            PdfPCell celda = new PdfPCell(new Phrase(encabezado, NEGRITA));
            celda.setBackgroundColor(FONDO_ENCABEZADO);
            celda.setPadding(5);
            celda.setBorderColor(GRIS);
            tabla.addCell(celda);
        }
        return tabla;
    }

    private static PdfPCell celda(String texto, int alineacion) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, NORMAL));
        celda.setHorizontalAlignment(alineacion);
        celda.setPadding(4);
        celda.setBorderColor(Color.LIGHT_GRAY);
        return celda;
    }
}
