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
