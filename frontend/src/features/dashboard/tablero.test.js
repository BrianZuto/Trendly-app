import { describe, expect, it } from 'vitest'
import { agruparPorPublicacion, armarSeries, DIA, escalaPrecios, leer, PASO, pesosCortos, porcentajeConSigno, publicacionesDestacadas, resumir } from './tablero'

const HASTA = Date.parse('2026-10-18T12:00:00Z')

const punto = (fuente, idPublicacion, horasAtras, precio, disponible = true, vendedor = `Tienda ${idPublicacion}`) => ({
    fechaCaptura: new Date(HASTA - horasAtras * 3600000).toISOString(),
    idPublicacion,
    vendedor,
    precioCop: precio,
    disponible,
    fuente,
})

describe('tablero', () => {
    it('agrupa los puntos por publicación y los ordena por fecha', () => {
        const pubs = agruparPorPublicacion([punto('AMAZON', 'B01', 0, 100), punto('AMAZON', 'B01', 12, 90), punto('FALABELLA', 'F1', 6, 80)])
        expect(pubs).toHaveLength(2)
        expect(pubs[0].puntos.map((p) => p.precio)).toEqual([90, 100])
    })

    it('el resumen usa la última captura con stock de cada publicación', () => {
        const pubs = agruparPorPublicacion([
            punto('MERCADOLIBRE', 'MCO1', 6, 50000),
            punto('MERCADOLIBRE', 'MCO1', 0, 60000),
            punto('AMAZON', 'B01', 0, 40000, false),
            punto('FALABELLA', 'F1', 0, 70000),
        ])
        const resumen = resumir(pubs, 66000)
        expect(resumen.minimo).toEqual({ precio: 60000, fuente: 'MERCADOLIBRE', vendedor: 'Tienda MCO1' })
        expect(resumen.promedio).toBe(65000)
        expect(resumen.conStock).toBe(2)
        expect(resumen.masBaratas).toBe(1)
        expect(resumen.diferencia).toBe(10)
    })

    it('sin publicaciones con stock el resumen queda vacío', () => {
        const resumen = resumir(agruparPorPublicacion([punto('AMAZON', 'B01', 0, 40000, false)]), 50000)
        expect(resumen).toMatchObject({ minimo: null, promedio: null, diferencia: null, propio: 50000 })
    })

    it('una plataforma sin stock corta su línea en ese tramo', () => {
        const pubs = agruparPorPublicacion([
            punto('AMAZON', 'B01', 18, 100000),
            punto('AMAZON', 'B01', 12, 100000, false),
            punto('AMAZON', 'B01', 6, 95000),
            punto('FALABELLA', 'F1', 18, 90000),
        ])
        const { filas, series } = armarSeries(pubs, { desde: HASTA - DIA, hasta: HASTA, precioPropio: 98000 })
        expect(series.map((s) => s.clave).sort()).toEqual(['AMAZON', 'FALABELLA'])
        const amazon = filas.map((f) => f.AMAZON)
        expect(amazon).toContain(null)
        expect(amazon[amazon.length - 1]).toBe(95000)
        expect(filas.every((f) => f.propio === 98000)).toBe(true)
        expect(filas[1].t - filas[0].t).toBeLessThanOrEqual(PASO)
    })

    it('sin capturas en el rango no hay filas', () => {
        const pubs = agruparPorPublicacion([punto('AMAZON', 'B01', 24 * 40, 100000)])
        pubs[0].puntos[0].disponible = false
        expect(armarSeries(pubs, { desde: HASTA - 7 * DIA, hasta: HASTA, precioPropio: 1 }).filas).toEqual([])
    })

    it('por publicación muestra las 6 más baratas y cuenta el resto, con color estable', () => {
        const puntos = Array.from({ length: 8 }, (_, i) => punto('MERCADOLIBRE', `MCO${i}`, 0, 10000 + i * 1000))
        const pubs = agruparPorPublicacion(puntos)
        const { elegidas, ocultas } = publicacionesDestacadas(pubs)
        expect(elegidas.map((p) => p.idPublicacion)).toEqual(['MCO0', 'MCO1', 'MCO2', 'MCO3', 'MCO4', 'MCO5'])
        expect(ocultas).toBe(2)
        const a = armarSeries(pubs, { desde: HASTA - 7 * DIA, hasta: HASTA, porPublicacion: true, precioPropio: 1 })
        const b = armarSeries(pubs, { desde: HASTA - 30 * DIA, hasta: HASTA, porPublicacion: true, precioPropio: 1 })
        expect(a.series).toEqual(b.series)
    })

    it('la lectura dice cuánto cambió el mínimo y cuántos venden más barato', () => {
        const pubs = agruparPorPublicacion([punto('AMAZON', 'B01', 6 * 24, 100000), punto('AMAZON', 'B01', 0, 90000)])
        const resumen = resumir(pubs, 95000)
        const texto = leer(pubs, { desde: HASTA - 7 * DIA, hasta: HASTA, dias: 7, resumen })
        expect(texto).toMatch(/^En los últimos 7 días el mínimo de la competencia bajó 10,0 %/)
        expect(texto).toMatch(/Hoy 1 publicación vende más barato que tú\.$/)
    })

    it('el eje Y usa cifras redondas y deja aire arriba y abajo', () => {
        const { dominio, marcas } = escalaPrecios([61200, 74900])
        expect(dominio[0]).toBeLessThan(61200)
        expect(dominio[1]).toBeGreaterThan(74900)
        expect(marcas.length).toBeLessThanOrEqual(6)
        expect(marcas.every((m) => m % 1000 === 0)).toBe(true)
    })

    it('formatea precios cortos y porcentajes con signo', () => {
        expect(pesosCortos(150000)).toBe('$150 mil')
        expect(pesosCortos(1200000)).toBe('$1,2 M')
        expect(porcentajeConSigno(2.6)).toBe('+2,6 %')
        expect(porcentajeConSigno(-4)).toBe('−4,0 %')
    })
})
