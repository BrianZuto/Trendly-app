import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dispararRecoleccion, RUTA } from '../src/disparar.js'

function fetchSimulado(status, cuerpo) {
    const llamadas = []
    const fetchFn = async (url, opciones) => {
        llamadas.push({ url: String(url), opciones })
        return new Response(cuerpo, { status })
    }
    return { fetchFn, llamadas }
}

describe('dispararRecoleccion (SCRUM-39)', () => {
    it('llama al endpoint interno con POST y la API key', async () => {
        const { fetchFn, llamadas } = fetchSimulado(202, '{"estado":"INICIADO"}')

        const resultado = await dispararRecoleccion({ backendUrl: 'https://api.trendly.co', apiKey: 'clave', fetchFn })

        assert.equal(resultado.status, 202)
        assert.equal(llamadas.length, 1)
        assert.equal(llamadas[0].url, `https://api.trendly.co${RUTA}`)
        assert.equal(llamadas[0].opciones.method, 'POST')
        assert.equal(llamadas[0].opciones.headers['X-Api-Key'], 'clave')
    })

    it('respeta la barra final y una ruta base en BACKEND_URL', async () => {
        const { fetchFn, llamadas } = fetchSimulado(202, '')

        await dispararRecoleccion({ backendUrl: 'https://trendly.trycloudflare.com/', apiKey: 'k', fetchFn })

        assert.equal(llamadas[0].url, `https://trendly.trycloudflare.com${RUTA}`)
    })

    it('un ciclo ya en curso (200) no es un error', async () => {
        const { fetchFn } = fetchSimulado(200, '{"estado":"EN_CURSO"}')

        const resultado = await dispararRecoleccion({ backendUrl: 'http://localhost:8080', apiKey: 'k', fetchFn })

        assert.equal(resultado.status, 200)
    })

    it('si el backend rechaza la clave o falla, la ejecución falla con el motivo', async () => {
        for (const status of [401, 503, 500]) {
            const { fetchFn } = fetchSimulado(status, '{"message":"API key inválida"}')
            await assert.rejects(
                dispararRecoleccion({ backendUrl: 'http://localhost:8080', apiKey: 'mala', fetchFn }),
                new RegExp(`respondió ${status}`),
            )
        }
    })

    it('sin configuración no llama al backend', async () => {
        const { fetchFn, llamadas } = fetchSimulado(202, '')

        await assert.rejects(dispararRecoleccion({ backendUrl: '', apiKey: 'k', fetchFn }), /BACKEND_URL/)
        await assert.rejects(dispararRecoleccion({ backendUrl: 'http://x', apiKey: undefined, fetchFn }), /RECOLECCION_API_KEY/)
        assert.equal(llamadas.length, 0)
    })
})
