import { describe, expect, it } from 'vitest'
import {
    analizarHistorialCompetidor,
    calcularPosicion,
    generarAlertasAccionables,
} from './alertasAccionables'

describe('Motor de Alertas Accionables', () => {
    describe('calcularPosicion', () => {
        it('calcula la posición correcta del usuario frente a una lista de precios', () => {
            const competidores = [100000, 120000, 150000]
            // Si mi precio es 90.000, soy el 1.º (0 venden más barato)
            expect(calcularPosicion(90000, competidores)).toEqual({ posicion: 1, total: 4, masBaratos: 0 })
            // Si mi precio es 110.000, soy el 2.º (1 vende más barato)
            expect(calcularPosicion(110000, competidores)).toEqual({ posicion: 2, total: 4, masBaratos: 1 })
            // Si mi precio es 160.000, soy el 4.º (3 venden más barato)
            expect(calcularPosicion(160000, competidores)).toEqual({ posicion: 4, total: 4, masBaratos: 3 })
        })

        it('maneja empates de precio colocando al usuario justamente', () => {
            const competidores = [100000, 100000, 120000]
            expect(calcularPosicion(100000, competidores)).toEqual({ posicion: 1, total: 4, masBaratos: 0 })
        })

        it('funciona cuando no hay competidores', () => {
            expect(calcularPosicion(100000, [])).toEqual({ posicion: 1, total: 1, masBaratos: 0 })
        })
    })

    describe('analizarHistorialCompetidor', () => {
        it('calcula la variación de precio desde el punto más antiguo o relevante', () => {
            const pub = {
                precio: 88000,
                historial: [
                    { fecha: '2026-10-10T00:00:00.000Z', precio: 100000 },
                    { fecha: '2026-10-14T00:00:00.000Z', precio: 100000 },
                    { fecha: '2026-10-18T00:00:00.000Z', precio: 88000 },
                ],
            }
            const res = analizarHistorialCompetidor(pub)
            expect(res.cambioPct).toBeCloseTo(-12, 1)
            expect(res.precioAnterior).toBe(100000)
            expect(res.precioActual).toBe(88000)
        })

        it('retorna cambio 0 si no hay historial o solo 1 punto', () => {
            const pub = { precio: 90000, historial: [{ fecha: '2026-10-18T00:00:00.000Z', precio: 90000 }] }
            const res = analizarHistorialCompetidor(pub)
            expect(res.cambioPct).toBe(0)
            expect(res.precioAnterior).toBe(90000)
        })
    })

    describe('generarAlertasAccionables', () => {
        const productoBase = {
            id: 1,
            nombre: 'Smartwatch V8 Pro',
            costo: 50000,
            precioVenta: 100000,
            margenObjetivo: 30, // Margen mínimo viable: 30% -> costo 50.000 / (1 - 0.3) = $71.429 (~$71.500)
            margenActual: 50,
        }

        it('detecta desplazamiento de puesto y sugiere precio viable si no rompe margen objetivo', () => {
            // El usuario estaba 2.º con 100.000 frente a Linio (110.000) y Éxito (90.000)
            // Linio bajó de 110.000 a 95.000 (-13.6%), pasando al usuario y dejándolo 3.º
            const monitoreos = [
                {
                    marketplace: 'MERCADOLIBRE',
                    publicaciones: [
                        {
                            idPublicacion: 'PUB-1',
                            vendedor: 'Éxito',
                            precio: 90000,
                            disponible: true,
                            historial: [
                                { fecha: '2026-10-10T00:00:00.000Z', precio: 90000 },
                                { fecha: '2026-10-18T00:00:00.000Z', precio: 90000 },
                            ],
                        },
                        {
                            idPublicacion: 'PUB-2',
                            vendedor: 'Linio',
                            precio: 95000,
                            disponible: true,
                            historial: [
                                { fecha: '2026-10-10T00:00:00.000Z', precio: 110000 },
                                { fecha: '2026-10-18T00:00:00.000Z', precio: 95000 },
                            ],
                        },
                    ],
                },
            ]

            const resultado = generarAlertasAccionables(productoBase, monitoreos)
            expect(resultado.alertas.length).toBeGreaterThan(0)
            const alertaLinio = resultado.alertas.find((a) => a.competidor === 'Linio')
            expect(alertaLinio).toBeDefined()
            expect(alertaLinio.tipo).toBe('DESPLAZAMIENTO')
            expect(alertaLinio.porcentajeCambio).toBeLessThan(-10)
            expect(alertaLinio.accion.viable).toBe(true)
            // Para recuperar puesto frente a Linio (95.000), debería sugerir algo menor como 94.900
            expect(alertaLinio.accion.precioSugerido).toBeLessThanOrEqual(95000)
            expect(alertaLinio.accion.margenResultante).toBeGreaterThan(productoBase.margenObjetivo)
        })

        it('advierte cuando competir en precio rompería el margen objetivo', () => {
            // Producto con costo 80.000 y margen objetivo 25% (precio mínimo = 106.700)
            // Competidor baja a 85.000. Si el usuario baja a 84.900, su margen caería a 5.7%, inviable
            const prodEstricto = {
                ...productoBase,
                costo: 80000,
                precioVenta: 120000,
                margenObjetivo: 25,
            }
            const monitoreos = [
                {
                    marketplace: 'MERCADOLIBRE',
                    publicaciones: [
                        {
                            idPublicacion: 'PUB-X',
                            vendedor: 'GangaStore',
                            precio: 85000,
                            disponible: true,
                            historial: [
                                { fecha: '2026-10-10T00:00:00.000Z', precio: 130000 },
                                { fecha: '2026-10-18T00:00:00.000Z', precio: 85000 },
                            ],
                        },
                    ],
                },
            ]

            const resultado = generarAlertasAccionables(prodEstricto, monitoreos)
            const alerta = resultado.alertas.find((a) => a.competidor === 'GangaStore')
            expect(alerta).toBeDefined()
            expect(alerta.accion.viable).toBe(false)
            expect(alerta.accion.texto).toContain('margen objetivo')
        })

        it('detecta oportunidades cuando un competidor sube de precio', () => {
            // Competidor sube de 95.000 a 115.000 (+21%)
            const monitoreos = [
                {
                    marketplace: 'FALABELLA',
                    publicaciones: [
                        {
                            idPublicacion: 'PUB-SUBE',
                            vendedor: 'MegaStore',
                            precio: 115000,
                            disponible: true,
                            historial: [
                                { fecha: '2026-10-10T00:00:00.000Z', precio: 95000 },
                                { fecha: '2026-10-18T00:00:00.000Z', precio: 115000 },
                            ],
                        },
                    ],
                },
            ]

            const resultado = generarAlertasAccionables(productoBase, monitoreos)
            const alerta = resultado.alertas.find((a) => a.tipo === 'OPORTUNIDAD_SUBIDA')
            expect(alerta).toBeDefined()
            expect(alerta.porcentajeCambio).toBeGreaterThan(15)
            expect(alerta.accion.viable).toBe(true)
        })

        it('detecta cuando el mercado es estable sin variaciones bruscas', () => {
            const monitoreos = [
                {
                    marketplace: 'MERCADOLIBRE',
                    publicaciones: [
                        {
                            idPublicacion: 'PUB-EST',
                            vendedor: 'TiendaNormal',
                            precio: 100000,
                            disponible: true,
                            historial: [
                                { fecha: '2026-10-10T00:00:00.000Z', precio: 100000 },
                                { fecha: '2026-10-18T00:00:00.000Z', precio: 100000 },
                            ],
                        },
                    ],
                },
            ]

            const resultado = generarAlertasAccionables(productoBase, monitoreos)
            expect(resultado.resumen.estadoGeneral).toBe('ESTABLE')
            expect(resultado.alertas.length).toBe(0)
        })
    })
})
