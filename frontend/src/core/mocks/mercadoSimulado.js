// Mercado simulado: hace de scraper (SCRUM-40 y 41) para trabajar sin backend.
// Del lado del proveedor busca ofertas en AliExpress; del lado de la reventa genera
// publicaciones creíbles en MercadoLibre, Falabella y Amazon con 90 días de histórico,
// y mueve precios de vez en cuando para que se vea vivo.

const VENDEDORES = {
    MERCADOLIBRE: ['TecnoShop CO', 'SmartCol', 'RelojesYa', 'MegaTec', 'ElectroHogar', 'La Bodega Digital', 'ImportaYa', 'Mundo Gadget', 'Compra Fácil', 'TodoTec'],
    FALABELLA: ['Falabella', 'Tienda Oficial Xiaomi', 'Linio Express', 'Electro Andina', 'Hogar & Tech'],
    AMAZON: ['Amazon', 'TechDeals US', 'Prime Gadgets', 'BestValue Store'],
}
const TIENDAS_PROVEEDOR = ['Global Gadgets Store', 'Shenzhen Direct', 'TopChoice Official', 'Lucky Mall', 'Orient Tech Store', 'Dream Factory', 'Zhongshan Lights', 'Hangzhou Sport', 'Yiwu Wholesale', 'Mi Ecosystem Store', 'GoodLife Official', 'Sunny Days Shop']
// Precio típico en AliExpress (USD) por tipo de producto, para que las ofertas sean creíbles
const BASE_USD = { smartwatch: 24, reloj: 16, parlante: 19, audifonos: 22, earbuds: 9, camara: 52, tenis: 18, teclado: 15, lampara: 9, morral: 13, gafas: 5, termo: 7, mouse: 6, perfume: 11 }

// Fotos de muestra en /public/mock (solo modo simulado). Se elige por palabras del producto.
const FOTOS = [
    ['smartwatch', ['smartwatch', 'reloj']],
    ['reloj', ['reloj', 'watch']],
    ['parlante', ['parlante', 'bafle', 'altavoz', 'speaker']],
    ['audifonos', ['audífono', 'audifono', 'diadema', 'headphone', 'anc']],
    ['earbuds', ['earbud', 'tws', 'inalámbricos']],
    ['camara', ['cámara', 'camara']],
    ['tenis', ['tenis', 'zapatilla', 'running']],
    ['teclado', ['teclado']],
    ['lampara', ['lámpara', 'lampara', 'led']],
    ['morral', ['morral', 'mochila', 'bolso']],
    ['gafas', ['gafas', 'lentes']],
    ['termo', ['termo', 'botella']],
    ['mouse', ['mouse', 'ratón']],
    ['perfume', ['perfume', 'fragancia']],
]
const TODAS = FOTOS.map(([foto]) => foto)
export const TRM = 4000
const DIA = 86400000

// Número pseudoaleatorio estable a partir de un texto: la misma URL da siempre los mismos datos
function semilla(texto) {
    let h = 2166136261
    for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)
        return ((h ^= h >>> 16) >>> 0) / 4294967296
    }
}

const redondear = (valor, paso = 100) => Math.round(valor / paso) * paso

// Fotos parecidas entre sí: la reventa de un smartwatch no muestra un parlante
const PARECIDAS = { smartwatch: ['reloj'], reloj: ['smartwatch'], audifonos: ['earbuds'], earbuds: ['audifonos'] }

function fotosPara(nombre) {
    const texto = nombre.toLowerCase()
    const encontrada = FOTOS.find(([, palabras]) => palabras.some((p) => texto.includes(p)))
    return encontrada ? [encontrada[0], ...(PARECIDAS[encontrada[0]] ?? [])] : TODAS
}

// 90 días de capturas cada 6 horas (como el job de SCRUM-39), con cambios escalonados como
// se ven los precios reales: quietos y de pronto un salto. A ratos la publicación se queda sin stock
const PASO_CAPTURA = 6 * 3600000
export const DIAS_HISTORICO = 90

