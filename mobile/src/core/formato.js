// Formato a mano: el Intl de Hermes no se comporta igual en todos los Android
const miles = (entero) => String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export function formatearPesos(valor) {
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'
    const redondeado = Math.round(Number(valor))
    return `${redondeado < 0 ? '-' : ''}$${miles(Math.abs(redondeado))}`
}

export function formatearPorcentaje(valor) {
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'
    const redondeado = Math.round(Number(valor) * 100) / 100
    return `${String(redondeado).replace('.', ',')}%`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

export function formatearFecha(iso) {
    const fecha = new Date(iso)
    return `${fecha.getDate()} ${MESES[fecha.getMonth()]}`
}
