/**
 * Motor de Productos Equivalentes
 *
 * Identifica si las publicaciones vigiladas son realmente el mismo producto
 * usando reglas por marca, modelo y unidades, marca precios atípicos como
 * "sospechosos", y permite al usuario excluir publicaciones manualmente.
 *
 * Las exclusiones se persisten en localStorage para alimentar futuras reglas.
 */

// ─── Normalización ───

/** Normaliza un texto para comparación: sin tildes, minúsculas, sin espacios extra */
export function normalizar(texto) {
    if (!texto) return ''
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Extrae tokens clave de un título de publicación:
 * marca, modelo, capacidad/unidades, color
 */
export function extraerTokens(titulo) {
    const bruto = (titulo || '').toLowerCase()
    const norm = normalizar(titulo)

    // Patrones de capacidad / unidad
    const capacidades = []
    const reCapacidad = /(\d+)\s*(gb|tb|ml|l|kg|g|oz|mg|unidades?|piezas?|pack|und)/gi
    let match
    while ((match = reCapacidad.exec(norm)) !== null) {
        capacidades.push(`${match[1]}${match[2].replace(/s$/, '')}`)
    }

    // Patrones de RAM o almacenamiento tipo "8/256" — se buscan en el texto original
    // porque la normalización reemplaza "/" con espacio
    const reFraccion = /(\d+)\s*\/\s*(\d+)\s*(gb|tb)?/gi
    while ((match = reFraccion.exec(bruto)) !== null) {
        capacidades.push(`${match[1]}/${match[2]}${match[3] || ''}`)
    }

    const tokens = norm.split(/\s+/).filter((t) => t.length > 1)

    return { tokens, capacidades, original: norm }
}

// ─── Puntuación de equivalencia ───

/**
 * Calcula un puntaje de equivalencia (0–100) entre dos publicaciones.
 *
 * Reglas:
 * - Coincidencia en marca (primer token significativo): +30 pts
 * - Coincidencia en modelo (2.º y 3.º token): +30 pts
 * - Coincidencia en capacidad/unidades: +20 pts
 * - Coincidencia general de tokens (Jaccard): +20 pts × coeficiente
 */
export function puntajeEquivalencia(tituloA, tituloB) {
    const a = extraerTokens(tituloA)
    const b = extraerTokens(tituloB)

    if (!a.tokens.length || !b.tokens.length) return 0

    let puntaje = 0

    // 1. Marca: primer token significativo
    if (a.tokens[0] === b.tokens[0]) {
        puntaje += 30
    }

    // 2. Modelo: coincidencia en los primeros 3 tokens (sin contar stopwords)
    const stopwords = new Set(['de', 'con', 'para', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'a'])
    const modeloA = a.tokens.slice(0, 5).filter((t) => !stopwords.has(t))
    const modeloB = b.tokens.slice(0, 5).filter((t) => !stopwords.has(t))
    const modeloComun = modeloA.filter((t) => modeloB.includes(t)).length
    const modeloMax = Math.max(modeloA.length, modeloB.length, 1)
    puntaje += Math.round((modeloComun / modeloMax) * 30)

    // 3. Capacidad/unidades
    if (a.capacidades.length > 0 || b.capacidades.length > 0) {
        const capA = new Set(a.capacidades)
        const capB = new Set(b.capacidades)
        const capComun = [...capA].filter((c) => capB.has(c)).length
        const capTotal = new Set([...capA, ...capB]).size
        if (capTotal > 0) {
            puntaje += Math.round((capComun / capTotal) * 20)
        }
        // Penalización: si tienen capacidades DISTINTAS, es probable que no sea el mismo
        if (capComun === 0 && capA.size > 0 && capB.size > 0) {
            puntaje -= 15
        }
    }

    // 4. Jaccard general
    const setA = new Set(a.tokens)
    const setB = new Set(b.tokens)
    const interseccion = [...setA].filter((t) => setB.has(t)).length
    const union = new Set([...setA, ...setB]).size
    puntaje += Math.round((interseccion / union) * 20)

    return Math.max(0, Math.min(100, puntaje))
}

// ─── Detección de precios sospechosos (outliers IQR) ───

/**
 * Marca publicaciones cuyos precios están fuera del rango intercuartil (IQR × 1.5).
 * Devuelve un Set con los IDs de publicaciones sospechosas.
 */
export function detectarPreciosSospechosos(publicaciones) {
    const conPrecio = publicaciones.filter((p) => p && Number(p.precio) > 0 && p.disponible !== false)
    const sospechosos = new Set()

    if (conPrecio.length < 3) return sospechosos

    const precios = conPrecio.map((p) => Number(p.precio)).sort((a, b) => a - b)

    const q1Idx = Math.floor(precios.length * 0.25)
    const q3Idx = Math.floor(precios.length * 0.75)
    const q1 = precios[q1Idx]
    const q3 = precios[q3Idx]
    const iqr = q3 - q1

    const limiteInferior = q1 - 1.5 * iqr
    const limiteSuperior = q3 + 1.5 * iqr

    conPrecio.forEach((p) => {
        const precio = Number(p.precio)
        if (precio < limiteInferior || precio > limiteSuperior) {
            sospechosos.add(p.idPublicacion)
        }
    })

    return sospechosos
}

/**
 * Clasifica el motivo de sospecha de un precio
 */
export function motivoSospecha(precio, publicaciones) {
    const conPrecio = publicaciones.filter((p) => p && Number(p.precio) > 0 && p.disponible !== false)
    if (conPrecio.length < 3) return null

    const precios = conPrecio.map((p) => Number(p.precio)).sort((a, b) => a - b)
    const mediana = precios[Math.floor(precios.length / 2)]
    const porcentaje = Math.abs(Math.round(((precio - mediana) / mediana) * 100))

    if (precio < mediana) {
        return { tipo: 'muy-bajo', mensaje: `${porcentaje}% por debajo de la mediana`, icono: '↓' }
    }
    return { tipo: 'muy-alto', mensaje: `${porcentaje}% por encima de la mediana`, icono: '↑' }
}

// ─── Exclusiones persistentes ───

const STORAGE_KEY = 'trendly_exclusiones'

/** Lee las exclusiones guardadas para un producto */
export function leerExclusiones(productoId) {
    try {
        const datos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        return datos[productoId] || []
    } catch {
        return []
    }
}

/** Agrega una exclusión y la guarda */
export function agregarExclusion(productoId, publicacion) {
    const todas = leerTodasExclusiones()
    if (!todas[productoId]) todas[productoId] = []

    // Evitar duplicados
    if (todas[productoId].some((e) => e.idPublicacion === publicacion.idPublicacion)) return

    todas[productoId].push({
        idPublicacion: publicacion.idPublicacion,
        vendedor: publicacion.vendedor || '',
        titulo: publicacion.titulo || '',
        precio: publicacion.precio,
        fecha: new Date().toISOString(),
    })

    localStorage.setItem(STORAGE_KEY, JSON.stringify(todas))
}

/** Quita una exclusión */
export function quitarExclusion(productoId, idPublicacion) {
    const todas = leerTodasExclusiones()
    if (!todas[productoId]) return
    todas[productoId] = todas[productoId].filter((e) => e.idPublicacion !== idPublicacion)
    if (todas[productoId].length === 0) delete todas[productoId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todas))
}

