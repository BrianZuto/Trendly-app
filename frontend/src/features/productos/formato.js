const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const porcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

export const formatearPesos = (valor) => pesos.format(valor)
export const formatearPorcentaje = (valor) => `${porcentaje.format(valor)}%`

export function calcularMargen(costo, precioVenta) {
    const c = Number(costo)
    const p = Number(precioVenta)
    if (!(c > 0) || !(p > 0)) return null
    return Math.round(((p - c) / p) * 10000) / 100
}

// El precio más bajo que todavía deja el margen objetivo, redondeado a la centena de arriba
export function precioMinimo(costo, margenObjetivo) {
    const c = Number(costo)
    const m = Number(margenObjetivo)
    if (!(c > 0) || !(m >= 0) || m >= 100) return null
    return Math.ceil(c / (1 - m / 100) / 100) * 100
}

// "$139.900" para las paletas giratorias: el mismo texto que se lee, sin el espacio de Intl
export const pesosEnPaletas = (valor) => formatearPesos(valor).replace(/\s/g, '')

// TRM de referencia para mostrar equivalencias en pesos mientras el API no envíe la del día
// (SCRUM-42 la toma de datos.gov.co). El costo que vale es el que calcula el servidor.
export const TRM = 4000

const dolares = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const formatearDolares = (valor) => `US$${dolares.format(valor)}`
