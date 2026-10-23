import { formatearPesos } from '@features/productos/formato'
import { MARKETPLACES } from '@shared/utils/marketplaces'

export { MARKETPLACES, SITIOS_REVENTA, SITIOS_SOPORTADOS } from '@shared/utils/marketplaces'

export const ESTADOS = {
    ACTIVO: { texto: 'Activo', clase: 'estado-activo' },
    PAUSADO: { texto: 'Pausado', clase: 'estado-pausado' },
    ERROR: { texto: 'Error', clase: 'estado-error' },
}

// Cada publicación es una fila; las acciones (pausar, eliminar) son del monitoreo que la trajo
export function filasDe(monitoreos) {
    return monitoreos.flatMap((m) =>
        // Sin capturas todavía (o un monitoreo recién creado): una fila de "pendiente"
        (m.publicaciones ?? []).length === 0
            ? [{ clave: `m${m.id}`, monitoreo: m, pub: null }]
            : m.publicaciones.map((pub) => ({ clave: `m${m.id}-${pub.idPublicacion}`, monitoreo: m, pub })),
    )
}

export const ordenarPorPrecio = (filas) =>
    [...filas].sort((a, b) => (a.pub?.precio ?? Infinity) - (b.pub?.precio ?? Infinity))

// "hace 3 min", "hoy 12:04", "16 oct 08:10"
export function cuando(fechaIso, ahora = Date.now()) {
    if (!fechaIso) return 'Pendiente'
    const fecha = new Date(fechaIso)
    const minutos = Math.round((ahora - fecha.getTime()) / 60000)
    if (minutos < 1) return 'hace un momento'
    if (minutos < 60) return `hace ${minutos} min`
    const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    const hoy = new Date(ahora).toDateString() === fecha.toDateString()
    return hoy ? `hoy ${hora}` : `${fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ${hora}`
}

export function comoSeVigila(m) {
    if (m.tipo === 'URL') return 'Por URL'
    return `"${m.valor}" · top ${m.topN}`
}

export const pesos = (valor) => formatearPesos(valor).replace(/\s/g, '')

export const variacion = (antes, ahora) => Math.round(((ahora - antes) / antes) * 1000) / 10

export const etiquetaFoto = (foto, enUso) =>
    `${enUso ? 'En uso · ' : ''}De la publicación de ${foto.vendedor} · ${MARKETPLACES[foto.marketplace].nombre}`
