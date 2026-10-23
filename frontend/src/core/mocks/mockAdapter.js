// API simulado para trabajar sin backend (VITE_USE_MOCK=true) y para las pruebas
import { AxiosError } from 'axios'
import {
    buscarOfertas,
    costoProveedor,
    esUrlAliExpress,
    identificadorDePublicacion,
    moverProveedor,
    moverUnPrecio,
    primeraCaptura,
    reconocerMarketplace,
    TRM,
} from './mercadoSimulado'
import { SITIOS_SOPORTADOS } from '@shared/utils/marketplaces'
import { MENSAJE_SOLO_CATALOGO } from '@shared/utils/validaciones'

const VIGENCIA_SEGUNDOS = 3600
const PLAN_GRATUITO = { id: 1, nombre: 'Gratuito', maxProductos: 10 }

let usuarios = []
let siguienteId = 1
let productos = []
let siguienteProductoId = 1
let monitoreos = []
let siguienteMonitoreoId = 1
let ultimoMovimiento = Date.now()
// Ofertas del proveedor que ya devolvió una búsqueda: crear un producto exige elegir una de ellas
let ofertasVistas = new Map()

// En la app simulada el scraper responde en segundos y el mercado se mueve solo;
// en las pruebas todo es inmediato y quieto
const EN_PRUEBAS = import.meta.env.MODE === 'test'
const RETRASO_PRIMERA_CAPTURA = EN_PRUEBAS ? 0 : 2800
const CADA_CUANTO_SE_MUEVE = EN_PRUEBAS ? Infinity : 16000
const MAX_MONITOREOS_POR_PRODUCTO = 10

