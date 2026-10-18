import { calcularMargen, formatearPesos, formatearPorcentaje, precioMinimo } from '@features/productos/formato'
import { analizarHistorialCompetidor, calcularPosicion } from './alertasAccionables'

/**
 * Simula qué ocurre con el posicionamiento y la competitividad si el usuario
 * ajusta su margen objetivo a un porcentaje específico.
 */
export function calcularSimulacionMargen(producto, competidores = [], margenDeseado = 25) {
    const nuevoMargen = Number(margenDeseado)
    const precioRequerido = precioMinimo(producto.costo, nuevoMargen)

    const disponibles = competidores.filter((c) => c.disponible !== false)
    const precios = disponibles.map((c) => c.precio)

    const posActual = calcularPosicion(producto.precioVenta, precios).posicion
    const posNueva = calcularPosicion(precioRequerido, precios)
    const posicionNueva = posNueva.posicion
    const masBaratos = posNueva.masBaratos
    const total = posNueva.total

    // Diferencia: si antes eras 3.° y ahora eres 1.°, cambioPosicion = +2 (subiste 2 puestos)
    const cambioPosicion = posActual - posicionNueva

    const diffPrecio = precioRequerido - producto.precioVenta

    let textoImpacto
    if (cambioPosicion > 0) {
        textoImpacto = `Subirías ${cambioPosicion} ${cambioPosicion === 1 ? 'puesto' : 'puestos'} en el ranking (del ${posActual}.º al ${posicionNueva}.º).`
    } else if (cambioPosicion < 0) {
        textoImpacto = `Bajarías ${Math.abs(cambioPosicion)} ${Math.abs(cambioPosicion) === 1 ? 'puesto' : 'puestos'} (del ${posActual}.º al ${posicionNueva}.º).`
    } else {
        textoImpacto = `Mantendrías tu posición actual (${posicionNueva}.º de ${total}).`
    }

    const texto = `Para fijar un margen del ${nuevoMargen}%, tu precio de venta debe ser ${formatearPesos(precioRequerido)} (${
        diffPrecio >= 0 ? `+${formatearPesos(diffPrecio)}` : formatearPesos(diffPrecio)
    }). ${textoImpacto} ${masBaratos === 0 ? 'Serías la opción más económica del mercado.' : `${masBaratos} competidores venderían más barato que tú.`}`

    return {
        nuevoMargen,
        precioRequerido,
        posicionNueva,
        posicionAnterior: posActual,
        cambioPosicion,
        total,
        masBaratos,
        diffPrecio,
        texto,
    }
}

/**
 * Diagnóstico exacto con datos reales de por qué varió la rentabilidad del producto.
 */
export function analizarPorQueBajoRentabilidad(producto) {
    const prov = producto.proveedor
    const costoSubio = Boolean(prov && prov.precioAnteriorUsd && prov.precioUsd > prov.precioAnteriorUsd)
    const bajoObjetivo = producto.margenActual < producto.margenObjetivo
    const precioParaObjetivo = precioMinimo(producto.costo, producto.margenObjetivo)

    let explicacion

    if (costoSubio) {
        const subidaUsd = prov.precioUsd - prov.precioAnteriorUsd
        const pctSubida = Math.round((subidaUsd / prov.precioAnteriorUsd) * 100)
        explicacion = `El costo de tu proveedor en ${prov.tienda || 'AliExpress'} subió de US$${prov.precioAnteriorUsd} a US$${prov.precioUsd} (+${pctSubida}%). Al aumentar el costo base a ${formatearPesos(producto.costo)}, tu margen se redujo directamente.`
    } else if (bajoObjetivo) {
        const gap = Math.round((producto.margenObjetivo - producto.margenActual) * 10) / 10
        explicacion = `Tu margen actual (${formatearPorcentaje(producto.margenActual)}) está ${gap} puntos por debajo de tu objetivo (${formatearPorcentaje(producto.margenObjetivo)}). Para restablecerlo sin alterar tus costos, necesitas ajustar tu precio de venta a ${formatearPesos(precioParaObjetivo)}.`
    } else {
        explicacion = `Tu margen actual (${formatearPorcentaje(producto.margenActual)}) cumple satisfactoriamente con tu meta del ${formatearPorcentaje(producto.margenObjetivo)}.`
    }

    return {
        costoSubio,
        bajoObjetivo,
        precioParaObjetivo,
        margenActual: producto.margenActual,
        margenObjetivo: producto.margenObjetivo,
        explicacion,
    }
}

/**
 * Determina el precio mínimo y la viabilidad para colocarse en el podio (Top 3).
 */
