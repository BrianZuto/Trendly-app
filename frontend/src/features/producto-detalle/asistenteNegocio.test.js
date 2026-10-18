import { describe, expect, it } from 'vitest'
import {
    analizarPorQueBajoRentabilidad,
    calcularSimulacionMargen,
    encontrarCompetidorMasAgresivo,
    obtenerPrecioOptimoTop3,
    responderPreguntaAsistente,
} from './asistenteNegocio'

describe('Motor Asistente de Negocio e Inteligencia Comercial', () => {
    const productoBase = {
        id: 1,
        nombre: 'Cámara WiFi Exterior',
        costo: 60000,
        precioVenta: 100000,
        margenObjetivo: 35,
        margenActual: 40,
        proveedor: {
            tienda: 'Shenzhen Tech',
            precioUsd: 12,
            envioUsd: 3,
            precioAnteriorUsd: 10, // subió de costo
        },
    }

    const competidores = [
        {
            vendedor: 'GangaStore',
            marketplace: 'MERCADOLIBRE',
            precio: 85000,
            disponible: true,
            historial: [
                { fecha: '2026-10-10T00:00:00.000Z', precio: 110000 },
                { fecha: '2026-10-18T00:00:00.000Z', precio: 85000 }, // -22.7%
            ],
        },
        {
            vendedor: 'Linio Store',
            marketplace: 'FALABELLA',
            precio: 95000,
            disponible: true,
            historial: [
                { fecha: '2026-10-10T00:00:00.000Z', precio: 95000 },
                { fecha: '2026-10-18T00:00:00.000Z', precio: 95000 },
            ],
        },
        {
            vendedor: 'MercadoDigital',
            marketplace: 'MERCADOLIBRE',
            precio: 105000,
            disponible: true,
            historial: [
                { fecha: '2026-10-10T00:00:00.000Z', precio: 105000 },
                { fecha: '2026-10-18T00:00:00.000Z', precio: 105000 },
            ],
        },
    ]

    describe('calcularSimulacionMargen', () => {
        it('calcula correctamente el precio y la nueva posición para un margen deseado', () => {
            // Costo 60.000, margen 25% -> precio 60.000 / 0.75 = 80.000
            const resultado = calcularSimulacionMargen(productoBase, competidores, 25)
            expect(resultado.precioRequerido).toBe(80000)
            expect(resultado.nuevoMargen).toBe(25)
            // Con 80.000, es menor que todos (85k, 95k, 105k) -> Puesto 1.º
            expect(resultado.posicionNueva).toBe(1)
            expect(resultado.masBaratos).toBe(0)
            expect(resultado.cambioPosicion).toBeGreaterThan(0) // sube puestos
        })

        it('indica si subir el margen a 50% te dejaría fuera de competencia', () => {
            // Costo 60.000, margen 50% -> precio 120.000
            const resultado = calcularSimulacionMargen(productoBase, competidores, 50)
            expect(resultado.precioRequerido).toBe(120000)
            // Con 120.000, todos los 3 competidores venden más barato -> Puesto 4.º
            expect(resultado.posicionNueva).toBe(4)
            expect(resultado.masBaratos).toBe(3)
        })
    })

    describe('analizarPorQueBajoRentabilidad', () => {
        it('detecta si el costo del proveedor subió en USD', () => {
            const analisis = analizarPorQueBajoRentabilidad(productoBase)
            expect(analisis.costoSubio).toBe(true)
            expect(analisis.explicacion).toContain('proveedor')
        })

        it('calcula la brecha respecto al margen objetivo', () => {
            const prodBajo = {
                ...productoBase,
                costo: 75000,
                precioVenta: 90000,
                margenActual: 16.67,
                margenObjetivo: 30,
            }
            const analisis = analizarPorQueBajoRentabilidad(prodBajo)
            expect(analisis.bajoObjetivo).toBe(true)
            expect(analisis.precioParaObjetivo).toBeGreaterThan(90000)
        })
    })

    describe('obtenerPrecioOptimoTop3', () => {
        it('calcula el precio necesario para quedar en el Top 3 y evalúa viabilidad', () => {
            const res = obtenerPrecioOptimoTop3(productoBase, competidores)
            // Con 85k, 95k, 105k, para ser Top 3 hay que empatar o estar debajo de 105k (o 95k)
            expect(res.viable).toBe(true)
            expect(res.posicionObjetivo).toBe(3)
            expect(res.margenConEsePrecio).toBeGreaterThanOrEqual(productoBase.margenObjetivo)
        })
    })

    describe('encontrarCompetidorMasAgresivo', () => {
        it('identifica al competidor con la mayor reducción de precio', () => {
            const agresivo = encontrarCompetidorMasAgresivo(competidores)
            expect(agresivo).toBeDefined()
            expect(agresivo.vendedor).toBe('GangaStore')
            expect(agresivo.cambioPct).toBeLessThan(-20)
        })
    })

    describe('responderPreguntaAsistente', () => {
        it('responde a preguntas sobre porcentaje de margen', () => {
            const resp = responderPreguntaAsistente('¿Qué pasa si subo el margen al 25%?', productoBase, competidores)
            expect(resp.tipo).toBe('SIMULACION_MARGEN')
            expect(resp.texto).toContain('25%')
            expect(resp.texto).toContain('$')
        })

        it('responde a preguntas sobre por qué bajó la rentabilidad', () => {
            const resp = responderPreguntaAsistente('¿Por qué bajó mi rentabilidad?', productoBase, competidores)
            expect(resp.tipo).toBe('ANALISIS_RENTABILIDAD')
            expect(resp.texto).toBeDefined()
        })

        it('responde a preguntas sobre el top 3 o precio óptimo', () => {
            const resp = responderPreguntaAsistente('¿Cómo entrar al top 3?', productoBase, competidores)
            expect(resp.tipo).toBe('OPTIMO_TOP3')
            expect(resp.texto).toContain('Top 3')
        })
    })
})
