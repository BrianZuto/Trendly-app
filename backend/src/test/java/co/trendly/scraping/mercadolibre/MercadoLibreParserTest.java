package co.trendly.scraping.mercadolibre;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

import co.trendly.scraping.PublicacionCapturada;
import co.trendly.scraping.ResultadoScraping;
import co.trendly.scraping.TipoFallo;
import co.trendly.scraping.mercadolibre.MercadoLibreParser.ProductoCatalogo;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lectura de la API de catálogo de MercadoLibre (SCRUM-40) con respuestas <b>reales</b> guardadas el 22/10/2026
 * en {@code src/test/resources/scraping/mercadolibre/real}. Los precios se compararon a mano con la página.
 */
class MercadoLibreParserTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @ParameterizedTest(name = "{0}: {3} {4}")
    @CsvSource(delimiter = '|', textBlock = """
            MCO66318680 | MCO3935884874 | Auriculares Xiaomi Redmi Buds 8 Active Bluetooth Blanco             | 63400   | 530380977
            MCO65122176 | MCO3604607034 | Audífonos Inalámbricos Maxell Bluetooth Fly 30 Horas Negro Negro   | 51113   | 467853944
            MCO51011158 | MCO4494987738 | Audífonos Bluetooth Sony WH-1000XM6/B Noise Cancelling Color Negro | 1299900 | 168810672
            """)
    void leeLaOfertaRealQueSeVeiaEnLaPagina(String producto, String oferta, String titulo, String precio,
            String vendedor) {
        ResultadoScraping resultado = MercadoLibreParser.publicacion(
                json("producto-" + producto + ".json"), json("oferta-" + producto + "-" + oferta + ".json"));

        assertThat(resultado.esOk()).isTrue();
        PublicacionCapturada p = resultado.publicaciones().getFirst();
        assertThat(p.idPublicacion()).isEqualTo(MercadoLibreParser.conGuion(oferta));
        assertThat(p.titulo()).isEqualTo(titulo);
        assertThat(p.precio()).isEqualByComparingTo(precio);
        assertThat(p.moneda()).isEqualTo("COP");
        assertThat(p.vendedor()).isEqualTo(vendedor);
        assertThat(p.disponible()).isTrue();
        assertThat(p.posicion()).isNull();
    }

    @Test
    void sinOfertaPuntualTomaLaMejorDeLasVeintiUnaOfertas() {
        ResultadoScraping resultado = MercadoLibreParser.publicacion(
                json("producto-MCO66318680.json"), json("ofertas-MCO66318680.json"));

        assertThat(resultado.publicaciones()).hasSize(1);
        assertThat(resultado.publicaciones().getFirst().idPublicacion()).isEqualTo("MCO-3935884874");
    }

    @Test
    void unaOfertaQueYaNoEstaEsNoEncontrada() {
        assertFallo(MercadoLibreParser.publicacion(texto("{\"name\": \"x\"}"), texto("{\"results\": []}")),
                TipoFallo.NO_ENCONTRADO);
    }

    @Test
    void unaRespuestaSinResultadosEsCambioDeEstructura() {
        assertFallo(MercadoLibreParser.publicacion(texto("{}"), texto("{\"message\": \"otra cosa\"}")),
                TipoFallo.ESTRUCTURA);
    }

    @Test
    void unPrecioEnCeroOSinMonedaEsDatoInvalido() {
        assertFallo(MercadoLibreParser.publicacion(texto("{}"), texto("""
                {"results": [{"item_id": "MCO1", "price": 0, "currency_id": "COP"}]}""")), TipoFallo.DATO_INVALIDO);
        assertFallo(MercadoLibreParser.publicacion(texto("{}"), texto("""
                {"results": [{"item_id": "MCO1", "price": 1000, "currency_id": "pesos"}]}""")), TipoFallo.DATO_INVALIDO);
        assertFallo(MercadoLibreParser.publicacion(texto("{}"), texto("""
                {"results": [{"item_id": "MCO1", "price": null, "currency_id": "COP"}]}""")), TipoFallo.DATO_INVALIDO);
    }

    @Test
    void siLaApiInformaCeroUnidadesNoEstaDisponible() {
        PublicacionCapturada p = MercadoLibreParser.publicacion(texto("{\"name\": \"x\"}"), texto("""
                {"results": [{"item_id": "MCO1", "price": 1000, "currency_id": "COP", "available_quantity": 0}]}"""))
                .publicaciones().getFirst();

        assertThat(p.disponible()).isFalse();
    }

    @Test
    void laMejorOfertaDeUnProductoBuscadoLlevaSuPosicion() {
        PublicacionCapturada p = MercadoLibreParser.mejorOferta(json("ofertas1-MCO79239295.json"), "Redmi Buds 8 Green", 1);

        assertThat(p.idPublicacion()).isEqualTo("MCO-2245703081");
        assertThat(p.precio()).isEqualByComparingTo("173990");
        assertThat(p.posicion()).isEqualTo(1);
        assertThat(p.titulo()).isEqualTo("Redmi Buds 8 Green");
    }

    @Test
    void unaOfertaVaciaOInvalidaNoSirveEnLaBusqueda() {
        assertThat(MercadoLibreParser.mejorOferta(texto("{\"results\": []}"), "x", 1)).isNull();
        assertThat(MercadoLibreParser.mejorOferta(texto("""
                {"results": [{"item_id": "MCO1", "price": -5, "currency_id": "COP"}]}"""), "x", 1)).isNull();
    }

    @Test
    void leeLosProductosDeUnaBusquedaRealEnOrden() {
        assertThat(MercadoLibreParser.productos(json("busqueda-redmi-buds.json")))
                .hasSize(8)
                .first().isEqualTo(new ProductoCatalogo("MCO79239295", "Redmi Buds 8 Green"));
    }

    @Test
    void unaBusquedaSinListaDeResultadosEsUnError() {
        assertThatThrownBy(() -> MercadoLibreParser.productos(texto("{\"error\": \"x\"}")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(MercadoLibreParser.productos(texto("{\"results\": [{\"name\": \"sin id\"}]}"))).isEmpty();
    }

    @Test
    void convierteLosIdentificadoresEntreElFormatoDeLaApiYElDeTrendly() {
        assertThat(MercadoLibreParser.conGuion("MCO123")).isEqualTo("MCO-123");
        assertThat(MercadoLibreParser.conGuion("otro")).isEqualTo("otro");
        assertThat(MercadoLibreParser.sinGuion("MCO-123")).isEqualTo("MCO123");
    }

    private static void assertFallo(ResultadoScraping resultado, TipoFallo tipo) {
        assertThat(resultado.esOk()).isFalse();
        assertThat(resultado.tipoFallo()).isEqualTo(tipo);
        assertThat(resultado.motivo()).isNotBlank();
        assertThat(resultado.publicaciones()).isEmpty();
    }

    static JsonNode json(String archivo) {
        return texto(fixture(archivo));
    }

    static JsonNode texto(String json) {
        return JSON.readTree(json);
    }

    static String fixture(String archivo) {
        try (InputStream entrada = MercadoLibreParserTest.class
                .getResourceAsStream("/scraping/mercadolibre/real/" + archivo)) {
            if (entrada == null) {
                throw new IllegalArgumentException("No existe el fixture " + archivo);
            }
            return new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