export function obtenerPrecioOptimoTop3(producto, competidores = []) {
    const disponibles = competidores.filter((c) => c.disponible !== false)
    const ordenados = disponibles.map((c) => c.precio).sort((a, b) => a - b)

    if (ordenados.length === 0) {
        return {
            viable: true,
            precioSugerido: producto.precioVenta,
            posicionObjetivo: 1,
            margenConEsePrecio: producto.margenActual,
            explicacion: 'No hay ofertas rivales registradas; tu posición 1.º está asegurada.',
        }
    }

    // El 3er precio más barato (o el último si hay menos de 3)
    const indiceTop3 = Math.min(2, ordenados.length - 1)
    const precioReferencia = ordenados[indiceTop3]
    const precioSugerido = Math.max(producto.costo, Math.floor((precioReferencia - 100) / 100) * 100)
    const margenResultante = calcularMargen(producto.costo, precioSugerido)
    const viable = margenResultante !== null && margenResultante >= producto.margenObjetivo

    const explicacion = viable
        ? `Fijando tu precio en ${formatearPesos(precioSugerido)} alcanzas el Top 3 con un margen del ${formatearPorcentaje(margenResultante)} (tu meta es ${formatearPorcentaje(producto.margenObjetivo)}).`
        : `Para entrar al Top 3 deberías bajar a ${formatearPesos(precioSugerido)}, pero tu margen caería al ${formatearPorcentaje(margenResultante)} (por debajo de tu objetivo del ${formatearPorcentaje(producto.margenObjetivo)}). Se recomienda competir por diferenciación o envío rápido.`

    return {
        viable,
        precioSugerido,
        posicionObjetivo: indiceTop3 + 1,
        margenConEsePrecio: margenResultante,
        explicacion,
    }
}

/**
 * Encuentra el competidor con mayor agresividad de precios en el historial.
 */
export function encontrarCompetidorMasAgresivo(competidores = []) {
    const conHistorial = competidores
        .filter((c) => c.historial && c.historial.length > 1)
        .map((c) => {
            const analisis = analizarHistorialCompetidor(c)
            return {
                vendedor: c.vendedor || 'Competidor',
                marketplace: c.marketplace,
                precioActual: c.precio,
                precioAnterior: analisis.precioAnterior,
                cambioPct: analisis.cambioPct,
            }
        })
        .sort((a, b) => a.cambioPct - b.cambioPct)

    return conHistorial[0] || null
}

/**
 * Parser de preguntas con respuestas 100% fundamentadas en datos reales.
 */
export function responderPreguntaAsistente(pregunta = '', producto, competidores = []) {
    const textoNorm = pregunta.toLowerCase()

    // 1. Preguntas sobre margen: "¿Qué pasa si subo el margen al X%?"
    const matchMargen = textoNorm.match(/(\d+)\s*%/)
    if (matchMargen || textoNorm.includes('margen')) {
        const margenDeseado = matchMargen ? parseInt(matchMargen[1], 10) : 25
        const sim = calcularSimulacionMargen(producto, competidores, margenDeseado)
        return {
            tipo: 'SIMULACION_MARGEN',
            titulo: `Simulación de margen al ${margenDeseado}%`,
            texto: sim.texto,
            datos: sim,
            accion: {
                label: `Fijar precio a ${formatearPesos(sim.precioRequerido)}`,
                nuevoPrecio: sim.precioRequerido,
            },
        }
    }

    // 2. Preguntas sobre rentabilidad: "¿Por qué bajó mi rentabilidad?"
    if (textoNorm.includes('rentabilidad') || textoNorm.includes('bajo') || textoNorm.includes('bajó')) {
        const diag = analizarPorQueBajoRentabilidad(producto)
        return {
            tipo: 'ANALISIS_RENTABILIDAD',
            titulo: 'Diagnóstico de rentabilidad',
            texto: diag.explicacion,
            datos: diag,
            accion: diag.bajoObjetivo
                ? {
                      label: `Restablecer a ${formatearPesos(diag.precioParaObjetivo)}`,
                      nuevoPrecio: diag.precioParaObjetivo,
                  }
                : null,
        }
    }

    // 3. Preguntas sobre top 3: "¿Cómo entrar al top 3?"
    if (textoNorm.includes('top 3') || textoNorm.includes('top3') || textoNorm.includes('podio') || textoNorm.includes('posicion')) {
        const top3 = obtenerPrecioOptimoTop3(producto, competidores)
        return {
            tipo: 'OPTIMO_TOP3',
            titulo: 'Estrategia para Top 3 de competidores',
            texto: top3.explicacion,
            datos: top3,
            accion: top3.viable
                ? {
                      label: `Aplicar precio Top 3 (${formatearPesos(top3.precioSugerido)})`,
                      nuevoPrecio: top3.precioSugerido,
                  }
                : null,
        }
    }

    // 4. Preguntas sobre agresividad de competidores
    if (textoNorm.includes('agresivo') || textoNorm.includes('competencia') || textoNorm.includes('rival')) {
        const agresivo = encontrarCompetidorMasAgresivo(competidores)
        if (agresivo) {
            const bajada = Math.abs(agresivo.cambioPct)
            return {
                tipo: 'COMPETIDOR_AGRESIVO',
                titulo: 'Competidor más activo a la baja',
                texto: `${agresivo.vendedor} (${agresivo.marketplace}) ha registrado la baja más pronunciada con un -${bajada}% (de ${formatearPesos(agresivo.precioAnterior)} a ${formatearPesos(agresivo.precioActual)}).`,
                datos: agresivo,
            }
        }
    }

    // Default: simulación rápida al 25%
    const defaultSim = calcularSimulacionMargen(producto, competidores, 25)
    return {
        tipo: 'GENERAL',
        titulo: 'Asistente de Inteligencia Comercial',
        texto: `Tu costo actual es ${formatearPesos(producto.costo)} y tu margen actual es ${formatearPorcentaje(producto.margenActual)}. Pregúntame sobre cambios de margen, cómo recuperar rentabilidad o cómo posicionarte en el Top 3.`,
        datos: defaultSim,
    }
}