export function reiniciarMock() {
    usuarios = []
    siguienteId = 1
    productos = []
    siguienteProductoId = 1
    monitoreos = []
    siguienteMonitoreoId = 1
    ofertasVistas = new Map()
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

// Productos: mismas reglas que el CRUD /api/v1/productos de SCRUM-33.
// Con proveedor, el costo es su precio + envío en pesos (TRM) más los costos extra del vendedor
const costoDe = (p) => (p.proveedor ? costoProveedor(p.proveedor) + p.costosExtra : p.costo)
const conMargen = (p) => {
    const costo = costoDe(p)
    return {
        ...p,
        proveedor: p.proveedor && { ...p.proveedor, costo: costoProveedor(p.proveedor) },
        costo,
        margenActual: Math.round(((p.precioVenta - costo) / p.precioVenta) * 10000) / 100,
    }
}
const deUsuario = (usuario) => productos.filter((p) => p.usuarioId === usuario.id)
const sinDueno = (producto) => {
    const copia = { ...producto }
    delete copia.usuarioId
    return copia
}

function validarProducto({ nombre, sku, costo, precioVenta, margenObjetivo, costosExtra = 0 }, usuario, idActual = null, conProveedor = false) {
    if (!nombre?.trim()) return 'El nombre es obligatorio'
    if (!sku?.trim()) return 'El SKU es obligatorio'
    if (!conProveedor && !(Number(costo) > 0)) return 'El costo debe ser mayor que 0'
    if (!(Number(costosExtra) >= 0)) return 'Los costos extra no pueden ser negativos'
    if (!(Number(precioVenta) > 0)) return 'El precio de venta debe ser mayor que 0'
    const margen = Number(margenObjetivo)
    if (margenObjetivo === '' || margenObjetivo == null || Number.isNaN(margen) || margen < 0 || margen > 100) {
        return 'El margen objetivo debe estar entre 0 y 100'
    }
    const repetido = deUsuario(usuario).some((p) => p.sku.toLowerCase() === sku.trim().toLowerCase() && p.id !== idActual)
    if (repetido) return 'Ya tienes un producto con ese SKU'
    return ''
}

const limpiarProducto = ({ nombre, sku, costo, precioVenta, margenObjetivo, costosExtra = 0 }) => ({
    nombre: nombre.trim(),
    sku: sku.trim(),
    costo: Number(costo) || 0,
    costosExtra: Number(costosExtra) || 0,
    precioVenta: Number(precioVenta),
    margenObjetivo: Number(margenObjetivo),
})

export function sembrarProductos(email, lista) {
    const usuario = usuarios.find((u) => u.email === email.toLowerCase())
    lista.forEach((p) => productos.push({ id: siguienteProductoId++, usuarioId: usuario.id, proveedor: null, imagen: null, ...limpiarProducto(p) }))
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
    [/^GET \/productos\/(\d+)$/, (config, id) => conProducto(config, id, (p) => {
        avanzarMercado(p)
        return [200, conResumen(conMargen(sinDueno(p)))]
    })],
    [/^PUT \/productos\/(\d+)$/, (config, id) => conProducto(config, id, (p, usuario) => {
        const cuerpo = leerCuerpo(config)
        const error = validarProducto(cuerpo, usuario, p.id, Boolean(p.proveedor))
        if (error) return [400, { message: error }]
        Object.assign(p, limpiarProducto({ ...cuerpo, costo: p.proveedor ? 0 : cuerpo.costo }))
        return [200, conResumen(conMargen(sinDueno(p)))]
    })],
    [/^DELETE \/productos\/(\d+)$/, (config, id) => conProducto(config, id, (p) => {
        productos = productos.filter((otro) => otro !== p)
        monitoreos = monitoreos.filter((m) => m.productoId !== p.id)
        return [204, null]
    })],
    // Propuesta para el backend: la foto del producto se elige entre las de sus competidores
    [/^PUT \/productos\/(\d+)\/imagen$/, (config, id) => conProducto(config, id, (p) => {
        const { imagen } = leerCuerpo(config)
        const permitidas = [p.proveedor?.imagen, ...monitoreos.filter((m) => m.productoId === p.id).flatMap((m) => m.publicaciones.map((x) => x.imagen))]
        if (imagen !== null && !permitidas.includes(imagen)) return [400, { message: 'La foto debe venir de una publicación vigilada' }]
        p.imagen = imagen
        return [200, conResumen(conMargen(sinDueno(p)))]
    })],
    [/^GET \/productos\/(\d+)\/monitoreos$/, (config, id) => conProducto(config, id, (p) => {
        avanzarMercado(p)
        return [200, monitoreos.filter((m) => m.productoId === p.id).map(publicoMonitoreo)]
    })],
    [/^POST \/productos\/(\d+)\/monitoreos$/, (config, id) => conProducto(config, id, (p) => crearMonitoreo(p, leerCuerpo(config)))],
    [/^PATCH \/monitoreos\/(\d+)$/, (config, id) => conMonitoreo(config, id, (m) => {
        const { estado } = leerCuerpo(config)
        if (!['ACTIVO', 'PAUSADO'].includes(estado)) return [400, { message: 'Estado no válido' }]
        m.estado = estado
        if (estado === 'ACTIVO') m.proximaEjecucion = new Date().toISOString()
        return [200, publicoMonitoreo(m)]
    })],
    [/^GET \/monitoreos\/(\d+)\/historico$/, (config, id) => conMonitoreo(config, id, (m) => historicoDe(m, config.params ?? {}))],
    [/^DELETE \/monitoreos\/(\d+)$/, (config, id) => conMonitoreo(config, id, (m) => {
        monitoreos = monitoreos.filter((otro) => otro !== m)
        return [204, null]
    })],
]

// ─── Monitoreos de competidores: SCRUM-36 (por URL) y SCRUM-37 (por palabra clave) ───
// La lista trae solo los últimos 30 días de cada publicación; el histórico completo
// se pide aparte con GET /monitoreos/:id/historico (SCRUM-42)
const DIAS_EN_LISTA = 30
const publicoMonitoreo = (m) => {
    const desde = Date.now() - DIAS_EN_LISTA * 86400000
    const copia = structuredClone(m)
    copia.publicaciones.forEach((p) => (p.historial = p.historial.filter((h) => Date.parse(h.fecha) >= desde)))
    return copia
}

// SCRUM-42: un punto por captura, en orden de fecha. Amazon guarda el precio en dólares y su
// equivalente en pesos con la TRM; el tablero grafica precioCop
function historicoDe(monitoreo, { desde, hasta }) {
    const inicio = desde ? Date.parse(desde) : -Infinity
    const fin = hasta ? Date.parse(hasta) : Infinity
    if (Number.isNaN(inicio) || Number.isNaN(fin) || inicio > fin) return [400, { message: 'El rango de fechas no es válido' }]
    const enUsd = monitoreo.marketplace === 'AMAZON'
    const puntos = monitoreo.publicaciones.flatMap((pub) =>
        pub.historial
            .filter((h) => {
                const t = Date.parse(h.fecha)
                return t >= inicio && t <= fin
            })
            .map((h) => ({
                fechaCaptura: h.fecha,
                idPublicacion: pub.idPublicacion,
                vendedor: pub.vendedor,
                precio: enUsd ? Math.round((h.precio / TRM) * 100) / 100 : h.precio,
                moneda: enUsd ? 'USD' : 'COP',
                precioCop: h.precio,
                disponible: h.disponible ?? true,
                fuente: monitoreo.marketplace,
            })),
    )
    return [200, puntos.sort((a, b) => Date.parse(a.fechaCaptura) - Date.parse(b.fechaCaptura))]
}

function conMonitoreo(config, id, accion) {
    const usuario = usuarioDelToken(config)
    if (!usuario) return [401, { message: 'Token vencido o ausente' }]
    const monitoreo = monitoreos.find((m) => m.id === Number(id))
    const producto = monitoreo && productos.find((p) => p.id === monitoreo.productoId && p.usuarioId === usuario.id)
    if (!producto) return [404, { message: 'Monitoreo no encontrado' }]
    return accion(monitoreo, producto)
}

function crearMonitoreo(producto, { tipo, valor, marketplace, topN = 5, frecuenciaHoras = 6 }) {
    const delProducto = monitoreos.filter((m) => m.productoId === producto.id)
    if (delProducto.length >= MAX_MONITOREOS_POR_PRODUCTO) return [422, { message: 'Alcanzó el límite de competidores para este producto' }]
    if (frecuenciaHoras !== 6) return [400, { message: 'Solo el plan Pro puede cambiar la frecuencia' }]
    const ahora = new Date().toISOString()
    let nuevo
    if (tipo === 'URL') {
        if (esUrlAliExpress(valor ?? '')) return [400, { message: 'AliExpress es tu proveedor: aquí se vigilan sitios de reventa' }]
        const encontrado = reconocerMarketplace(valor ?? '')
        if (!SITIOS_SOPORTADOS.includes(encontrado)) return [400, { message: 'Marketplace no soportado' }]
        if (!/\/p\/MCO\d+/i.test(valor)) return [400, { message: MENSAJE_SOLO_CATALOGO }]
        const idPublicacion = identificadorDePublicacion(valor, encontrado)
        if (!idPublicacion) return [400, { message: 'No encontramos el identificador de la publicación en la URL' }]
        if (delProducto.some((m) => m.idPublicacion === idPublicacion)) return [409, { message: 'Ya vigilas esta publicación en este producto' }]
        nuevo = { tipo, valor: valor.trim(), marketplace: encontrado, idPublicacion, topN: null }
    } else if (tipo === 'PALABRA_CLAVE') {
        const palabra = (valor ?? '').trim()
        if (palabra.length < 3 || palabra.length > 80) return [400, { message: 'La palabra clave debe tener entre 3 y 80 caracteres' }]
        if (!marketplace) return [400, { message: 'Elige el marketplace donde buscar la palabra clave' }]
        if (!SITIOS_SOPORTADOS.includes(marketplace)) return [400, { message: 'Marketplace no soportado' }]
        const n = Number(topN)
        if (!Number.isInteger(n) || n < 1 || n > 10) return [400, { message: 'El Top N debe estar entre 1 y 10' }]
        const repetido = delProducto.some((m) => m.tipo === tipo && m.marketplace === marketplace && m.valor.toLowerCase() === palabra.toLowerCase())
        if (repetido) return [409, { message: 'Ya vigilas esta palabra clave en este producto' }]
        nuevo = { tipo, valor: palabra, marketplace, idPublicacion: null, topN: n }
    } else {
        return [400, { message: 'Tipo de monitoreo no válido' }]
    }
    const monitoreo = {
        id: siguienteMonitoreoId++,
        productoId: producto.id,
        ...nuevo,
        frecuenciaHoras: 6,
        estado: 'ACTIVO',
        creadoEn: ahora,
        proximaEjecucion: ahora,
        ultimaCaptura: null,
        publicaciones: [],
    }
    monitoreos.push(monitoreo)
    if (RETRASO_PRIMERA_CAPTURA === 0) capturar(monitoreo, producto)
    return [201, publicoMonitoreo(monitoreo)]
}

function capturar(monitoreo, producto) {
    const ahora = Date.now()
    monitoreo.publicaciones = primeraCaptura(monitoreo, producto, ahora)
    monitoreo.ultimaCaptura = new Date(ahora).toISOString()
    monitoreo.proximaEjecucion = new Date(ahora + monitoreo.frecuenciaHoras * 3600000).toISOString()
    // Sin foto todavía: se usa la de la primera publicación capturada (el vendedor puede cambiarla)
    if (!producto.imagen) producto.imagen = monitoreo.publicaciones[0]?.imagen ?? null
}

// El "job" simulado corre cuando alguien consulta: hace las primeras capturas pendientes
// y, cada tanto, mueve un precio para que el tablero tenga vida
function avanzarMercado(producto) {
    const ahora = Date.now()
    monitoreos
        .filter((m) => m.productoId === producto.id && m.estado === 'ACTIVO' && !m.ultimaCaptura)
        .filter((m) => ahora - Date.parse(m.creadoEn) >= RETRASO_PRIMERA_CAPTURA)
        .forEach((m) => capturar(m, producto))
    if (ahora - ultimoMovimiento >= CADA_CUANTO_SE_MUEVE) {
        ultimoMovimiento = ahora
        // A veces se mueve el proveedor (cambia tu costo); casi siempre, la reventa
        if (producto.proveedor && Math.random() < 0.25) moverProveedor(producto.proveedor)
        else moverUnPrecio(monitoreos.filter((m) => m.productoId === producto.id), ahora)
    }
}

// Propuesta para el backend: la lista de productos trae un resumen de su competencia
function conResumen(producto) {
    const pubs = monitoreos
        .filter((m) => m.productoId === producto.id && m.estado !== 'PAUSADO')
        .flatMap((m) => m.publicaciones.filter((x) => x.disponible).map((x) => ({ ...x, marketplace: m.marketplace })))
    const minimo = pubs.length ? pubs.reduce((a, b) => (b.precio < a.precio ? b : a)) : null
    return {
        ...producto,
        imagen: producto.imagen ?? null,
        competencia: {
            monitoreos: monitoreos.filter((m) => m.productoId === producto.id).length,
            publicaciones: pubs.length,
            marketplaces: [...new Set(monitoreos.filter((m) => m.productoId === producto.id).map((m) => m.marketplace))],
            minimo: minimo && { precio: minimo.precio, vendedor: minimo.vendedor, marketplace: minimo.marketplace },
        },
    }
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

    'GET /productos': (config) => {
        const usuario = usuarioDelToken(config)
        if (!usuario) return [401, { message: 'Token vencido o ausente' }]
        deUsuario(usuario).forEach(avanzarMercado)
        return [200, deUsuario(usuario).map((p) => conResumen(conMargen(sinDueno(p))))]
    },

    'POST /productos': (config) => {
        const usuario = usuarioDelToken(config)
        if (!usuario) return [401, { message: 'Token vencido o ausente' }]
        if (deUsuario(usuario).length >= usuario.plan.maxProductos) return [422, { message: 'Alcanzó el límite de su plan' }]
        const cuerpo = leerCuerpo(config)
        const elegida = cuerpo.proveedor ? ofertasVistas.get(cuerpo.proveedor.idPublicacion) : null
        if (cuerpo.proveedor && !elegida) return [400, { message: 'No encontramos esa oferta del proveedor. Búscala de nuevo' }]
        const error = validarProducto(cuerpo, usuario, null, Boolean(elegida))
        if (error) return [400, { message: error }]
        const reventa = cuerpo.reventa
        if (reventa) {
            const largo = (reventa.palabraClave ?? '').trim().length
            if (largo < 3 || largo > 80) return [400, { message: 'La palabra clave debe tener entre 3 y 80 caracteres' }]
            if (!reventa.marketplaces?.length || reventa.marketplaces.some((m) => !SITIOS_SOPORTADOS.includes(m))) {
                return [400, { message: 'Elige al menos un sitio de reventa' }]
            }
        }
        const proveedor = elegida && { marketplace: 'ALIEXPRESS', ...structuredClone(elegida), elegidoEn: new Date().toISOString() }
        const producto = {
            id: siguienteProductoId++,
            usuarioId: usuario.id,
            ...limpiarProducto({ ...cuerpo, costo: elegida ? 0 : cuerpo.costo }),
            proveedor: proveedor || null,
            imagen: proveedor?.imagen ?? null,
        }
        productos.push(producto)
        // Elegido el proveedor, Trendly programa solo la vigilancia de la reventa en cada sitio
        reventa?.marketplaces.forEach((marketplace) =>
            crearMonitoreo(producto, { tipo: 'PALABRA_CLAVE', valor: reventa.palabraClave, marketplace, topN: reventa.topN ?? 5 }),
        )
        return [201, conResumen(conMargen(sinDueno(producto)))]
    },

    // Propuesta: búsqueda en el proveedor (AliExpress) por palabra clave o URL
    'GET /proveedores/ofertas': (config) => {
        const usuario = usuarioDelToken(config)
        if (!usuario) return [401, { message: 'Token vencido o ausente' }]
        const consulta = String(config.params?.q ?? '').trim()
        if (consulta.length < 3) return [400, { message: 'Escribe al menos 3 caracteres o pega la URL de AliExpress' }]
        if (/^https?:\/\//i.test(consulta) && !esUrlAliExpress(consulta)) return [400, { message: 'Solo se buscan proveedores en AliExpress' }]
        const ofertas = buscarOfertas(consulta)
        if (!ofertas) return [400, { message: 'No encontramos el identificador de la publicación en la URL' }]
        ofertas.forEach((o) => ofertasVistas.set(o.idPublicacion, o))
        return [200, structuredClone(ofertas)]
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
