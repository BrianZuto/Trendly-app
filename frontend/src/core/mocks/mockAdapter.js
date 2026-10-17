// API simulado para trabajar sin backend (VITE_USE_MOCK=true) y para las pruebas
import { AxiosError } from 'axios'

const VIGENCIA_SEGUNDOS = 3600
const PLAN_GRATUITO = { id: 1, nombre: 'Gratuito', maxProductos: 10 }

let usuarios = []
let siguienteId = 1
let productos = []
let siguienteProductoId = 1

export function reiniciarMock() {
    usuarios = []
    siguienteId = 1
    productos = []
    siguienteProductoId = 1
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

// Productos: mismas reglas que el CRUD /api/v1/productos de SCRUM-33
const conMargen = (p) => ({ ...p, margenActual: Math.round(((p.precioVenta - p.costo) / p.precioVenta) * 10000) / 100 })
const deUsuario = (usuario) => productos.filter((p) => p.usuarioId === usuario.id)
const sinDueno = (producto) => {
    const copia = { ...producto }
    delete copia.usuarioId
    return copia
}

function validarProducto({ nombre, sku, costo, precioVenta, margenObjetivo }, usuario, idActual = null) {
    if (!nombre?.trim()) return 'El nombre es obligatorio'
    if (!sku?.trim()) return 'El SKU es obligatorio'
    if (!(Number(costo) > 0)) return 'El costo debe ser mayor que 0'
    if (!(Number(precioVenta) > 0)) return 'El precio de venta debe ser mayor que 0'
    const margen = Number(margenObjetivo)
    if (margenObjetivo === '' || margenObjetivo == null || Number.isNaN(margen) || margen < 0 || margen > 100) {
        return 'El margen objetivo debe estar entre 0 y 100'
    }
    const repetido = deUsuario(usuario).some((p) => p.sku.toLowerCase() === sku.trim().toLowerCase() && p.id !== idActual)
    if (repetido) return 'Ya tienes un producto con ese SKU'
    return ''
}

const limpiarProducto = ({ nombre, sku, costo, precioVenta, margenObjetivo }) => ({
    nombre: nombre.trim(),
    sku: sku.trim(),
    costo: Number(costo),
    precioVenta: Number(precioVenta),
    margenObjetivo: Number(margenObjetivo),
})

export function sembrarProductos(email, lista) {
    const usuario = usuarios.find((u) => u.email === email.toLowerCase())
    lista.forEach((p) => productos.push({ id: siguienteProductoId++, usuarioId: usuario.id, ...limpiarProducto(p) }))
}

function conProducto(config, id, accion) {
    const usuario = usuarioDelToken(config)
    if (!usuario) return [401, { message: 'Token vencido o ausente' }]
    // Un producto ajeno responde igual que uno que no existe
    const producto = productos.find((p) => p.id === Number(id) && p.usuarioId === usuario.id)
    if (!producto) return [404, { message: 'Producto no encontrado' }]
    return accion(producto, usuario)
}

const manejadoresConId = [
    [/^GET \/productos\/(\d+)$/, (config, id) => conProducto(config, id, (p) => [200, conMargen(sinDueno(p))])],
    [/^PUT \/productos\/(\d+)$/, (config, id) => conProducto(config, id, (p, usuario) => {
        const cuerpo = leerCuerpo(config)
        const error = validarProducto(cuerpo, usuario, p.id)
        if (error) return [400, { message: error }]
        Object.assign(p, limpiarProducto(cuerpo))
        return [200, conMargen(sinDueno(p))]
    })],
    [/^DELETE \/productos\/(\d+)$/, (config, id) => conProducto(config, id, (p) => {
        productos = productos.filter((otro) => otro !== p)
        return [204, null]
    })],
]

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

    'GET /productos': (config) => {
        const usuario = usuarioDelToken(config)
        if (!usuario) return [401, { message: 'Token vencido o ausente' }]
        return [200, deUsuario(usuario).map((p) => conMargen(sinDueno(p)))]
    },

    'POST /productos': (config) => {
        const usuario = usuarioDelToken(config)
        if (!usuario) return [401, { message: 'Token vencido o ausente' }]
        if (deUsuario(usuario).length >= usuario.plan.maxProductos) return [422, { message: 'Alcanzó el límite de su plan' }]
        const cuerpo = leerCuerpo(config)
        const error = validarProducto(cuerpo, usuario)
        if (error) return [400, { message: error }]
        const producto = { id: siguienteProductoId++, usuarioId: usuario.id, ...limpiarProducto(cuerpo) }
        productos.push(producto)
        return [201, conMargen(sinDueno(producto))]
    },
}

function buscarManejador(config) {
    const clave = ruta(config)
    if (manejadores[clave]) return (c) => manejadores[clave](c)
    for (const [patron, manejador] of manejadoresConId) {
        const coincide = clave.match(patron)
        if (coincide) return (c) => manejador(c, coincide[1])
    }
    return null
}

// Axios llama a esta funcion en lugar de hacer la peticion real
export function mockAdapter(config) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const manejador = buscarManejador(config)
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
