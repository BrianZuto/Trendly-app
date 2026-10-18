import { describe, expect, it } from 'vitest'
import { MENSAJE_POLITICA, validarEmail, validarLogin, validarPassword, validarRegistro } from './validaciones'

const registroValido = {
    nombre: 'Ana Pérez',
    email: 'ana@correo.com',
    password: 'Clave1234',
    confirmar: 'Clave1234',
    aceptaPolitica: true,
}

describe('validarEmail', () => {
    it('acepta un email válido', () => expect(validarEmail('ana@correo.com')).toBe(''))
    it('rechaza vacío y formato inválido', () => {
        expect(validarEmail('  ')).toBe('El email es obligatorio')
        expect(validarEmail('ana@correo')).toBe('Ingresa un email válido')
    })
})

describe('validarPassword', () => {
    it('acepta 8 o más caracteres con letras y números', () => expect(validarPassword('Clave1234')).toBe(''))
    it('rechaza vacía y de menos de 8 caracteres', () => {
        expect(validarPassword('')).toBe('La contraseña es obligatoria')
        expect(validarPassword('Ab1')).toMatch(/al menos 8/)
    })
    it('rechaza solo letras o solo números', () => {
        expect(validarPassword('sololetras')).toMatch(/letras y números/)
        expect(validarPassword('12345678')).toMatch(/letras y números/)
    })
})

describe('validarRegistro', () => {
    it('no reporta errores con datos válidos', () => expect(validarRegistro(registroValido)).toEqual({}))

    it('exige aceptar la política con el mensaje del backend', () => {
        const errores = validarRegistro({ ...registroValido, aceptaPolitica: false })
        expect(errores.aceptaPolitica).toBe(MENSAJE_POLITICA)
    })

    it('detecta contraseñas que no coinciden y confirmación vacía', () => {
        expect(validarRegistro({ ...registroValido, confirmar: 'Otra12345' }).confirmar).toBe('Las contraseñas no coinciden')
        expect(validarRegistro({ ...registroValido, confirmar: '' }).confirmar).toBe('Confirma tu contraseña')
    })

    it('marca el nombre obligatorio', () => expect(validarRegistro({ ...registroValido, nombre: ' ' }).nombre).toBeTruthy())
})

describe('validarLogin', () => {
    it('pide email y contraseña', () => {
        expect(Object.keys(validarLogin({ email: '', password: '' }))).toEqual(['email', 'password'])
        expect(validarLogin({ email: 'a@b.co', password: 'x' })).toEqual({})
    })
})