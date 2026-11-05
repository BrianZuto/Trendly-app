import client from '@/core/api/client'

// Reemplaza la red por un adaptador de axios que responde según "MÉTODO /ruta". Así las pruebas pasan por el
// cliente real (cabecera Authorization y manejo del 401)
export function simularApi(rutas) {
    const llamadas = []
    client.defaults.adapter = async (config) => {
        const clave = `${config.method.toUpperCase()} ${config.url}`
        llamadas.push({ clave, config })
        const manejador = rutas[clave]
        const respuesta = typeof manejador === 'function' ? await manejador(config) : (manejador ?? { status: 404 })
        const { status = 200, data = null } = respuesta
        if (status >= 400) {
            const error = new Error(`HTTP ${status}`)
            error.config = config
            error.response = { status, data, config }
            throw error
        }
        return { data, status, statusText: 'OK', headers: {}, config }
    }
    return llamadas
}

const base64url = (objeto) => btoa(JSON.stringify(objeto)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

// JWT de mentira: la app solo lee "exp" del payload
export function tokenQueVenceEn(ms) {
    return `${base64url({ alg: 'HS256' })}.${base64url({ sub: '1', exp: Math.floor((Date.now() + ms) / 1000) })}.firma`
}

export const USUARIO = { id: 1, nombre: 'Juan David', email: 'vendedor@trendly.co', rol: 'VENDEDOR', plan: 'GRATIS' }

export const PRODUCTO = {
    id: 7,
    nombre: 'Smartwatch AMOLED',
    sku: 'SW-1',
    costo: 112000,
    precioVenta: 159900,
    margenObjetivo: 20,
    margenActual: 29.96,
}

export const ALERTA = {
    id: 3,
    tipo: 'BAJA_PRECIO',
    relevancia: 'ALTA',
    estado: 'NUEVA',
    creadoEn: '2026-11-03T15:00:00Z',
    productoId: 7,
    productoNombre: 'Smartwatch AMOLED',
    competidor: 'Tienda Sonido',
    precioAnterior: 165000,
    precioNuevo: 151400,
    variacionPct: -8.24,
    precioSugerido: 149900,
    decision: null,
}
