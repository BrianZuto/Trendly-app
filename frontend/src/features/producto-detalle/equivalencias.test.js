import { describe, expect, it, beforeEach } from 'vitest'
import {
    normalizar,
    extraerTokens,
    puntajeEquivalencia,
    detectarPreciosSospechosos,
    motivoSospecha,
    analizarEquivalencias,
    agregarExclusion,
    quitarExclusion,
    leerExclusiones,
} from './equivalencias'

describe('Motor de Productos Equivalentes', () => {
    describe('normalizar', () => {
        it('elimina tildes y normaliza espacios', () => {
            expect(normalizar('  Samsung Galaxy S24 Ültra  128GB ')).toBe('samsung galaxy s24 ultra 128gb')
        })

        it('devuelve vacío para valores nulos', () => {
            expect(normalizar(null)).toBe('')
            expect(normalizar(undefined)).toBe('')
            expect(normalizar('')).toBe('')
        })
    })

    describe('extraerTokens', () => {
        it('extrae capacidades con unidades', () => {
            const { capacidades } = extraerTokens('Samsung Galaxy S24 128GB 8GB RAM')
            expect(capacidades).toContain('128gb')
            expect(capacidades).toContain('8gb')
        })

        it('extrae fracciones tipo RAM/almacenamiento', () => {
            const { capacidades } = extraerTokens('iPhone 15 Pro 256GB 8/256')
            expect(capacidades.some((c) => c.includes('8/256'))).toBe(true)
        })

        it('extrae tokens básicos', () => {
            const { tokens } = extraerTokens('Logitech MX Master 3S')
            expect(tokens).toContain('logitech')
            expect(tokens).toContain('mx')
            expect(tokens).toContain('master')
        })
    })

    describe('puntajeEquivalencia', () => {
        it('da puntaje alto para productos idénticos', () => {
            const puntaje = puntajeEquivalencia('Samsung Galaxy S24 Ultra 256GB', 'Samsung Galaxy S24 Ultra 256GB Negro')
            expect(puntaje).toBeGreaterThanOrEqual(70)
        })

        it('da puntaje bajo para productos muy distintos', () => {
            const puntaje = puntajeEquivalencia('Samsung Galaxy S24 Ultra 256GB', 'Apple MacBook Air M3 512GB')
            expect(puntaje).toBeLessThan(30)
        })

        it('penaliza capacidades diferentes', () => {
            const mismo = puntajeEquivalencia('Samsung Galaxy S24 128GB', 'Samsung Galaxy S24 128GB')
            const distinto = puntajeEquivalencia('Samsung Galaxy S24 128GB', 'Samsung Galaxy S24 256GB')
            expect(mismo).toBeGreaterThan(distinto)
        })

        it('devuelve 0 para textos vacíos', () => {
            expect(puntajeEquivalencia('', 'Samsung')).toBe(0)
            expect(puntajeEquivalencia('Samsung', '')).toBe(0)
        })
    })

    describe('detectarPreciosSospechosos', () => {
        it('detecta precios outlier por IQR', () => {
            const pubs = [
                { idPublicacion: '1', precio: 140000, disponible: true },
                { idPublicacion: '2', precio: 142000, disponible: true },
                { idPublicacion: '3', precio: 145000, disponible: true },
                { idPublicacion: '4', precio: 143000, disponible: true },
                { idPublicacion: '5', precio: 50000, disponible: true }, // outlier bajo
                { idPublicacion: '6', precio: 300000, disponible: true }, // outlier alto
            ]
            const sospechosos = detectarPreciosSospechosos(pubs)
            expect(sospechosos.has('5')).toBe(true)
            expect(sospechosos.has('6')).toBe(true)
            expect(sospechosos.has('1')).toBe(false)
        })

        it('devuelve vacío con menos de 3 publicaciones', () => {
            const pubs = [
                { idPublicacion: '1', precio: 140000, disponible: true },
                { idPublicacion: '2', precio: 50000, disponible: true },
            ]
            expect(detectarPreciosSospechosos(pubs).size).toBe(0)
        })

        it('ignora publicaciones sin stock', () => {
            const pubs = [
                { idPublicacion: '1', precio: 140000, disponible: true },
                { idPublicacion: '2', precio: 142000, disponible: true },
                { idPublicacion: '3', precio: 145000, disponible: true },
                { idPublicacion: '4', precio: 50000, disponible: false }, // sin stock
            ]
            const sospechosos = detectarPreciosSospechosos(pubs)
            expect(sospechosos.has('4')).toBe(false)
        })
    })

    describe('motivoSospecha', () => {
        it('indica que un precio es muy bajo', () => {
            const pubs = [
                { idPublicacion: '1', precio: 140000, disponible: true },
                { idPublicacion: '2', precio: 145000, disponible: true },
                { idPublicacion: '3', precio: 150000, disponible: true },
            ]
            const motivo = motivoSospecha(50000, pubs)
            expect(motivo.tipo).toBe('muy-bajo')
            expect(motivo.icono).toBe('↓')
        })

        it('indica que un precio es muy alto', () => {
            const pubs = [
                { idPublicacion: '1', precio: 140000, disponible: true },
                { idPublicacion: '2', precio: 145000, disponible: true },
                { idPublicacion: '3', precio: 150000, disponible: true },
            ]
            const motivo = motivoSospecha(300000, pubs)
            expect(motivo.tipo).toBe('muy-alto')
            expect(motivo.icono).toBe('↑')
        })

        it('devuelve null con pocas publicaciones', () => {
            const pubs = [{ idPublicacion: '1', precio: 140000, disponible: true }]
            expect(motivoSospecha(50000, pubs)).toBeNull()
        })
    })

    describe('exclusiones (localStorage)', () => {
        beforeEach(() => {
            localStorage.clear()
        })

        it('agrega y lee exclusiones', () => {
            agregarExclusion('prod1', { idPublicacion: 'pub1', vendedor: 'Tienda X', precio: 50000 })
            const exclusiones = leerExclusiones('prod1')
            expect(exclusiones).toHaveLength(1)
            expect(exclusiones[0].idPublicacion).toBe('pub1')
        })

        it('no duplica exclusiones', () => {
            agregarExclusion('prod1', { idPublicacion: 'pub1', vendedor: 'Tienda X', precio: 50000 })
            agregarExclusion('prod1', { idPublicacion: 'pub1', vendedor: 'Tienda X', precio: 50000 })
            expect(leerExclusiones('prod1')).toHaveLength(1)
        })

        it('quita exclusiones', () => {
            agregarExclusion('prod1', { idPublicacion: 'pub1', vendedor: 'Tienda X', precio: 50000 })
            agregarExclusion('prod1', { idPublicacion: 'pub2', vendedor: 'Tienda Y', precio: 60000 })
            quitarExclusion('prod1', 'pub1')
            const exclusiones = leerExclusiones('prod1')
            expect(exclusiones).toHaveLength(1)
            expect(exclusiones[0].idPublicacion).toBe('pub2')
        })

        it('devuelve vacío si no hay datos', () => {
            expect(leerExclusiones('inexistente')).toEqual([])
        })
    })

    describe('analizarEquivalencias', () => {
        beforeEach(() => {
            localStorage.clear()
        })

        it('clasifica publicaciones por puntaje y detecta sospechosas', () => {
            const resultado = analizarEquivalencias({
                nombreProducto: 'Samsung Galaxy S24 Ultra 256GB',
                productoId: 'prod1',
                publicaciones: [
                    { idPublicacion: '1', vendedor: 'Samsung Galaxy S24 Ultra 256GB Negro', precio: 140000, disponible: true },
                    { idPublicacion: '2', vendedor: 'Apple MacBook Air M3', precio: 145000, disponible: true },
                    { idPublicacion: '3', vendedor: 'Samsung Galaxy S24 256GB', precio: 142000, disponible: true },
                    { idPublicacion: '4', vendedor: 'Cable USB-C', precio: 5000, disponible: true },
                ],
            })

            expect(resultado.resumen.total).toBe(4)
            // Al menos el producto con nombre casi idéntico debe ser equivalente
            expect(resultado.equivalentes.length).toBeGreaterThanOrEqual(1)
        })

        it('excluye publicaciones marcadas por el usuario', () => {
            agregarExclusion('prod1', { idPublicacion: '2', vendedor: 'Diferente', precio: 50000 })

            const resultado = analizarEquivalencias({
                nombreProducto: 'Samsung Galaxy S24',
                productoId: 'prod1',
                publicaciones: [
                    { idPublicacion: '1', vendedor: 'Samsung Galaxy S24', precio: 140000, disponible: true },
                    { idPublicacion: '2', vendedor: 'Diferente', precio: 50000, disponible: true },
                ],
            })

            expect(resultado.resumen.totalExcluidas).toBe(1)
            expect(resultado.excluidas).toHaveLength(1)
        })
    })
})
