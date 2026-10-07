import axios from 'axios'
import { getToken } from '@core/auth/token'
import { mockAdapter } from '@core/mocks/mockAdapter'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

export const USAR_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro']
const esRutaPublica = (url = '') => RUTAS_PUBLICAS.some((ruta) => url.startsWith(ruta))

const client = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
})

if (USAR_MOCK) client.defaults.adapter = mockAdapter

let manejadorNoAutorizado = null
export function setManejadorNoAutorizado(fn) {
    manejadorNoAutorizado = fn
}

client.interceptors.request.use((config) => {
    const token = getToken()
    if (token && !esRutaPublica(config.url)) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

client.interceptors.response.use(
    (respuesta) => respuesta,
    (error) => {
        if (error.response?.status === 401 && !esRutaPublica(error.config?.url)) {
            manejadorNoAutorizado?.()
        }
        return Promise.reject(error)
    },
)

export default client
