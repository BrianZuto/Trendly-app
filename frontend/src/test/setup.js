import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import client from '@core/api/client'
import { mockAdapter, reiniciarMock } from '@core/mocks/mockAdapter'

client.defaults.adapter = mockAdapter

// jsdom no trae matchMedia; GSAP lo usa para respetar el movimiento reducido.
// Ninguna consulta coincide, así que en las pruebas no corre ninguna animación
if (!window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
    })
}

beforeEach(() => {
    localStorage.clear()
    reiniciarMock()
})

afterEach(() => {
    cleanup()
})
