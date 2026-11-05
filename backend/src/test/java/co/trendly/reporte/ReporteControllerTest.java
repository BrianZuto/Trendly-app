package co.trendly.reporte;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;

import co.trendly.seguridad.JwtService;
import co.trendly.seguridad.UsuarioAutenticado;

/** {@code GET /api/v1/reportes} de punta a punta, abriendo los archivos que genera (SCRUM-50). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReporteControllerTest {

    private static final String RUTA = "/api/v1/reportes";
    private static final String TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    private long vendedor;
    private long producto;
    private long monitoreo;
    private final Instant ahora = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    @BeforeEach
    void preparar() {
        vendedor = crearVendedor("ana@correo.co");
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, sku, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Audífonos', 'AUD-01', 33000, 66000, 30)""", vendedor);
        producto = jdbc.queryForObject("SELECT id FROM producto WHERE usuario_id = ?", Long.class, vendedor);
        jdbc.update("""
                INSERT INTO monitoreo (producto_id, tipo, valor, marketplace, frecuencia_horas, estado)
                VALUES (?, 'PALABRA_CLAVE', 'audifonos', 'MERCADOLIBRE', 6, 'ACTIVO')""", producto);
        monitoreo = jdbc.queryForObject("SELECT id FROM monitoreo WHERE producto_id = ?", Long.class, producto);

        captura("MCO1", 40, "70000", true); // fuera de los 30 días: no sale en la hoja Histórico
        captura("MCO1", 0, "60000", true);
        captura("MCO2", 3, "72000", true);

        long aceptada = alerta(5, "BAJA_PRECIO");
        decision(aceptada, "ACEPTAR", "60000", null);
        long descartada = alerta(2, "SUBIDA_PRECIO");
        decision(descartada, "DESCARTAR", null, "No me interesa");
        alerta(1, "BAJA_PRECIO");
        alerta(60, "BAJA_PRECIO"); // fuera del periodo
    }

    @Test
    void elExcelAbreConSusTresHojasYMetricasQueCoincidenConElTablero() throws Exception {
        byte[] archivo = descargar("xlsx")
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, TIPO_XLSX))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.matchesPattern("attachment; filename=\"reporte-trendly-" + producto + "-\\d{8}\\.xlsx\"")))
                .andReturn().getResponse().getContentAsByteArray();

        try (Workbook libro = abrir(archivo)) {
            assertThat(libro.getNumberOfSheets()).isEqualTo(3);
            assertThat(libro.getSheetName(0)).isEqualTo("Resumen");
            assertThat(libro.getSheetName(1)).isEqualTo("Histórico");
            assertThat(libro.getSheetName(2)).isEqualTo("Alertas y decisiones");

            Sheet resumen = libro.getSheet("Resumen");
            assertThat(metrica(resumen, "Mi precio actual")).isEqualTo(66000);
            assertThat(metrica(resumen, "Mínimo de la competencia")).isEqualTo(60000);
            assertThat(metrica(resumen, "Promedio de la competencia")).isEqualTo(66000);
            assertThat(metrica(resumen, "Diferencia frente al mínimo")).isEqualTo(10.0);
            assertThat(metrica(resumen, "Margen actual")).isEqualTo(50);
            assertThat(metrica(resumen, "Margen objetivo")).isEqualTo(30);
            // Como se ve en pantalla: el "%" del formato no debe multiplicar el valor por 100
            org.apache.poi.ss.usermodel.DataFormatter comoSeVe = new org.apache.poi.ss.usermodel.DataFormatter(java.util.Locale.of("es", "CO"));
            assertThat(comoSeVe.formatCellValue(fila(resumen, "Margen actual").getCell(1))).isEqualTo("50,0 %");
            assertThat(comoSeVe.formatCellValue(fila(resumen, "Diferencia frente al mínimo").getCell(1))).isEqualTo("+10,0 %");
            assertThat(comoSeVe.formatCellValue(fila(resumen, "Mínimo de la competencia").getCell(1))).isEqualTo("$60.000");
            assertThat(metrica(resumen, "Alertas del periodo")).isEqualTo(3);
            assertThat(metrica(resumen, "Decisiones aceptadas")).isEqualTo(1);
            assertThat(metrica(resumen, "Decisiones descartadas")).isEqualTo(1);
            assertThat(metrica(resumen, "Variación del periodo")).isEqualTo(-14.3);

            Sheet historico = libro.getSheet("Histórico");
            assertThat(historico.getLastRowNum()).isEqualTo(2); // encabezado y 2 capturas del periodo
            Row primera = historico.getRow(1);
            assertThat(primera.getCell(0).getCellType()).isEqualTo(CellType.NUMERIC); // fecha de verdad, no texto
            assertThat(primera.getCell(2).getStringCellValue()).isEqualTo("MCO2");
            assertThat(primera.getCell(8).getNumericCellValue()).isEqualTo(72000);
            assertThat(primera.getCell(9).getStringCellValue()).isEqualTo("Sí");

            Sheet alertas = libro.getSheet("Alertas y decisiones");
            assertThat(alertas.getLastRowNum()).isEqualTo(3);
            assertThat(alertas.getRow(1).getCell(9).getStringCellValue()).isEqualTo("ACEPTAR");
            assertThat(alertas.getRow(2).getCell(11).getStringCellValue()).isEqualTo("No me interesa");
            assertThat(alertas.getRow(3).getCell(9)).isNull();
        }
    }

    @Test
    void elPdfSeDescargaConLogoResumenHistoricoYFechaDeGeneracion() throws Exception {
        byte[] archivo = descargar("pdf")
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"))
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(new String(archivo, 0, 5, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        PdfReader lector = new PdfReader(archivo);
        String texto = new PdfTextExtractor(lector).getTextFromPage(1);
        assertThat(texto).contains("Reporte de Audífonos", "AUD-01", "Generado el", "Resumen",
                "Mínimo de la competencia", "$60.000", "$66.000", "+10,0 %", "-14,3 %", "50,0 %",
                "Histórico de la competencia por día");
        assertThat(new String(lector.getPageContent(1), java.nio.charset.StandardCharsets.ISO_8859_1)).contains(" Do");
        lector.close();
    }

    @Test
    void unProductoSinCapturasTambienGeneraReporte() throws Exception {
        jdbc.update("""
                INSERT INTO producto (usuario_id, nombre, costo, precio_venta, margen_objetivo)
                VALUES (?, 'Sin datos', 100, 200, 30)""", vendedor);
        long vacio = jdbc.queryForObject("SELECT id FROM producto WHERE nombre = 'Sin datos'", Long.class);

        byte[] excel = peticion("xlsx", vacio).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        peticion("pdf", vacio).andExpect(status().isOk());

        try (Workbook libro = abrir(excel)) {
            assertThat(metrica(libro.getSheet("Resumen"), "Mi precio actual")).isEqualTo(200);
            assertThat(texto(libro.getSheet("Resumen"), "Mínimo de la competencia")).isEqualTo("—");
            assertThat(libro.getSheet("Histórico").getLastRowNum()).isZero();
        }
    }

    @Test
    void elRangoFiltraElHistoricoYLasAlertas() throws Exception {
        byte[] archivo = mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token(vendedor))
                        .param("formato", "xlsx").param("productoId", String.valueOf(producto))
                        .param("desde", ahora.minus(Duration.ofDays(4)).toString())
                        .param("hasta", ahora.minus(Duration.ofDays(1)).toString()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();

        try (Workbook libro = abrir(archivo)) {
            assertThat(libro.getSheet("Histórico").getLastRowNum()).isEqualTo(1);
            assertThat(metrica(libro.getSheet("Resumen"), "Alertas del periodo")).isEqualTo(2); // la de hace 2 días y la de ayer
        }
    }

    @Test
    void validaLosParametrosYElDueno() throws Exception {
        peticion("csv", producto).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(FormatoReporte.MENSAJE_INVALIDO));
        mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token(vendedor)).param("formato", "pdf")
                        .param("productoId", String.valueOf(producto)).param("desde", "2026-11-04").param("hasta", "2026-11-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ReporteService.MENSAJE_RANGO));

        long otro = crearVendedor("beto@correo.co");
        mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token(otro)).param("formato", "pdf")
                        .param("productoId", String.valueOf(producto)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(RUTA).param("formato", "pdf").param("productoId", String.valueOf(producto)))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions descargar(String formato) throws Exception {
        return peticion(formato, producto);
    }

    private ResultActions peticion(String formato, long productoId) throws Exception {
        return mockMvc.perform(get(RUTA).header(HttpHeaders.AUTHORIZATION, token(vendedor))
                .param("formato", formato).param("productoId", String.valueOf(productoId)));
    }

    private static Workbook abrir(byte[] archivo) throws IOException {
        return new XSSFWorkbook(new ByteArrayInputStream(archivo));
    }

    private static double metrica(Sheet hoja, String nombre) {
        return fila(hoja, nombre).getCell(1).getNumericCellValue();
    }

    private static String texto(Sheet hoja, String nombre) {
        return fila(hoja, nombre).getCell(1).getStringCellValue();
    }

    private static Row fila(Sheet hoja, String nombre) {
        for (Row fila : hoja) {
            if (fila.getCell(0) != null && nombre.equals(fila.getCell(0).getStringCellValue())) {
                return fila;
            }
        }
        throw new AssertionError("No está la métrica " + nombre);
    }

    private long crearVendedor(String email) {
        jdbc.update("INSERT INTO usuario (nombre, email, password_hash, plan_id) VALUES ('Prueba', ?, 'hash', 1)", email);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private void captura(String publicacion, int diasAtras, String precio, boolean disponible) {
        jdbc.update("""
                INSERT INTO historico_precio (monitoreo_id, publicacion_id, titulo, vendedor, precio, moneda, precio_cop,
                    disponible, fuente, capturado_en) VALUES (?, ?, 'Audífonos', 'Tienda', ?, 'COP', ?, ?, 'MERCADOLIBRE', ?)""",
                monitoreo, publicacion, new java.math.BigDecimal(precio), new java.math.BigDecimal(precio), disponible,
                Timestamp.from(ahora.minus(Duration.ofDays(diasAtras)).minusSeconds(60)));
    }

    private long alerta(int diasAtras, String tipo) {
        jdbc.update("""
                INSERT INTO alerta (monitoreo_id, usuario_id, publicacion_id, tipo, relevancia, precio_anterior, precio_nuevo,
                    variacion_pct, estado, creado_en) VALUES (?, ?, 'MCO1', ?, 'NORMAL', 70000, 60000, -14.29, 'NUEVA', ?)""",
                monitoreo, vendedor, tipo, Timestamp.from(ahora.minus(Duration.ofDays(diasAtras))));
        return jdbc.queryForObject("SELECT MAX(id) FROM alerta", Long.class);
    }

    private void decision(long alerta, String accion, String precioFinal, String motivo) {
        jdbc.update("""
                INSERT INTO decision_precio (alerta_id, producto_id, accion, precio_anterior, precio_final, motivo, decidido_en)
                VALUES (?, ?, ?, 66000, ?, ?, ?)""", alerta, producto, accion,
                precioFinal == null ? null : new java.math.BigDecimal(precioFinal), motivo, Timestamp.from(ahora));
    }

    private String token(long usuarioId) {
        return "Bearer " + jwtService.generarToken(new UsuarioAutenticado(usuarioId, "ana@correo.co", "VENDEDOR"));
    }
}
