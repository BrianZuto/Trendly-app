// Formato a mano: el Intl de Hermes no se comporta igual en todos los Android
// Punto de miles recorriendo los dígitos una sola vez (sin expresiones regulares con retroceso)
function miles(entero) {
    const digitos = String(entero)
    let resultado = ''
    for (let i = 0; i < digitos.length; i++) {
        if (i > 0 && (digitos.length - i) % 3 === 0) resultado += '.'
        resultado += digitos[i]
    }
    return resultado
}

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
