import { calcularMargen, formatearPesos, formatearPorcentaje } from '@features/productos/formato'

/**
 * Calcula la variación de precio más representativa del competidor a partir de su historial.
 */
export function analizarHistorialCompetidor(pub) {
    const historial = pub.historial || []
    const precioActual = pub.precio

    if (!historial.length || historial.length < 2) {
        return {
            precioAnterior: precioActual,
            precioActual,
            cambioPct: 0,
            cambioAbs: 0,
        }
    }

    // Buscamos el punto más antiguo o un punto donde el precio haya sido diferente
    const primerPunto = historial[0]
    const puntoDiferente = [...historial].reverse().find((h) => h.precio !== precioActual)
    const puntoBase = puntoDiferente || primerPunto

    const precioAnterior = puntoBase.precio
    const cambioAbs = precioActual - precioAnterior
    const cambioPct = precioAnterior > 0 ? ((precioActual - precioAnterior) / precioAnterior) * 100 : 0

    return {
        precioAnterior,
        precioActual,
        cambioPct: Math.round(cambioPct * 10) / 10,
        cambioAbs,
    }
}

/**
 * Calcula la posición (1-indexed) de un precio dado frente al listado de precios de competidores.
 */
export function calcularPosicion(precioPropio, preciosCompetidores = []) {
    const validos = preciosCompetidores.filter((p) => typeof p === 'number' && p > 0)
    const masBaratos = validos.filter((p) => p < precioPropio).length
    const posicion = masBaratos + 1
    const total = validos.length + 1

    return {
        posicion,
        total,
        masBaratos,
    }
}

/**
 * Motor central de Inteligencia Comercial:
 * Convierte el historial de precios en alertas y recomendaciones accionables.
 */
