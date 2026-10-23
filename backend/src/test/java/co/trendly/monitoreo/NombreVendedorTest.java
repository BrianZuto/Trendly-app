package co.trendly.monitoreo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NombreVendedorTest {

    @Test
    void unIdNumericoDeMercadoLibreSeMuestraComoVendedor() {
        assertThat(NombreVendedor.de("825475401")).isEqualTo("Vendedor 825475401");
    }

    @Test
    void unNombreDeTiendaQuedaIgualYSinVendedorEsNulo() {
        assertThat(NombreVendedor.de("TECNOSHOP.CO")).isEqualTo("TECNOSHOP.CO");
        assertThat(NombreVendedor.de("Xiaomi Store 2")).isEqualTo("Xiaomi Store 2");
        assertThat(NombreVendedor.de(null)).isNull();
        assertThat(NombreVendedor.de("  ")).isNull();
    }
}
