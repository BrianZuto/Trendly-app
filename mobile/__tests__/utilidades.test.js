import { mensajeDeError } from '@/core/api/errores'
import { msParaVencer, tokenVigente } from '@/core/auth/token'
import { formatearFecha, formatearPesos, formatearPorcentaje } from '@/core/formato'
import { desdeHace, serieDiaria } from '@/features/producto-detalle/historico'
import { tokenQueVenceEn } from '../test/apiFalso'

describe('formato', () => {
    it.each([
        [159900, '$159.900'],
        [1234567.6, '$1.234.568'],
        [0, '$0'],
        [-2500, '-$2.500'],
        [null, '—'],
    ])('formatearPesos(%p) = %p', (valor, esperado) => {
        expect(formatearPesos(valor)).toBe(esperado)
    })

    it('formatea porcentajes con coma decimal', () => {
        expect(formatearPorcentaje(25.284)).toBe('25,28%')
        expect(formatearPorcentaje(20)).toBe('20%')
        expect(formatearPorcentaje(undefined)).toBe('—')
    })

    it('formatea la fecha corta en español', () => {
        expect(formatearFecha(new Date(2026, 10, 4, 12).toISOString())).toBe('4 nov')
    })
})

describe('token', () => {
    it('lee el vencimiento del JWT', () => {
        expect(tokenVigente(tokenQueVenceEn(60000))).toBe(true)
        expect(tokenVigente(tokenQueVenceEn(-1000))).toBe(false)
        expect(msParaVencer('no-es-un-jwt')).toBe(0)
        expect(msParaVencer(null)).toBe(0)
        const sinExp = `x.${btoa(JSON.stringify({ sub: '1' }))}.y`
        expect(msParaVencer(sinExp)).toBe(Infinity)
    })
})

describe('mensajeDeError', () => {
    it('usa el mensaje del API, el del estado o uno genérico', () => {
        expect(mensajeDeError({ response: { status: 400, data: { message: 'Precio inválido' } } })).toBe('Precio inválido')
        expect(mensajeDeError({ response: { status: 401, data: null } })).toBe('Credenciales inválidas')
        expect(mensajeDeError({ response: { status: 403 } })).toBe('No tienes permiso para realizar esta acción')
        expect(mensajeDeError({ response: { status: 404, data: 'No existe' } })).toBe('No existe')
        expect(mensajeDeError({ response: { status: 409 } }, { 409: 'Repetido' })).toBe('Repetido')
        expect(mensajeDeError({ response: { status: 422, data: {} } })).toBe('No se pudo completar la solicitud')
    })
})

describe('serieDiaria', () => {
    it('deja un punto por día con el precio más bajo y omite los agotados', () => {
        const serie = serieDiaria([
            { fechaCaptura: '2026-11-02T08:00:00', precioCop: 160000, disponible: true },
            { fechaCaptura: '2026-11-01T08:00:00', precioCop: 170000, disponible: true },
            { fechaCaptura: '2026-11-02T20:00:00', precioCop: 155000, disponible: true },
            { fechaCaptura: '2026-11-03T08:00:00', precioCop: 100000, disponible: false },
            { fechaCaptura: '2026-11-03T09:00:00', precioCop: 0, disponible: true },
        ])
        expect(serie.map((p) => p.precio)).toEqual([170000, 155000])
    })

    it('calcula la fecha de inicio de la ventana', () => {
        expect(desdeHace(30, Date.UTC(2026, 10, 30))).toBe('2026-10-31T00:00:00.000Z')
    })
})
