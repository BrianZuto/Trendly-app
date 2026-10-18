import { describe, expect, it } from 'vitest'
import { guardarSesion, leerSesionVigente, tokenVigente } from './token'

function crearToken(payload) {
    return `x.${btoa(JSON.stringify(payload))}.y`
}

describe('tokenVigente', () => {
    it('acepta un token que no ha vencido', () => {
        expect(tokenVigente(crearToken({ exp: Math.floor(Date.now() / 1000) + 60 }))).toBe(true)
    })
    it('rechaza un token vencido, ilegible o ausente', () => {
        expect(tokenVigente(crearToken({ exp: Math.floor(Date.now() / 1000) - 60 }))).toBe(false)
        expect(tokenVigente('basura')).toBe(false)
        expect(tokenVigente(null)).toBe(false)
    })
})

describe('leerSesionVigente', () => {
    it('recupera la sesión guardada', () => {
        const token = crearToken({ exp: Math.floor(Date.now() / 1000) + 60 })
        guardarSesion(token, { nombre: 'Ana' })
        expect(leerSesionVigente()).toEqual({ token, usuario: { nombre: 'Ana' } })
    })

    it('limpia la sesión cuando el token venció', () => {
        guardarSesion(crearToken({ exp: 1 }), { nombre: 'Ana' })
        expect(leerSesionVigente()).toEqual({ token: null, usuario: null })
        expect(localStorage.getItem('trendly.token')).toBeNull()
    })
})