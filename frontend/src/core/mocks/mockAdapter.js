// API simulado para trabajar sin backend (VITE_USE_MOCK=true) y para las pruebas
import { AxiosError } from 'axios'

const VIGENCIA_SEGUNDOS = 3600
const PLAN_GRATUITO = { id: 1, nombre: 'Gratuito', maxProductos: 10 }

let usuarios = []
let siguienteId = 1

export function reiniciarMock() {
    usuarios = []
    siguienteId = 1
    sembrarUsuarios()
}

function sembrarUsuarios() {
    agregarUsuario({ nombre: 'Vendedor Demo', email: 'vendedor@trendly.co', password: 'Trendly123', rol: 'VENDEDOR' })
    agregarUsuario({ nombre: 'Admin Demo', email: 'admin@trendly.co', password: 'Trendly123', rol: 'ADMIN' })
}

function agregarUsuario({ nombre, email, password, rol = 'VENDEDOR' }) {
    const usuario = { id: siguienteId++, nombre, email: email.toLowerCase(), password, rol, plan: PLAN_GRATUITO }
    usuarios.push(usuario)
    return usuario
}

const publico = ({ id, nombre, email, rol, plan }) => ({ id, nombre, email, rol, plan })

// Se arma un JWT falso: encabezado.payload.firma, con el id, el rol y el vencimiento
function crearToken(usuario) {
    const codificar = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
    const exp = Math.floor(Date.now() / 1000) + VIGENCIA_SEGUNDOS
    return `${codificar({ alg: 'none' })}.${codificar({ sub: String(usuario.id), rol: usuario.rol, exp })}.mock`
}

function usuarioDelToken(config) {
    const cabecera = config.headers?.Authorization ?? config.headers?.get?.('Authorization')
    if (!cabecera?.startsWith('Bearer ')) return null
    try {
        const payload = JSON.parse(atob(cabecera.slice(7).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload.exp * 1000 <= Date.now()) return null
        return usuarios.find((u) => String(u.id) === payload.sub) ?? null
    } catch {
        return null
    }
}

function leerCuerpo(config) {
    if (!config.data) return {}
    return typeof config.data === 'string' ? JSON.parse(config.data) : config.data
}

function ruta(config) {
    return `${config.method?.toUpperCase()} ${config.url}`
}

// Cada manejador devuelve [estado HTTP, cuerpo de la respuesta]
const manejadores = {
    'POST /auth/registro': (config) => {
        const { nombre, email, password, aceptaPolitica } = leerCuerpo(config)
        if (aceptaPolitica !== true) return [400, { message: 'Debe aceptar la política de tratamiento de datos' }]
        if (!nombre?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) {
            return [400, { message: 'Datos de registro inválidos' }]
        }
        if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            return [400, { message: 'La contraseña debe tener al menos 8 caracteres, con letras y números' }]
        }
        if (usuarios.some((u) => u.email === email.toLowerCase())) return [409, { message: 'El email ya está registrado' }]
        return [201, publico(agregarUsuario({ nombre: nombre.trim(), email, password }))]
    },

    'POST /auth/login': (config) => {
        const { email, password } = leerCuerpo(config)
        const usuario = usuarios.find((u) => u.email === (email ?? '').toLowerCase() && u.password === password)
        if (!usuario) return [401, { message: 'Credenciales inválidas' }]
        return [200, { token: crearToken(usuario) }]
    },

    'GET /auth/me': (config) => {
        const usuario = usuarioDelToken(config)
        return usuario ? [200, publico(usuario)] : [401, { message: 'Token vencido o ausente' }]
    },
}

// Axios llama a esta funcion en lugar de hacer la peticion real
export function mockAdapter(config) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const manejador = manejadores[ruta(config)]
            const [status, data] = manejador ? manejador(config) : [404, { message: 'Ruta no encontrada' }]
            const respuesta = { data, status, statusText: String(status), headers: {}, config, request: {} }
            if (status >= 200 && status < 300) {
                resolve(respuesta)
            } else {
                reject(new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, respuesta))
            }
        }, 150)
    })
}

reiniciarMock()
