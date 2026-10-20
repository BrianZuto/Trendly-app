package co.trendly.producto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import co.trendly.usuario.Plan;
import co.trendly.usuario.Usuario;
import co.trendly.usuario.UsuarioRepository;

/** Pruebas unitarias del CRUD de productos (SCRUM-33), sin Spring ni base de datos. */
class ProductoServiceTest {

    private static final long VENDEDOR = 5L;

    private ProductoRepository productos;
    private UsuarioRepository usuarios;
    private ProductoService servicio;

    @BeforeEach
    void preparar() throws Exception {
        productos = mock(ProductoRepository.class);
        usuarios = mock(UsuarioRepository.class);
        servicio = new ProductoService(productos, usuarios);

        var constructorPlan = Plan.class.getDeclaredConstructor();
        constructorPlan.setAccessible(true);
        Plan gratuito = constructorPlan.newInstance();
        ReflectionTestUtils.setField(gratuito, "maxProductos", 10);
        when(usuarios.findById(VENDEDOR)).thenReturn(Optional.of(Usuario.nuevoVendedor("Ana", "ana@correo.co", "hash", gratuito)));
        when(productos.saveAndFlush(any(Producto.class))).thenAnswer(invocacion -> {
            Producto guardado = invocacion.getArgument(0);
            ReflectionTestUtils.setField(guardado, "id", 1L);
            return guardado;
        });
    }

    @Test
    void creaElProductoYCalculaElMargenActual() {
        ProductoResponse creado = servicio.crear(VENDEDOR, solicitud("  Audífonos ", " SKU-1 ", "50000", "89900", "30"));

        assertThat(creado.id()).isEqualTo(1L);
        assertThat(creado.nombre()).isEqualTo("Audífonos");
        assertThat(creado.sku()).isEqualTo("SKU-1");
        // (89900 − 50000) / 89900 = 44,38 %
        assertThat(creado.margenActual()).isEqualByComparingTo("44.38");
    }

    @Test
    void elMargenActualEsNegativoSiSeVendePorDebajoDelCosto() {
        ProductoResponse creado = servicio.crear(VENDEDOR, solicitud("Audífonos", null, "100", "80", "30"));

        assertThat(creado.margenActual()).isEqualByComparingTo("-25.00");
    }

    @Test
    void unSkuVacioSeGuardaComoNulo() {
        ProductoResponse creado = servicio.crear(VENDEDOR, solicitud("Audífonos", "   ", "100", "200", "30"));

        assertThat(creado.sku()).isNull();
    }

    @Test
    void alLlegarAlCupoDelPlanNoCrea() {
        when(productos.countByUsuarioId(VENDEDOR)).thenReturn(10L);

        assertThatThrownBy(() -> servicio.crear(VENDEDOR, solicitud("Audífonos", "SKU-1", "100", "200", "30")))
                .isInstanceOf(LimitePlanException.class)
                .hasMessage(LimitePlanException.MENSAJE);
        verify(productos, never()).saveAndFlush(any());
    }

    @Test
    void unSkuRepetidoDelMismoVendedorNoSeGuarda() {
        when(productos.existsByUsuarioIdAndSkuIgnoreCase(VENDEDOR, "SKU-1")).thenReturn(true);

        assertThatThrownBy(() -> servicio.crear(VENDEDOR, solicitud("Audífonos", "SKU-1", "100", "200", "30")))
                .isInstanceOf(SkuRepetidoException.class);
        verify(productos, never()).saveAndFlush(any());
    }

    @Test
    void siLaBaseDeDatosRechazaElSkuTambienEsRepetido() {
        when(productos.saveAndFlush(any(Producto.class))).thenThrow(new DataIntegrityViolationException("uk"));

        assertThatThrownBy(() -> servicio.crear(VENDEDOR, solicitud("Audífonos", "SKU-1", "100", "200", "30")))
                .isInstanceOf(SkuRepetidoException.class);
    }

    @Test
    void editarUnProductoAjenoOInexistenteEsNoEncontrado() {
        when(productos.findByIdAndUsuarioId(99L, VENDEDOR)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.editar(VENDEDOR, 99L, solicitud("X", null, "1", "2", "3")))
                .isInstanceOf(ProductoNoEncontradoException.class);
        assertThatThrownBy(() -> servicio.consultar(VENDEDOR, 99L)).isInstanceOf(ProductoNoEncontradoException.class);
        assertThatThrownBy(() -> servicio.eliminar(VENDEDOR, 99L)).isInstanceOf(ProductoNoEncontradoException.class);
    }

    @Test
    void editarConservaSuPropioSkuPeroNoAceptaElDeOtroProducto() {
        Producto existente = new Producto(VENDEDOR);
        existente.actualizar("Audífonos", "SKU-1", BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ONE);
        when(productos.findByIdAndUsuarioId(1L, VENDEDOR)).thenReturn(Optional.of(existente));

        ProductoResponse editado = servicio.editar(VENDEDOR, 1L, solicitud("Audífonos Pro", "SKU-1", "60", "120", "40"));
        assertThat(editado.nombre()).isEqualTo("Audífonos Pro");
        assertThat(editado.margenActual()).isEqualByComparingTo("50.00");

        when(productos.existsByUsuarioIdAndSkuIgnoreCaseAndIdNot(VENDEDOR, "SKU-2", 1L)).thenReturn(true);
        assertThatThrownBy(() -> servicio.editar(VENDEDOR, 1L, solicitud("Audífonos", "SKU-2", "1", "2", "3")))
                .isInstanceOf(SkuRepetidoException.class);
    }

    private static ProductoRequest solicitud(String nombre, String sku, String costo, String precio, String margen) {
        return new ProductoRequest(nombre, sku, new BigDecimal(costo), new BigDecimal(precio), new BigDecimal(margen));
    }
}
