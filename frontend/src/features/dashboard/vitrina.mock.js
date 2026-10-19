const ANUNCIOS_FIJOS = [
    {
        id: 'distribuidora-andina',
        tipo: 'PATROCINADO',
        titulo: 'Audífonos Bluetooth desde $18.000 c/u',
        detalle: 'Distribuidora Andina · Pedido mínimo 50 unidades',
        imagen: '/mock/audifonos.jpg',
        imagenAlt: 'Audífonos Bluetooth',
        cta: {
            texto: 'Ver proveedor',
            href: 'https://www.aliexpress.com/wholesale?SearchText=audifonos+bluetooth',
            externo: true,
        },
        anunciante: 'Distribuidora Andina',
    },
    {
        id: 'hot-sale',
        tipo: 'NOTICIA',
        titulo: 'Hot Sale · 16–25 oct',
        detalle: 'Ajusta tus precios antes del pico de tráfico.',
        imagen: '/mock/termo.jpg',
        imagenAlt: 'Termo de acero',
        cta: {
            texto: 'Leer más',
            href: 'https://www.ccce.org.co/',
            externo: true,
        },
    },
]

export function crearAnunciosVitrina(producto, resumen) {
    const oportunidad =
        producto && resumen?.minimo
            ? {
                  id: `oportunidad-${producto.id}`,
                  tipo: 'OPORTUNIDAD',
                  titulo: producto.nombre,
                  detalle:
                      resumen.diferencia > 0
                          ? `Tu precio está ${resumen.diferencia.toLocaleString('es-CO')} % sobre la oferta más baja (${resumen.minimo.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}).`
                          : resumen.diferencia < 0
                            ? `Tu precio está ${Math.abs(resumen.diferencia).toLocaleString('es-CO')} % bajo la oferta más baja (${resumen.minimo.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}).`
                            : 'Tu precio iguala la oferta más baja; revisa tu margen antes de ajustar.',
                  imagen: producto.imagen || '/mock/smartwatch.jpg',
                  imagenAlt: `Producto ${producto.nombre}`,
                  cta: {
                      texto: 'Ver producto',
                      href: `/productos/${producto.id}`,
                      externo: false,
                  },
              }
            : null

    return [ANUNCIOS_FIJOS[0], oportunidad, ANUNCIOS_FIJOS[1]].filter(Boolean)
}

export const ANUNCIOS_EJEMPLO = crearAnunciosVitrina(
    { id: 1, nombre: 'Smartwatch AMOLED', imagen: '/mock/smartwatch.jpg' },
    { minimo: { precio: 149900 }, diferencia: 8 },
)
