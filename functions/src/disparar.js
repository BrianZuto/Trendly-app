// Llama al endpoint interno del backend que arranca un ciclo de recolección (SCRUM-39).
// Está separado del disparador de Azure para poder probarlo sin Azure ni red.

export const RUTA = '/api/v1/interno/recoleccion/ejecutar'
const TIMEOUT_MS = 30_000

/**
 * @param {object} opciones
 * @param {string} opciones.backendUrl URL base del backend, sin la ruta (BACKEND_URL)
 * @param {string} opciones.apiKey clave que el backend espera en X-Api-Key (RECOLECCION_API_KEY)
 * @param {typeof fetch} [opciones.fetchFn] fetch a usar (en las pruebas, uno simulado)
 * @returns {Promise<{ status: number, cuerpo: string }>} la respuesta del backend: 202 (iniciado) o 200 (ya había uno en curso)
 * @throws si falta configuración o el backend no responde 2xx; así la ejecución queda como fallida en Azure
 */
export async function dispararRecoleccion({ backendUrl, apiKey, fetchFn = fetch }) {
    if (!backendUrl) throw new Error('Falta la variable BACKEND_URL')
    if (!apiKey) throw new Error('Falta la variable RECOLECCION_API_KEY')

    const url = new URL(RUTA, backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`)
    const respuesta = await fetchFn(url, {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const cuerpo = await respuesta.text()
    if (!respuesta.ok) {
        throw new Error(`El backend respondió ${respuesta.status}: ${cuerpo}`)
    }
    return { status: respuesta.status, cuerpo }
}