export function generarAlertasAccionables(producto, monitoreos = []) {
    if (!producto || !producto.costo || !producto.precioVenta) {
        return {
            resumen: {
                alertasCriticas: 0,
                oportunidades: 0,
                posicionActual: 1,
                totalCompetidores: 1,
                estadoGeneral: 'ESTABLE',
                titular: 'Sin datos suficientes',
                descripcion: 'Agrega competidores para comenzar a monitorear.',
            },
            alertas: [],
        }
    }

    // Aplanar todas las publicaciones disponibles
    const publicaciones = monitoreos.flatMap((m) =>
        (m.publicaciones || []).map((p) => ({
            ...p,
            marketplace: m.marketplace,
            monitoreoId: m.id,
        })),
    )

    const disponibles = publicaciones.filter((p) => p.disponible)
    const preciosActuales = disponibles.map((p) => p.precio)
    const posActual = calcularPosicion(producto.precioVenta, preciosActuales)

    const alertas = []

    for (const pub of disponibles) {
        const { precioAnterior, precioActual, cambioPct, cambioAbs } = analizarHistorialCompetidor(pub)

        // Bajada significativa (>= 3%)
        if (cambioPct <= -3) {
            const competidorSupera = precioAnterior >= producto.precioVenta && precioActual < producto.precioVenta
            const precioSugerido = Math.max(producto.costo, Math.floor((precioActual - 100) / 100) * 100)
            const margenResultante = calcularMargen(producto.costo, precioSugerido)
            const viable = margenResultante !== null && margenResultante >= producto.margenObjetivo

            if (competidorSupera) {
                // Desplazamiento de puesto
                alertas.push({
                    id: `desplazamiento-${pub.idPublicacion}`,
                    tipo: 'DESPLAZAMIENTO',
                    severidad: 'alta',
                    competidor: pub.vendedor || 'Competidor',
                    marketplace: pub.marketplace,
                    precioAnterior,
                    precioActual,
                    porcentajeCambio: cambioPct,
                    cambioAbsoluto: cambioAbs,
                    impacto: `${pub.vendedor} bajó ${Math.abs(cambioPct)}% (de ${formatearPesos(precioAnterior)} a ${formatearPesos(precioActual)}). Ahora quedas ${posActual.posicion}.º de ${posActual.total}.`,
                    accion: {
                        viable,
                        precioSugerido,
                        margenResultante,
                        margenObjetivo: producto.margenObjetivo,
                        texto: viable
                            ? `Si bajas a ${formatearPesos(precioSugerido)}, recuperas el puesto anterior con un margen de ${formatearPorcentaje(margenResultante)} (tu objetivo es ${formatearPorcentaje(producto.margenObjetivo)}).`
                            : `Para superarlo tendrías que bajar a ${formatearPesos(precioSugerido)}, reduciendo tu margen al ${formatearPorcentaje(margenResultante)} (por debajo de tu margen objetivo de ${formatearPorcentaje(producto.margenObjetivo)}). Recomendación: mantener precio y proteger rentabilidad.`,
                        botonLabel: viable ? `Ajustar a ${formatearPesos(precioSugerido)}` : null,
                    },
                })
            } else if (precioActual < producto.precioVenta) {
                // Ya era más barato y bajó más
                alertas.push({
                    id: `bajada-${pub.idPublicacion}`,
                    tipo: 'BAJADA_COMPETIDOR',
                    severidad: 'media',
                    competidor: pub.vendedor || 'Competidor',
                    marketplace: pub.marketplace,
                    precioAnterior,
                    precioActual,
                    porcentajeCambio: cambioPct,
                    cambioAbsoluto: cambioAbs,
                    impacto: `${pub.vendedor} amplió su ventaja de precio bajando un ${Math.abs(cambioPct)}% adicional.`,
                    accion: {
                        viable,
                        precioSugerido,
                        margenResultante,
                        margenObjetivo: producto.margenObjetivo,
                        texto: viable
                            ? `Podrías acercarte a ${formatearPesos(precioSugerido)} para cerrar la brecha manteniendo un margen de ${formatearPorcentaje(margenResultante)}.`
                            : `Con tu costo de ${formatearPesos(producto.costo)}, igualar su precio bajaría tu margen del objetivo (${formatearPorcentaje(producto.margenObjetivo)}).`,
                        botonLabel: viable ? `Ajustar a ${formatearPesos(precioSugerido)}` : null,
                    },
                })
            }
        }

        // Subida de precio del competidor (>= 5%) -> Oportunidad de captura de margen
        if (cambioPct >= 5) {
            const precioOptimo = Math.floor((precioActual - 100) / 100) * 100
            const puedeSubir = precioOptimo > producto.precioVenta
            const margenResultante = calcularMargen(producto.costo, precioOptimo)

            if (puedeSubir) {
                alertas.push({
                    id: `subida-${pub.idPublicacion}`,
                    tipo: 'OPORTUNIDAD_SUBIDA',
                    severidad: 'baja',
                    competidor: pub.vendedor || 'Competidor',
                    marketplace: pub.marketplace,
                    precioAnterior,
                    precioActual,
                    porcentajeCambio: cambioPct,
                    cambioAbsoluto: cambioAbs,
                    impacto: `${pub.vendedor} subió su precio un ${Math.abs(cambioPct)}% (a ${formatearPesos(precioActual)}).`,
                    accion: {
                        viable: true,
                        precioSugerido: precioOptimo,
                        margenResultante,
                        margenObjetivo: producto.margenObjetivo,
                        texto: `Tienes espacio para subir tu precio a ${formatearPesos(precioOptimo)} sin perder tu ${posActual.posicion}.º puesto, elevando tu margen al ${formatearPorcentaje(margenResultante)}.`,
                        botonLabel: `Subir a ${formatearPesos(precioOptimo)}`,
                    },
                })
            }
        }
    }

    // Resumen de estado
    const criticas = alertas.filter((a) => a.severidad === 'alta').length
    const oportunidades = alertas.filter((a) => a.tipo === 'OPORTUNIDAD_SUBIDA').length

    let estadoGeneral = 'ESTABLE'
    let titular = 'Mercado sin movimientos críticos'
    let descripcion = `Te ubicas en la posición ${posActual.posicion}.º de ${posActual.total} ofertas activas. Tus márgenes están protegidos.`

    if (criticas > 0) {
        estadoGeneral = 'CRITICO'
        titular = `${criticas} ${criticas === 1 ? 'competidor amenaza' : 'competidores amenazan'} tu posición`
        descripcion = `Se detectaron bajas de precio que alteraron tu lugar en el podio. Revisa las recomendaciones a continuación.`
    } else if (oportunidades > 0) {
        estadoGeneral = 'OPORTUNIDAD'
        titular = `${oportunidades} ${oportunidades === 1 ? 'oportunidad' : 'oportunidades'} para capturar más margen`
        descripcion = `Competidores han incrementado sus precios, dejándote margen de maniobra para aumentar tus ganancias.`
    }

    return {
        resumen: {
            alertasCriticas: criticas,
            oportunidades,
            posicionActual: posActual.posicion,
            totalCompetidores: posActual.total,
            estadoGeneral,
            titular,
            descripcion,
        },
        alertas,
    }
}
