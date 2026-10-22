import { SITIOS_SOPORTADOS } from './marketplaces'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MENSAJE_POLITICA = 'Debe aceptar la política de tratamiento de datos'

export function validarNombre(valor) {
    return valor.trim() ? '' : 'El nombre es obligatorio'
}

export function validarEmail(valor) {
    const email = valor.trim()
    if (!email) return 'El email es obligatorio'
    if (!EMAIL_RE.test(email)) return 'Ingresa un email válido'
    return ''
}

export function validarPassword(valor) {
    if (!valor) return 'La contraseña es obligatoria'
    if (valor.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (!/\p{L}/u.test(valor) || !/\d/.test(valor)) return 'La contraseña debe tener letras y números'
    return ''
}

export function validarRegistro({ nombre, email, password, confirmar, aceptaPolitica }) {
    const errores = {
    nombre: validarNombre(nombre),
    email: validarEmail(email),
    password: validarPassword(password),
    confirmar: !confirmar ? 'Confirma tu contraseña' : confirmar !== password ? 'Las contraseñas no coinciden' : '',
    aceptaPolitica: aceptaPolitica ? '' : MENSAJE_POLITICA,
    }
    return quitarVacios(errores)
}

export function validarLogin({ email, password }) {
    return quitarVacios({
    email: validarEmail(email),
    password: password ? '' : 'La contraseña es obligatoria',
    })
}

// Mismas reglas que el backend de SCRUM-33; el SKU repetido lo detecta el servidor
// Con proveedor el costo lo pone su precio; el vendedor solo suma costos extra
export function validarProducto({ nombre, sku, costo, precioVenta, margenObjetivo, costosExtra = '' }, { conProveedor = false } = {}) {
    const margen = Number(margenObjetivo)
    const extra = String(costosExtra).trim()
    return quitarVacios({
    nombre: nombre.trim() ? '' : 'El nombre es obligatorio',
    sku: sku.trim() ? '' : 'El SKU es obligatorio',
    costo: conProveedor || Number(costo) > 0 ? '' : 'El costo debe ser mayor que 0',
    costosExtra: extra === '' || Number(extra) >= 0 ? '' : 'Los costos extra no pueden ser negativos',
    precioVenta: Number(precioVenta) > 0 ? '' : 'El precio de venta debe ser mayor que 0',
    margenObjetivo:
        String(margenObjetivo).trim() !== '' && margen >= 0 && margen <= 100 ? '' : 'El margen objetivo debe estar entre 0 y 100',
    })
}

// SCRUM-38: se rechaza en el navegador lo que el API rechazaría con 400.
// AliExpress es el proveedor; la reventa se vigila en MercadoLibre (productos de catálogo, SCRUM-37)
export const MENSAJE_MARKETPLACE = 'Por ahora solo se vigilan productos de MercadoLibre'
// Mismo texto que el backend (PublicacionUrl.MENSAJE_SOLO_CATALOGO)
export const MENSAJE_SOLO_CATALOGO =
    'En MercadoLibre solo se pueden vigilar productos de catálogo: abre el producto y copia la URL que tiene /p/MCO…'
const CATALOGO_MERCADOLIBRE = /\/p\/MCO\d+/i
export const MENSAJE_ES_PROVEEDOR = 'AliExpress es tu proveedor: aquí se vigilan sitios de reventa'

const esDominio = (host, base) => host === base || host.endsWith(`.${base}`)

function hostDe(valor) {
    try {
        const url = new URL(valor.trim())
        return ['http:', 'https:'].includes(url.protocol) ? url.hostname.toLowerCase() : null
    } catch {
        return null
    }
}

export const esUrlAliExpress = (valor) => {
    const host = hostDe(valor)
    return Boolean(host && esDominio(host, 'aliexpress.com'))
}

export function marketplaceDeUrl(valor) {
    const host = hostDe(valor)
    if (!host) return null
    if (esDominio(host, 'mercadolibre.com.co')) return 'MERCADOLIBRE'
    if (esDominio(host, 'falabella.com.co') || esDominio(host, 'falabella.com')) return 'FALABELLA'
    if (esDominio(host, 'amazon.com')) return 'AMAZON'
    return null
}

export function validarCompetidorUrl(valor) {
    const texto = valor.trim()
    if (!texto) return 'Pega la URL de la publicación'
    try {
        new URL(texto)
    } catch {
        return 'Esa URL no está bien escrita. Cópiala completa, con https://'
    }
    if (esUrlAliExpress(texto)) return MENSAJE_ES_PROVEEDOR
    if (!SITIOS_SOPORTADOS.includes(marketplaceDeUrl(texto))) return MENSAJE_MARKETPLACE
    return CATALOGO_MERCADOLIBRE.test(texto) ? '' : MENSAJE_SOLO_CATALOGO
}

// Búsqueda en el proveedor: palabra clave de 3 a 80 caracteres o una URL de AliExpress
export function validarBusquedaProveedor(valor) {
    const texto = valor.trim()
    if (texto.length < 3) return 'Escribe al menos 3 caracteres o pega la URL de AliExpress'
    if (/^https?:\/\//i.test(texto)) return esUrlAliExpress(texto) ? '' : 'Solo se buscan proveedores en AliExpress'
    return texto.length > 80 ? 'Usa máximo 80 caracteres' : ''
}

// Dónde se compara la reventa al crear el producto
export function validarReventa({ palabraClave, marketplaces }) {
    const largo = palabraClave.trim().length
    return quitarVacios({
    palabraClave: largo < 3 ? 'Escribe al menos 3 caracteres' : largo > 80 ? 'Usa máximo 80 caracteres' : '',
    marketplaces: marketplaces.length && marketplaces.every((m) => SITIOS_SOPORTADOS.includes(m)) ? '' : 'Elige al menos un sitio donde comparar',
    })
}

export function validarPalabraClave({ valor, marketplace, topN }) {
    const largo = valor.trim().length
    const n = Number(topN)
    return quitarVacios({
    valor: largo < 3 ? 'Escribe al menos 3 caracteres' : largo > 80 ? 'Usa máximo 80 caracteres' : '',
    marketplace: !marketplace ? 'Elige el marketplace' : SITIOS_SOPORTADOS.includes(marketplace) ? '' : MENSAJE_MARKETPLACE,
    topN: Number.isInteger(n) && n >= 1 && n <= 10 ? '' : 'El Top N debe estar entre 1 y 10',
    })
}

function quitarVacios(errores) {
    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje))
}