function historico(azar, precioFinal, disponibleFinal, ahora) {
    const pasos = (DIAS_HISTORICO * DIA) / PASO_CAPTURA
    // Se arma hacia atrás desde la captura de hoy, para que la última línea no dé un salto
    const puntos = [{ fecha: new Date(ahora).toISOString(), precio: precioFinal, disponible: disponibleFinal }]
    let precio = precioFinal
    let disponible = disponibleFinal
    for (let i = 1; i <= pasos; i++) {
        if (azar() < 0.05) precio = redondear(precio * (1 + (azar() - 0.47) * 0.09))
        disponible = disponible ? azar() > 0.012 : azar() > 0.2
        puntos.push({ fecha: new Date(ahora - i * PASO_CAPTURA).toISOString(), precio, disponible })
    }
    return puntos.reverse()
}

const dominio = (host, base) => host === base || host.endsWith(`.${base}`)

// Sitios de reventa que se pueden vigilar por URL
export function reconocerMarketplace(url) {
    try {
        const host = new URL(url).hostname.toLowerCase()
        if (dominio(host, 'mercadolibre.com.co')) return 'MERCADOLIBRE'
        if (dominio(host, 'falabella.com.co') || dominio(host, 'falabella.com')) return 'FALABELLA'
        if (dominio(host, 'amazon.com')) return 'AMAZON'
    } catch {
        return null
    }
    return null
}

export function esUrlAliExpress(texto) {
    try {
        return dominio(new URL(texto).hostname.toLowerCase(), 'aliexpress.com')
    } catch {
        return false
    }
}

export function identificadorDePublicacion(url, marketplace) {
    if (marketplace === 'MERCADOLIBRE') return url.match(/MCO-?(\d+)/i)?.[0].toUpperCase().replace(/^MCO(\d)/, 'MCO-$1') ?? null
    if (marketplace === 'FALABELLA') return url.match(/product\/(\d+)/)?.[1] ?? null
    if (marketplace === 'AMAZON') return url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1].toUpperCase() ?? null
    return url.match(/item\/(\d+)/)?.[1] ?? null
}

// ─── Proveedor: búsqueda de ofertas en AliExpress ───
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const VARIANTES = ['', ' original', ' 2026', ' con garantía', ' versión global', ' edición mejorada', ' alta calidad', ' nuevo modelo']

function oferta(azar, { id, titulo, n }) {
    const foto = fotosPara(titulo)[0]
    const base = BASE_USD[foto] ?? 14
    const precioUsd = Math.round(base * (0.72 + azar() * 0.7) * 100) / 100
    const envioUsd = azar() < 0.4 ? 0 : Math.round((1.5 + azar() * 4.5) * 100) / 100
    const diasMin = 5 + Math.floor(azar() * 14)
    const ventas = Math.round(Math.exp(2 + azar() * 8))
    return {
        idPublicacion: id,
        url: `https://es.aliexpress.com/item/${id}.html`,
        titulo,
        tienda: TIENDAS_PROVEEDOR[Math.floor(azar() * TIENDAS_PROVEEDOR.length)],
        precioUsd,
        envioUsd,
        diasMin,
        diasMax: diasMin + 3 + Math.floor(azar() * 9),
        calificacion: Math.round((3.5 + azar() * 1.45) * 10) / 10,
        ventas,
        resenas: Math.round(ventas * (0.05 + azar() * 0.3)),
        imagen: `/mock/${foto}.jpg`,
        posicion: n + 1,
    }
}

// Lo que devolvería el scraper al buscar en AliExpress: por palabra clave, las primeras 12
// ofertas; por URL, esa publicación. La misma búsqueda da siempre los mismos resultados.
export function buscarOfertas(consulta) {
    const texto = consulta.trim()
    if (esUrlAliExpress(texto)) {
        const id = identificadorDePublicacion(texto, 'ALIEXPRESS')
        if (!id) return null
        return [oferta(semilla(id), { id, titulo: `Publicación de AliExpress ${id}`, n: 0 })]
    }
    const azar = semilla(texto.toLowerCase())
    return Array.from({ length: 12 }, (_, n) => {
        const id = String(1005006000000 + Math.floor(azar() * 999999999))
        return oferta(azar, { id, titulo: `${capitalizar(texto)}${VARIANTES[n % VARIANTES.length]}`, n })
    })
}

