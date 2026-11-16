// Ranking de tendencias simulado (SCRUM-53), con las mismas fórmulas de CalculoTendencia.java en el backend
const POSICIONES = 10
const TOPE_VENDEDORES = 20

// [título, palabra clave, precio en MercadoLibre, costo en AliExpress, vendedores, puesto promedio, presencia]
const PRODUCTOS = [
    ['Termo de acero 1 L', 'termo acero', 64900, 28400, 4, 1.2, 1],
    ['Reloj inteligente correa silicona', 'smartwatch', 119900, 52000, 9, 1, 1],
    ['Mouse inalámbrico silencioso', 'mouse inalambrico', 45900, 16800, 6, 2, 1],
    ['Perfume 100 ml', 'perfume hombre', 89900, 44000, 12, 1.5, 1],
    ['Audífonos Bluetooth con estuche', 'audifonos bluetooth', 59900, 21500, 17, 1, 1],
    ['Lámpara LED de escritorio', 'lampara escritorio', 72900, 30100, 3, 3.5, 0.9],
    ['Morral antirrobo con puerto USB', 'morral antirrobo', 99900, 41800, 7, 2.4, 1],
    ['Teclado mecánico compacto', 'teclado mecanico', 149900, 78000, 11, 2, 1],
    ['Cámara de seguridad wifi', 'camara wifi', 84900, 39500, 14, 1.8, 1],
    ['Gafas de sol polarizadas', 'gafas polarizadas', 54900, 14200, 19, 3, 0.8],
    ['Parlante portátil resistente al agua', 'parlante bluetooth', 79900, 36400, 8, 4, 1],
    ['Tenis deportivos livianos', 'tenis running', 129900, 61000, 22, 2.2, 1],
    ['Soporte de celular para carro', 'soporte celular carro', 29900, 7900, 16, 1.6, 1],
    ['Organizador de cables magnético', 'organizador cables', 24900, 6100, 2, 5, 0.7],
    ['Botella plegable de silicona', 'botella plegable', 34900, 11800, 3, 4.5, 0.8],
    ['Aro de luz con trípode', 'aro de luz', 69900, 27900, 10, 3, 1],
    ['Masajeador de cuello eléctrico', 'masajeador cuello', 109900, 43700, 5, 6, 0.9],
    ['Cargador inalámbrico 3 en 1', 'cargador inalambrico', 89900, 38600, 13, 3.8, 1],
    ['Mini proyector portátil', 'mini proyector', 259900, 148000, 6, 4.2, 1],
    ['Humidificador con luz ambiental', 'humidificador', 49900, 19300, 9, 5.5, 0.9],
    ['Cepillo alisador de aire caliente', 'cepillo alisador', 94900, 47200, 15, 4.8, 1],
    ['Báscula digital de cocina', 'bascula cocina', 32900, 12600, 18, 6.5, 0.8],
    ['Funda impermeable para celular', 'funda impermeable', 19900, 5400, 21, 7, 0.6],
    ['Kit de brochas de maquillaje', 'brochas maquillaje', 39900, 22400, 24, 8, 0.5],
]

const redondear = (valor) => Math.round(valor * 10) / 10
const limitar = (valor) => Math.min(100, Math.max(0, valor))

export function rankingSimulado(top = 20) {
    return PRODUCTOS.map(([titulo, palabraClave, precioVenta, costo, vendedores, posicionBusqueda, presencia], i) => {
        const demanda = redondear(limitar(((POSICIONES + 1 - posicionBusqueda) * 100) / POSICIONES) * presencia)
        const margen = redondear(limitar(((precioVenta - costo) * 100) / precioVenta))
        const competencia = redondear(limitar((vendedores * 100) / TOPE_VENDEDORES))
        const puntaje = redondear(0.4 * demanda + 0.3 * margen + 0.3 * (100 - competencia))
        return { titulo, publicacionId: `MCO-${9100 + i}`, productoId: null, palabraClave, precioVenta, costo, vendedores, posicionBusqueda, demanda, margen, competencia, puntaje }
    })
        .sort((a, b) => b.puntaje - a.puntaje || a.titulo.localeCompare(b.titulo))
        .slice(0, Math.min(50, Math.max(1, top)))
        .map((fila, i) => ({ posicion: i + 1, ...fila }))
}
