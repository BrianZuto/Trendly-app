import { describe, expect, it } from 'vitest'
import { mensajeDeError } from './errores'

const conRespuesta = (status, data) => ({ response: { status, data } })

describe('mensajeDeError', () => {
    it('avisa cuando no hay conexión con el servidor', () => {
        expect(mensajeDeError(new Error('Network Error'))).toMatch(/No se pudo conectar/)
    })

    it('prioriza el texto fijado para el código HTTP', () => {
        expect(mensajeDeError(conRespuesta(409, { message: 'otro' }), { 409: 'Email ya registrado' })).toBe('Email ya registrado')
    })

    it('usa el mensaje del backend', () => {
        expect(mensajeDeError(conRespuesta(400, { message: 'Debe aceptar la política de tratamiento de datos' }))).toBe(
            'Debe aceptar la política de tratamiento de datos',
        )
        expect(mensajeDeError(conRespuesta(422, { mensaje: 'Alcanzó el límite de su plan' }))).toBe('Alcanzó el límite de su plan')
        expect(mensajeDeError(conRespuesta(400, 'Texto plano'))).toBe('Texto plano')
    })

    it('une los errores de validación en lista', () => {
        const datos = { errors: [{ defaultMessage: 'Nombre obligatorio' }, 'Email inválido'] }
        expect(mensajeDeError(conRespuesta(400, datos))).toBe('Nombre obligatorio. Email inválido')
    })

    it('usa textos por defecto según el código', () => {
        expect(mensajeDeError(conRespuesta(401, {}))).toBe('Credenciales inválidas')
        expect(mensajeDeError(conRespuesta(403, null))).toMatch(/permiso/)
        expect(mensajeDeError(conRespuesta(500, null))).toMatch(/servidor/)
        expect(mensajeDeError(conRespuesta(418, null))).toMatch(/No se pudo completar/)
    })
})