// Precio del proveedor convertido a pesos: producto + envío, con la TRM
export const costoProveedor = (p) => Math.round(((p.precioUsd + p.envioUsd) * TRM) / 100) * 100

// De vez en cuando el proveedor también cambia su precio
export function moverProveedor(proveedor) {
    const cambio = (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.08)
    proveedor.precioAnteriorUsd = proveedor.precioUsd
    proveedor.precioUsd = Math.round(proveedor.precioUsd * (1 + cambio) * 100) / 100
}

// Lo que devolvería el scraper en la primera captura de un monitoreo
export function primeraCaptura(monitoreo, producto, ahora = Date.now()) {
    const azar = semilla(`${monitoreo.valor}|${monitoreo.marketplace}`)
    const fotos = fotosPara(producto.nombre)
    const cuantas = monitoreo.tipo === 'URL' ? 1 : monitoreo.topN
    // Amazon publica en dólares; se convierte con la TRM igual que el proveedor
    const enUsd = monitoreo.marketplace === 'AMAZON'
    const vendedores = VENDEDORES[monitoreo.marketplace] ?? VENDEDORES.MERCADOLIBRE
    const inicio = Math.floor(azar() * vendedores.length)
    const nuevoId = () => {
        if (monitoreo.marketplace === 'FALABELLA') return String(70000000 + Math.floor(azar() * 9999999))
        if (enUsd) return `B0${Math.floor(azar() * 36 ** 8).toString(36).toUpperCase().padStart(8, '0')}`
        return `MCO-${1300000000 + Math.floor(azar() * 99999999)}`
    }

    return Array.from({ length: cuantas }, (_, n) => {
        const factor = (enUsd ? 1.02 : monitoreo.marketplace === 'FALABELLA' ? 0.97 : 0.9) + azar() * 0.22
        const precio = redondear(producto.precioVenta * factor)
        const pub = {
            idPublicacion: monitoreo.idPublicacion && n === 0 ? monitoreo.idPublicacion : nuevoId(),
            titulo: `${producto.nombre}${n % 2 ? ' original' : ''}`,
            vendedor: vendedores[(inicio + n) % vendedores.length],
            posicion: monitoreo.tipo === 'PALABRA_CLAVE' ? n + 1 : null,
            precio,
            precioUsd: enUsd ? Math.round((precio / TRM) * 100) / 100 : null,
            disponible: azar() > 0.18,
            imagen: `/mock/${fotos[(n + 1) % fotos.length]}.jpg`,
        }
        // El histórico usa su propia semilla: así no cambia el resto de la captura
        pub.historial = historico(semilla(`${pub.idPublicacion}|historico`), precio, pub.disponible, ahora)
        return pub
    })
}

// Un movimiento de mercado: una publicación activa cambia de precio
export function moverUnPrecio(monitoreos, ahora = Date.now()) {
    const vivas = monitoreos.filter((m) => m.estado === 'ACTIVO' && m.publicaciones.length > 0)
    if (vivas.length === 0) return
    const monitoreo = vivas[Math.floor(Math.random() * vivas.length)]
    const pub = monitoreo.publicaciones[Math.floor(Math.random() * monitoreo.publicaciones.length)]
    const cambio = (Math.random() < 0.55 ? -1 : 1) * (0.03 + Math.random() * 0.06)
    pub.precioAnterior = pub.precio
    pub.precio = redondear(pub.precio * (1 + cambio))
    if (pub.precioUsd !== null) pub.precioUsd = Math.round((pub.precio / TRM) * 100) / 100
    pub.historial.push({ fecha: new Date(ahora).toISOString(), precio: pub.precio, disponible: pub.disponible })
    monitoreo.ultimaCaptura = new Date(ahora).toISOString()
}
