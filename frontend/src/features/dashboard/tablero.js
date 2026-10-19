import { formatearPesos } from '@features/productos/formato'
import { MARKETPLACES, SITIOS_REVENTA } from '@shared/utils/marketplaces'

// SCRUM-43: cálculos del tablero, sin React, para probarlos solos

export const DIA = 86400000
export const PASO = 6 * 3600000
export const RANGOS = [7, 30, 90]
export const MAX_PUBLICACIONES = 6

// Paleta categórica validada (skill dataviz, validate_palette.js): CVD ΔE ≥ 9 entre las tres
// plataformas en todos los pares. El orden es fijo y el color sigue a la entidad, nunca al puesto
const COLORES_PLATAFORMA = { MERCADOLIBRE: '#2a78d6', AMAZON: '#eb6834', FALABELLA: '#1baf7a' }
const COLORES_PUBLICACION = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']
export const COLOR_PROPIO = '#000000'

export const pesos = (valor) => formatearPesos(valor).replace(/\s/g, '')
const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const unDecimal = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// $150 mil, $1,2 M
export function pesosCortos(valor) {
    if (Math.abs(valor) >= 1_000_000) return `$${unDecimal.format(valor / 1_000_000)} M`
    return `$${enteros.format(valor / 1000)} mil`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// "12 oct" y "12 oct, 18:00"
export const fechaCorta = (t) => {
    const fecha = new Date(t)
    return `${fecha.getDate()} ${MESES[fecha.getMonth()]}`
}
export const fechaHora = (t) => {
    const fecha = new Date(t)
    return `${fechaCorta(t)}, ${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
}

export const porcentajeConSigno = (valor) => `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${unDecimal.format(Math.abs(valor))} %`

// Puntos del API agrupados por publicación, cada uno en orden de fecha
export function agruparPorPublicacion(puntos) {
    const porId = new Map()
    for (const p of puntos) {
        const clave = `${p.fuente}|${p.idPublicacion}`
        if (!porId.has(clave)) porId.set(clave, { clave, idPublicacion: p.idPublicacion, vendedor: p.vendedor, fuente: p.fuente, puntos: [] })
        porId.get(clave).puntos.push({ t: Date.parse(p.fechaCaptura), precio: p.precioCop, disponible: p.disponible })
    }
    for (const pub of porId.values()) pub.puntos.sort((a, b) => a.t - b.t)
    return [...porId.values()]
}

// Lo último que se sabe de cada publicación
const ultimo = (pub) => pub.puntos[pub.puntos.length - 1]

// Tarjetas de resumen: siempre con la captura más reciente de cada publicación con stock
export function resumir(publicaciones, precioPropio) {
    const vigentes = publicaciones.map((pub) => ({ ...pub, actual: ultimo(pub) })).filter((pub) => pub.actual?.disponible)
    if (vigentes.length === 0) return { minimo: null, promedio: null, propio: precioPropio, diferencia: null, masBaratas: 0, conStock: 0 }
    const minimo = vigentes.reduce((a, b) => (b.actual.precio < a.actual.precio ? b : a))
    const promedio = Math.round(vigentes.reduce((suma, pub) => suma + pub.actual.precio, 0) / vigentes.length)
    return {
        minimo: { precio: minimo.actual.precio, fuente: minimo.fuente, vendedor: minimo.vendedor },
        promedio,
        propio: precioPropio,
        diferencia: Math.round(((precioPropio - minimo.actual.precio) / minimo.actual.precio) * 1000) / 10,
        masBaratas: vigentes.filter((pub) => pub.actual.precio < precioPropio).length,
        conStock: vigentes.length,
    }
}

// Las capturas llegan cada 6 horas: el tiempo se parte en tramos de 6 h y en cada tramo vale
// el último precio conocido de cada publicación. Así se alinean monitoreos creados a distintas horas
function tramos(desde, hasta) {
    const lista = []
    for (let t = Math.floor(desde / PASO) * PASO; t < hasta; t += PASO) lista.push(t)
    lista.push(hasta)
    return lista
}

function valoresEnTramos(pub, marcas) {
    const valores = []
    let i = 0
    let vigente = null
    for (const marca of marcas) {
        while (i < pub.puntos.length && pub.puntos[i].t <= marca) vigente = pub.puntos[i++]
        valores.push(vigente && vigente.disponible ? vigente.precio : null)
    }
    return valores
}

const minimoDe = (lista) => {
    const conPrecio = lista.filter((v) => v !== null)
    return conPrecio.length ? Math.min(...conPrecio) : null
}

// Las publicaciones más baratas hoy, con color por su identificador (estable al cambiar el rango)
export function publicacionesDestacadas(publicaciones, maximo = MAX_PUBLICACIONES) {
    const ordenadas = [...publicaciones]
        .filter((pub) => pub.puntos.length > 0)
        .sort((a, b) => {
            const pa = ultimo(a).disponible ? ultimo(a).precio : Infinity
            const pb = ultimo(b).disponible ? ultimo(b).precio : Infinity
            return pa - pb
        })
    const elegidas = ordenadas.slice(0, maximo).sort((a, b) => a.clave.localeCompare(b.clave))
    return { elegidas, ocultas: Math.max(0, ordenadas.length - maximo) }
}

// Filas para la gráfica: { t, <clave de serie>: precio | null, propio }. Un null corta la línea:
// una plataforma sin publicaciones con stock no se dibuja en ese tramo
export function armarSeries(publicaciones, { desde, hasta, porPublicacion = false, precioPropio }) {
    const marcas = tramos(desde, hasta)
    let series
    let columnas
    let ocultas = 0
    if (porPublicacion) {
        const destacadas = publicacionesDestacadas(publicaciones)
        ocultas = destacadas.ocultas
        series = destacadas.elegidas.map((pub, i) => ({
            clave: pub.clave,
            nombre: pub.vendedor,
            detalle: MARKETPLACES[pub.fuente].nombre,
            color: COLORES_PUBLICACION[i],
        }))
        columnas = destacadas.elegidas.map((pub) => valoresEnTramos(pub, marcas))
    } else {
        const plataformas = SITIOS_REVENTA.filter((s) => publicaciones.some((pub) => pub.fuente === s))
        series = plataformas.map((s) => ({ clave: s, nombre: MARKETPLACES[s].nombre, detalle: 'Mínimo con stock', color: COLORES_PLATAFORMA[s] }))
        columnas = plataformas.map((s) => {
            const valores = publicaciones.filter((pub) => pub.fuente === s).map((pub) => valoresEnTramos(pub, marcas))
            return marcas.map((_, i) => minimoDe(valores.map((v) => v[i])))
        })
    }
    const filas = marcas.map((t, i) => {
        const fila = { t, propio: precioPropio }
        series.forEach((serie, j) => (fila[serie.clave] = columnas[j][i]))
        return fila
    })
    const hayDatos = filas.some((fila) => series.some((serie) => fila[serie.clave] !== null))
    return { filas: hayDatos ? filas : [], series, ocultas }
}

// El mínimo de la competencia en cada tramo, para la lectura de la gráfica
export function minimoPorTramo(publicaciones, desde, hasta) {
    const marcas = tramos(desde, hasta)
    const valores = publicaciones.map((pub) => valoresEnTramos(pub, marcas))
    return marcas.map((t, i) => ({ t, precio: minimoDe(valores.map((v) => v[i])) })).filter((p) => p.precio !== null)
}

// Lo que dice la gráfica en una frase, siempre calculada con los datos
export function leer(publicaciones, { desde, hasta, dias, resumen }) {
    const minimos = minimoPorTramo(publicaciones, desde, hasta)
    if (minimos.length < 2 || !resumen.minimo) return ''
    const inicio = minimos[0].precio
    const fin = minimos[minimos.length - 1].precio
    const cambio = Math.round(((fin - inicio) / inicio) * 1000) / 10
    const periodo = `En los últimos ${dias} días`
    const tendencia =
        cambio === 0
            ? `${periodo} el mínimo de la competencia se mantuvo en ${pesos(fin)}.`
            : `${periodo} el mínimo de la competencia ${cambio < 0 ? 'bajó' : 'subió'} ${unDecimal.format(Math.abs(cambio))} % (de ${pesos(inicio)} a ${pesos(fin)}).`
    const hoy =
        resumen.masBaratas === 0
            ? 'Hoy nadie con stock vende más barato que tú.'
            : `Hoy ${resumen.masBaratas} ${resumen.masBaratas === 1 ? 'publicación vende' : 'publicaciones venden'} más barato que tú.`
    return `${tendencia} ${hoy}`
}

// Eje Y con cifras redondas y aire arriba y abajo, para que ninguna línea toque el borde
const PASOS_EJE = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000]

export function escalaPrecios(valores, marcasMaximas = 5) {
    const numeros = valores.filter((v) => typeof v === 'number')
    if (numeros.length === 0) return { dominio: [0, 1], marcas: [] }
    const menor = Math.min(...numeros)
    const mayor = Math.max(...numeros)
    const aire = Math.max((mayor - menor) * 0.08, mayor * 0.01)
    const desde = menor - aire
    const hasta = mayor + aire
    const paso = PASOS_EJE.find((p) => (hasta - desde) / p <= marcasMaximas) ?? PASOS_EJE[PASOS_EJE.length - 1]
    const inicio = Math.floor(desde / paso) * paso
    const fin = Math.ceil(hasta / paso) * paso
    const marcas = []
    for (let v = inicio; v <= fin; v += paso) marcas.push(v)
    return { dominio: [inicio, fin], marcas }
}

// Marcas del eje X: una por día en 7 días, y repartidas en 30 y 90
export function marcasDeFechas(filas, cuantas) {
    if (filas.length === 0) return []
    const dias = [...new Set(filas.map((f) => new Date(f.t).setHours(0, 0, 0, 0)))].filter((d) => d >= filas[0].t)
    const cada = Math.max(1, Math.ceil(dias.length / cuantas))
    return dias.filter((_, i) => i % cada === 0)
}