function leerTodasExclusiones() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch {
        return {}
    }
}

// ─── Análisis completo ───

/**
 * Analiza un conjunto de publicaciones y devuelve un diagnóstico de equivalencia.
 *
 * @param {Object} params
 * @param {string} params.nombreProducto - Nombre del producto del usuario
 * @param {Array} params.publicaciones - Publicaciones vigiladas
 * @param {string|number} params.productoId - ID del producto
 * @returns {{ equivalentes, sospechosas, excluidas, resumen }}
 */
export function analizarEquivalencias({ nombreProducto, publicaciones, productoId }) {
    const excluidas = new Set(leerExclusiones(productoId).map((e) => e.idPublicacion))
    const activas = publicaciones.filter((p) => p && !excluidas.has(p.idPublicacion))

    // Puntajes de equivalencia con el nombre del producto propio
    const conPuntaje = activas.map((pub) => ({
        ...pub,
        puntajeEquivalencia: puntajeEquivalencia(nombreProducto, pub.vendedor || pub.titulo || ''),
    }))

    // Clasificación
    const equivalentes = conPuntaje.filter((p) => p.puntajeEquivalencia >= 40)
    const noEquivalentes = conPuntaje.filter((p) => p.puntajeEquivalencia < 40)

    // Precios sospechosos (solo entre las activas)
    const sospechosos = detectarPreciosSospechosos(activas)

    // Resumen
    const total = publicaciones.length
    const totalExcluidas = excluidas.size
    const totalSospechosas = sospechosos.size
    const totalEquivalentes = equivalentes.length
    const confianza = total > 0 ? Math.round(((totalEquivalentes + totalExcluidas) / total) * 100) : 100

    return {
        equivalentes,
        noEquivalentes,
        sospechosos,
        excluidas: leerExclusiones(productoId),
        resumen: {
            total,
            totalEquivalentes,
            totalExcluidas,
            totalSospechosas,
            confianza,
        },
    }
}
