package co.trendly.monitoreo;

/**
 * Cómo se muestra el vendedor de una publicación. La API de MercadoLibre solo entrega el id numérico del vendedor
 * (SCRUM-40); en pantalla se muestra como "Vendedor 123" en vez de un número suelto. El dato guardado no cambia.
 */
public final class NombreVendedor {

    private NombreVendedor() {
    }

    public static String de(String vendedor) {
        if (vendedor == null || vendedor.isBlank()) {
            return null;
        }
        return vendedor.chars().allMatch(Character::isDigit) ? "Vendedor " + vendedor : vendedor;
    }
}
