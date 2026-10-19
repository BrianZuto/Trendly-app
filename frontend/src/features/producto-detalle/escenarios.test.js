import { describe, expect, it } from 'vitest'
import { calcularEscenarios } from './escenarios'

describe('calcularEscenarios (Inteligencia comercial en 3 escenarios)', () => {
    it('calcula escenarios coherentes cuando hay competidores con stock', () => {
        const resultado = calcularEscenarios({
            costo: 100000,
            margenObjetivo: 25,
            precioActual: 140000,
            publicaciones: [
                { idPublicacion: '1', precio: 135000, disponible: true },
                { idPublicacion: '2', precio: 142000, disponible: true },
                { idPublicacion: '3', precio: 155000, disponible: true },
                { idPublicacion: '4', precio: 160000, disponible: true },
            ],
        })

        expect(resultado).toHaveLength(3)

        const [conservador, equilibrado, margenAlto] = resultado

        // Conservador busca el liderato con ganancia
        expect(conservador.precio).toBeLessThanOrEqual(134000)
        expect(conservador.margen).toBeGreaterThan(0)
        expect(conservador.resumenPosicion).toMatch(/1\.º de 5/)

        // Equilibrado busca el punto medio protegiendo el margen objetivo
        expect(equilibrado.precio).toBeGreaterThanOrEqual(conservador.precio)
        expect(equilibrado.margen).toBeGreaterThanOrEqual(25)

        // Mayor margen se sitúa en la parte superior
        expect(margenAlto.precio).toBeGreaterThan(equilibrado.precio)
        expect(margenAlto.margen).toBeGreaterThan(equilibrado.margen)
    })

    it('respeta el precio piso de seguridad para no vender a pérdida', () => {
        const resultado = calcularEscenarios({
            costo: 100000,
            margenObjetivo: 20,
            precioActual: 125000,
            publicaciones: [
                { idPublicacion: '1', precio: 80000, disponible: true }, // competidor a precio irreal
            ],
        })

        const [conservador] = resultado
        // No debe bajar de costo (100.000)
        expect(conservador.precio).toBeGreaterThan(100000)
        expect(conservador.margen).toBeGreaterThan(0)
    })

    it('calcula escenarios lógicos cuando no hay publicaciones de competidores', () => {
        const resultado = calcularEscenarios({
            costo: 50000,
            margenObjetivo: 30,
            precioActual: 71500,
            publicaciones: [],
        })

        expect(resultado).toHaveLength(3)
        const [conservador, equilibrado, margenAlto] = resultado

        expect(conservador.precio).toBeLessThan(equilibrado.precio)
        expect(equilibrado.precio).toBeLessThan(margenAlto.precio)
        expect(conservador.resumenPosicion).toBe('Sin competidores activos con stock')
    })
})
