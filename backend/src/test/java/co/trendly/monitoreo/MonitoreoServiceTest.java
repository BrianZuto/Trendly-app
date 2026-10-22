package co.trendly.monitoreo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import co.trendly.comun.ErrorDeNegocio;
import co.trendly.producto.Producto;
import co.trendly.producto.ProductoNoEncontradoException;
import co.trendly.producto.ProductoRepository;
import co.trendly.usuario.Plan;
import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;

/** Pruebas unitarias de los competidores por URL (SCRUM-36) y por palabra clave (SCRUM-37), sin Spring ni base de datos. */
class MonitoreoServiceTest {

    private static final long VENDEDOR = 5L;
    private static final long PRODUCTO = 9L;
    private static final String URL_ML = "https://www.mercadolibre.com.co/audifonos/p/MCO123456";

    private MonitoreoRepository monitoreos;
    private ProductoRepository productos;
    private UsuarioRepository usuarios;
    private MonitoreoService servicio;

    @BeforeEach
    void preparar() {
        monitoreos = mock(MonitoreoRepository.class);
        productos = mock(ProductoRepository.class);
        usuarios = mock(UsuarioRepository.class);
        servicio = new MonitoreoService(monitoreos, productos, usuarios);

        Producto producto = new Producto(VENDEDOR);
        ReflectionTestUtils.setField(producto, "id", PRODUCTO);
        when(productos.findByIdAndUsuarioId(PRODUCTO, VENDEDOR)).thenReturn(Optional.of(producto));
        conPlan(Plan.GRATUITO);
        when(monitoreos.saveAndFlush(any(Monitoreo.class))).thenAnswer(invocacion -> {
            Monitoreo guardado = invocacion.getArgument(0);
            ReflectionTestUtils.setField(guardado, "id", 1L);
            return guardado;
        });
    }

    @Test
    void creaElMonitoreoActivoConCapturaInmediata() {
        Instant antes = Instant.now().minusSeconds(1);

        MonitoreoResponse creado = servicio.crear(VENDEDOR, PRODUCTO, porUrl("  " + URL_ML + " ", null));

        assertThat(creado.tipo()).isEqualTo(TipoMonitoreo.URL);
        assertThat(creado.valor()).isEqualTo(URL_ML);
        assertThat(creado.marketplace()).isEqualTo(Marketplace.MERCADOLIBRE);
        assertThat(creado.idPublicacion()).isEqualTo("MCO-123456");
        assertThat(creado.frecuenciaHoras()).isEqualTo(6);
        assertThat(creado.estado()).isEqualTo(EstadoMonitoreo.ACTIVO);
        assertThat(creado.proximaEjecucion()).isAfter(antes).isEqualTo(creado.creadoEn());
        assertThat(creado.ultimaCaptura()).isNull();
    }

