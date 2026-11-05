import axios from 'axios'

// El mismo API y el mismo JWT de la web. En mobile/.env se puede apuntar a un backend local con la IP del computador
export const API_URL =
    process.env.EXPO_PUBLIC_API_URL ?? 'https://trendly-api.prouddune-5a774dac.eastus2.azurecontainerapps.io/api/v1'

const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro']
const esRutaPublica = (url = '') => RUTAS_PUBLICAS.some((ruta) => url.startsWith(ruta))

// eslint-disable-next-line import/no-named-as-default-member -- axios.create es la forma documentada por axios
const client = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
})

// El token se lee una vez de SecureStore al abrir la app y se mantiene en memoria
let tokenActual = null
export function setToken(token) {
    tokenActual = token
}

let manejadorNoAutorizado = null
export function setManejadorNoAutorizado(fn) {
    manejadorNoAutorizado = fn
}

client.interceptors.request.use((config) => {
    if (tokenActual && !esRutaPublica(config.url)) {
        config.headers.Authorization = `Bearer ${tokenActual}`
    }
    return config
})

// Un 401 en una ruta protegida significa que el token venció o dejó de ser válido: se vuelve al login
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
