import { TRM } from '@features/productos/formato'

// Recomendación por reglas: compara las ofertas del proveedor por precio con envío,
// tiempo de entrega, calificación y ventas. Es la base sobre la que el backend
// podría sumar una explicación con IA; el puntaje y las alertas no dependen de ella.

export const total = (o) => o.precioUsd + o.envioUsd
export const totalPesos = (o) => Math.round((total(o) * TRM) / 100) * 100

const PESOS = { precio: 0.4, entrega: 0.2, confianza: 0.25, ventas: 0.15 }

// Lo que hace dudar de una oferta, aunque sea barata
export function alertasDe(o) {
    const alertas = []
    if (o.calificacion < 4.2) alertas.push('Calificación baja')
    if (o.resenas < 30) alertas.push('Pocas reseñas')
    if (o.diasMax > 25) alertas.push('Entrega lenta')
    return alertas
}

export function puntuar(ofertas) {
    if (ofertas.length === 0) return []
    const totales = ofertas.map(total)
    const masBarato = Math.min(...totales)
    const masRapido = Math.min(...ofertas.map((o) => o.diasMax))
    const maxVentas = Math.log10(Math.max(...ofertas.map((o) => o.ventas)) + 1)
    return ofertas.map((o) => {
        // La calificación pesa según cuántas reseñas la respaldan
        const respaldo = Math.min(1, Math.log10(o.resenas + 1) / 3)
        const partes = {
            precio: masBarato / total(o),
            entrega: masRapido / o.diasMax,
            confianza: ((o.calificacion - 3) / 2) * respaldo,
            ventas: maxVentas ? Math.log10(o.ventas + 1) / maxVentas : 0,
        }
        const alertas = alertasDe(o)
        const puntaje = Object.entries(PESOS).reduce((suma, [clave, peso]) => suma + partes[clave] * peso, 0) - alertas.length * 0.08
        return { ...o, puntaje: Math.round(puntaje * 100), alertas }
    })
}

const mejorPor = (lista, valor, menor = true) =>
    lista.reduce((a, b) => ((menor ? valor(b) < valor(a) : valor(b) > valor(a)) ? b : a))

// Insignias para cada oferta y la recomendada, con sus razones en palabras
export function recomendar(ofertas) {
    const puntuadas = puntuar(ofertas)
    if (puntuadas.length === 0) return { ofertas: [], recomendada: null, razones: [] }
    const confiables = puntuadas.filter((o) => o.alertas.length === 0)
    const base = confiables.length ? confiables : puntuadas
    const recomendada = mejorPor(base, (o) => o.puntaje, false)
    const insignias = new Map(puntuadas.map((o) => [o.idPublicacion, []]))
    const marcar = (o, texto) => insignias.get(o.idPublicacion).push(texto)
    marcar(recomendada, 'Recomendado')
    marcar(mejorPor(puntuadas, total), 'Más barato')
    marcar(mejorPor(puntuadas, (o) => o.diasMax), 'Llega más rápido')
    marcar(mejorPor(base, (o) => o.calificacion * Math.min(1, o.resenas / 100), false), 'Mejor calificado')
    marcar(mejorPor(puntuadas, (o) => o.ventas, false), 'Más vendido')

    const promedio = puntuadas.reduce((s, o) => s + total(o), 0) / puntuadas.length
    const ahorro = Math.round((1 - total(recomendada) / promedio) * 100)
    const razones = [
        ahorro > 0 ? `${ahorro}% más barato que el promedio, con envío incluido` : 'Precio con envío cerca del promedio',
        `Llega en ${recomendada.diasMin}–${recomendada.diasMax} días`,
        `${recomendada.calificacion.toLocaleString('es-CO')} de calificación con ${recomendada.resenas.toLocaleString('es-CO')} reseñas`,
        `${recomendada.ventas.toLocaleString('es-CO')} ventas`,
    ]
    return {
        ofertas: puntuadas.map((o) => ({ ...o, insignias: insignias.get(o.idPublicacion) })),
        recomendada: { ...recomendada, insignias: insignias.get(recomendada.idPublicacion) },
        razones,
    }
}

export const ORDENES_OFERTAS = {
    recomendado: { etiqueta: 'Recomendado', comparar: (a, b) => b.puntaje - a.puntaje },
    barato: { etiqueta: 'Más barato', comparar: (a, b) => total(a) - total(b) },
    rapido: { etiqueta: 'Llega más rápido', comparar: (a, b) => a.diasMax - b.diasMax || a.diasMin - b.diasMin },
    calificado: { etiqueta: 'Mejor calificado', comparar: (a, b) => b.calificacion - a.calificacion || b.resenas - a.resenas },
    vendido: { etiqueta: 'Más vendido', comparar: (a, b) => b.ventas - a.ventas },
}