    @Test
    void unCompetidorRepetidoEnElMismoProductoResponde409() {
        when(monitoreos.existsByProductoIdAndMarketplaceAndIdPublicacion(PRODUCTO, Marketplace.MERCADOLIBRE, "MCO-123456"))
                .thenReturn(true);

        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porUrl(URL_ML + "?otro=parametro", 6)),
                HttpStatus.CONFLICT, MonitoreoService.MENSAJE_REPETIDO);
        verify(monitoreos, never()).saveAndFlush(any());
    }

    @Test
    void siLaBaseDeDatosRechazaElDuplicadoTambienEs409() {
        when(monitoreos.saveAndFlush(any(Monitoreo.class))).thenThrow(new DataIntegrityViolationException("uk"));

        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porUrl(URL_ML, 6)), HttpStatus.CONFLICT,
                MonitoreoService.MENSAJE_REPETIDO);
    }

    @Test
    void alLlegarAlLimiteDeCompetidoresResponde422() {
        when(monitoreos.countByProductoId(PRODUCTO)).thenReturn((long) MonitoreoService.MAX_POR_PRODUCTO);

        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porUrl(URL_ML, 6)), HttpStatus.UNPROCESSABLE_CONTENT,
                MonitoreoService.MENSAJE_LIMITE);
    }

    @Test
    void elPlanGratuitoNoPuedeCambiarLaFrecuencia() {
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porUrl(URL_ML, 3)), HttpStatus.BAD_REQUEST,
                MonitoreoService.MENSAJE_FRECUENCIA_PLAN);
    }

    @Test
    void elPlanProPuedeBajarLaFrecuenciaHastaUnaHora() {
        conPlan(Plan.PRO);

        assertThat(servicio.crear(VENDEDOR, PRODUCTO, porUrl(URL_ML, 1)).frecuenciaHoras()).isEqualTo(1);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porUrl(URL_ML, 0)), HttpStatus.BAD_REQUEST,
                MonitoreoService.MENSAJE_FRECUENCIA_RANGO);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porUrl(URL_ML, 12)), HttpStatus.BAD_REQUEST,
                MonitoreoService.MENSAJE_FRECUENCIA_RANGO);
    }

    @Test
    void unTipoDesconocidoResponde400() {
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, new MonitoreoRequest("RSS", URL_ML, null, null, null)),
                HttpStatus.BAD_REQUEST, MonitoreoService.MENSAJE_TIPO);
    }

    @Test
    void unaUrlDeMercadoLibreQueNoEsDeCatalogoNoSeAcepta() {
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO,
                porUrl("https://articulo.mercadolibre.com.co/MCO-123456-audifonos", 6)),
                HttpStatus.BAD_REQUEST, PublicacionUrl.MENSAJE_SOLO_CATALOGO);
        verify(monitoreos, never()).saveAndFlush(any());
    }

    @Test
    void creaUnMonitoreoPorPalabraClaveNormalizandoLosEspacios() {
        MonitoreoResponse creado = servicio.crear(VENDEDOR, PRODUCTO, porPalabra("  redmi \t buds  ", "mercadolibre", 3));

        assertThat(creado.tipo()).isEqualTo(TipoMonitoreo.PALABRA_CLAVE);
        assertThat(creado.valor()).isEqualTo("redmi buds");
        assertThat(creado.marketplace()).isEqualTo(Marketplace.MERCADOLIBRE);
        assertThat(creado.topN()).isEqualTo(3);
        assertThat(creado.idPublicacion()).isNull();
        assertThat(creado.estado()).isEqualTo(EstadoMonitoreo.ACTIVO);
        assertThat(creado.proximaEjecucion()).isEqualTo(creado.creadoEn());
        verify(monitoreos).existsByProductoIdAndTipoAndMarketplaceAndValorIgnoreCase(PRODUCTO,
                TipoMonitoreo.PALABRA_CLAVE, Marketplace.MERCADOLIBRE, "redmi buds");
    }

    @Test
    void laPalabraClaveSinTopNTomaCincoYAceptaLosLimites() {
        assertThat(servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", "MERCADOLIBRE", null)).topN())
                .isEqualTo(5);
        assertThat(servicio.crear(VENDEDOR, PRODUCTO, porPalabra("abc", "MERCADOLIBRE", 1)).topN()).isEqualTo(1);
        assertThat(servicio.crear(VENDEDOR, PRODUCTO, porPalabra("a".repeat(80), "MERCADOLIBRE", 10)).topN())
                .isEqualTo(10);
    }

    @Test
    void validaLaPalabraClaveElMarketplaceYElTopN() {
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("ab", "MERCADOLIBRE", 5)),
                HttpStatus.BAD_REQUEST, MonitoreoService.MENSAJE_PALABRA_LARGO);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("a".repeat(81), "MERCADOLIBRE", 5)),
                HttpStatus.BAD_REQUEST, MonitoreoService.MENSAJE_PALABRA_LARGO);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", " ", 5)),
                HttpStatus.BAD_REQUEST, MonitoreoService.MENSAJE_MARKETPLACE_OBLIGATORIO);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", "FALABELLA", 5)),
                HttpStatus.BAD_REQUEST, PublicacionUrl.MENSAJE_NO_SOPORTADO);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", "ALIEXPRESS", 5)),
                HttpStatus.BAD_REQUEST, MonitoreoService.MENSAJE_PALABRA_ALIEXPRESS);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", "MERCADOLIBRE", 0)),
                HttpStatus.BAD_REQUEST, MonitoreoService.MENSAJE_TOP_N);
        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", "MERCADOLIBRE", 11)),
                HttpStatus.BAD_REQUEST, MonitoreoService.MENSAJE_TOP_N);
        verify(monitoreos, never()).saveAndFlush(any());
    }

    @Test
    void unaPalabraClaveRepetidaResponde409() {
        when(monitoreos.existsByProductoIdAndTipoAndMarketplaceAndValorIgnoreCase(PRODUCTO, TipoMonitoreo.PALABRA_CLAVE,
                Marketplace.MERCADOLIBRE, "redmi buds")).thenReturn(true);

        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", "MERCADOLIBRE", 5)),
                HttpStatus.CONFLICT, MonitoreoService.MENSAJE_PALABRA_REPETIDA);
    }

    @Test
    void laPalabraClaveTambienRespetaElLimiteDeCompetidores() {
        when(monitoreos.countByProductoId(PRODUCTO)).thenReturn((long) MonitoreoService.MAX_POR_PRODUCTO);

        assertError(() -> servicio.crear(VENDEDOR, PRODUCTO, porPalabra("redmi buds", "MERCADOLIBRE", 5)),
                HttpStatus.UNPROCESSABLE_CONTENT, MonitoreoService.MENSAJE_LIMITE);
    }

    @Test
    void enUnProductoAjenoNoSeCreaNiSeLista() {
        assertThatThrownBy(() -> servicio.crear(VENDEDOR, 77L, porUrl(URL_ML, 6)))
                .isInstanceOf(ProductoNoEncontradoException.class);
        assertThatThrownBy(() -> servicio.listar(VENDEDOR, 77L)).isInstanceOf(ProductoNoEncontradoException.class);
    }

    @Test
    void pausarYReactivarReiniciaLosFallos() {
        Monitoreo monitoreo = Monitoreo.porUrl(PRODUCTO, URL_ML, PublicacionUrl.reconocer(URL_ML), 6);
        ReflectionTestUtils.setField(monitoreo, "id", 3L);
        ReflectionTestUtils.setField(monitoreo, "estado", EstadoMonitoreo.ERROR);
        ReflectionTestUtils.setField(monitoreo, "fallosConsecutivos", 3);
        when(monitoreos.findById(3L)).thenReturn(Optional.of(monitoreo));

        assertThat(servicio.cambiarEstado(VENDEDOR, 3L, new CambioEstadoRequest("pausado")).estado())
                .isEqualTo(EstadoMonitoreo.PAUSADO);
        assertThat(servicio.cambiarEstado(VENDEDOR, 3L, new CambioEstadoRequest("ACTIVO")).estado())
                .isEqualTo(EstadoMonitoreo.ACTIVO);
        assertThat(monitoreo.getFallosConsecutivos()).isZero();
        assertError(() -> servicio.cambiarEstado(VENDEDOR, 3L, new CambioEstadoRequest("ERROR")),
                HttpStatus.BAD_REQUEST, CambioEstadoRequest.MENSAJE);
    }

    @Test
    void unMonitoreoDeOtroVendedorNoExiste() {
        Monitoreo ajeno = Monitoreo.porUrl(77L, URL_ML, PublicacionUrl.reconocer(URL_ML), 6);
        when(monitoreos.findById(4L)).thenReturn(Optional.of(ajeno));

        assertError(() -> servicio.eliminar(VENDEDOR, 4L), HttpStatus.NOT_FOUND, MonitoreoService.MENSAJE_NO_ENCONTRADO);
        assertError(() -> servicio.cambiarEstado(VENDEDOR, 4L, new CambioEstadoRequest("PAUSADO")),
                HttpStatus.NOT_FOUND, MonitoreoService.MENSAJE_NO_ENCONTRADO);
        verify(monitoreos, never()).delete(any());
    }

    private void conPlan(String nombre) {
        Plan plan = instanciar(Plan.class);
        ReflectionTestUtils.setField(plan, "nombre", nombre);
        when(usuarios.findById(VENDEDOR)).thenReturn(Optional.of(Usuario.nuevoVendedor("Ana", "a@b.co", "h", plan)));
    }

    private static MonitoreoRequest porPalabra(String palabra, String marketplace, Integer topN) {
        return new MonitoreoRequest("PALABRA_CLAVE", palabra, marketplace, topN, null);
    }

    private static MonitoreoRequest porUrl(String url, Integer frecuencia) {
        return new MonitoreoRequest("URL", url, null, null, frecuencia);
    }

    private static void assertError(Runnable accion, HttpStatus estado, String mensaje) {
        assertThatThrownBy(accion::run)
                .isInstanceOf(ErrorDeNegocio.class)
                .hasMessage(mensaje)
                .extracting("estado").isEqualTo(estado);
    }

    private static <T> T instanciar(Class<T> clase) {
        try {
            var constructor = clase.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
