import { describe, expect, it } from 'vitest'
import { nivelSeguridad, requisitosCumplidos } from './passwordSeguridad'
import { validarPassword } from './validaciones'

describe('requisitosCumplidos', () => {
    it('coincide con la validación del formulario (la regla del backend)', () => {
        for (const clave of ['', 'Ab1', 'sololetras', '12345678', 'Clave1234', 'clave1234', 'ñandú2026x']) {
            expect(requisitosCumplidos(clave)).toBe(validarPassword(clave) === '')
        }
    })
})

describe('nivelSeguridad', () => {
    it('vacía no tiene nivel', () => expect(nivelSeguridad('')).toEqual({ nivel: 0, etiqueta: '' }))
    it('sin los requisitos obligatorios es débil', () => expect(nivelSeguridad('abc').etiqueta).toBe('Débil'))
    it('cumpliendo lo obligatorio es aceptable', () => expect(nivelSeguridad('clave1234').etiqueta).toBe('Aceptable'))
    it('con dos o más recomendaciones es fuerte', () => {
        expect(nivelSeguridad('Clave1234!').etiqueta).toBe('Fuerte') // mayúsculas + símbolo
        expect(nivelSeguridad('clave1234567890').etiqueta).toBe('Aceptable') // solo largo
        expect(nivelSeguridad('clave1234567890!').etiqueta).toBe('Fuerte') // largo + símbolo
    })
})