import { calcularMargen, precioMinimo } from '@features/productos/formato'

function redondearCentena(valor) {
    return Math.round(Number(valor) / 100) * 100
}

function calcularMediana(precios) {
    if (!precios.length) return 0
    const ordenados = [...precios].sort((a, b) => a - b)
    const mitad = Math.floor(ordenados.length / 2)
    if (ordenados.length % 2 !== 0) {
        return ordenados[mitad]
    }
    return redondearCentena((ordenados[mitad - 1] + ordenados[mitad]) / 2)
}

function calcularCuartilSuperior(precios) {
    if (!precios.length) return 0
    const ordenados = [...precios].sort((a, b) => a - b)
    if (ordenados.length === 1) return ordenados[0]
    const indice = Math.min(ordenados.length - 1, Math.floor(ordenados.length * 0.75))
    return ordenados[indice]
}

/**
 * Calcula los 3 escenarios comerciales estratégicos (Conservador, Equilibrado, Mayor Margen)
 * a partir del costo real, margen objetivo y precios de la reventa con stock.
 */
export function calcularEscenarios({ costo, margenObjetivo, publicaciones = [], precioActual }) {
    const c = Number(costo) || 0
    const mObj = Number(margenObjetivo) || 0
    const pActual = Number(precioActual) || 0

    // Solo competidores con stock disponible y precio válido
    const vigentes = publicaciones.filter((p) => p && Number(p.precio) > 0 && p.disponible !== false)
    const precios = vigentes.map((p) => Number(p.precio)).sort((a, b) => a - b)
    const totalMercado = precios.length + 1 // incluye tu oferta proyectada

    // Mínimo de seguridad para no vender a pérdida (al menos 8% de margen o la mitad del objetivo)
    const margenPiso = Math.max(8, Math.min(15, mObj * 0.5))
    const precioPiso = precioMinimo(c, margenPiso) || redondearCentena(c * 1.1)
    const precioBaseObjetivo = precioMinimo(c, mObj) || redondearCentena(c * (1 + mObj / 100))

    let pConservador = 0
    let pEquilibrado = 0
    let pMargenAlto = 0

    if (precios.length === 0) {
        // Sin competidores con stock: escenarios basados en márgenes estratégicos
        pConservador = Math.max(precioPiso, redondearCentena(c / (1 - Math.max(12, mObj - 8) / 100)))
        pEquilibrado = precioBaseObjetivo
        pMargenAlto = redondearCentena(c / (1 - Math.min(65, mObj + 12) / 100))
    } else {
        const masBarato = precios[0]
        const mediana = calcularMediana(precios)
        const cuartilAlto = calcularCuartilSuperior(precios)

        // 1. Conservador: ubicarse $1.000 por debajo del más barato con stock para liderar la Buy-Box,
        // sin romper nunca el precio de piso de seguridad de tu negocio.
        const objetivoBajo = masBarato > 1000 ? masBarato - 1000 : masBarato
        pConservador = Math.max(precioPiso, redondearCentena(objetivoBajo))

        // 2. Equilibrado: alinear a la mediana del mercado asegurando al menos el margen objetivo
        pEquilibrado = Math.max(precioBaseObjetivo, redondearCentena(mediana))

        // Si el equilibrado quedó igual o menor al conservador, separarlos de forma lógica
        if (pEquilibrado <= pConservador) {
            pEquilibrado = redondearCentena(Math.max(precioBaseObjetivo, pConservador + 5000))
        }

        // 3. Mayor Margen: alineado a la parte alta del mercado o margen objetivo premium
        const precioAltoObjetivo = redondearCentena(c / (1 - Math.min(75, mObj + 10) / 100))
        pMargenAlto = redondearCentena(Math.max(cuartilAlto, precioAltoObjetivo, pEquilibrado + 6000))
    }

    function construirEscenario({ id, nombre, badge, precio, explicacion, icono }) {
        const margen = calcularMargen(c, precio) || 0
        const ganancia = Math.max(0, precio - c)
        const masBaratosQueTu = precios.filter((p) => p < precio).length
        const puesto = masBaratosQueTu + 1
        const esActual = Math.abs(precio - pActual) < 100

        let resumenPosicion = ''
        if (precios.length === 0) {
            resumenPosicion = 'Sin competidores activos con stock'
        } else if (masBaratosQueTu === 0) {
            resumenPosicion = `1.º de ${totalMercado} · Nadie vende más barato`
        } else if (masBaratosQueTu === 1) {
            resumenPosicion = `${puesto}.º de ${totalMercado} · 1 competidor vende más barato`
        } else {
            resumenPosicion = `${puesto}.º de ${totalMercado} · ${masBaratosQueTu} venden más barato`
        }

        return {
            id,
            nombre,
            badge,
            precio,
            margen,
            ganancia,
            puesto,
            totalMercado,
            masBaratosQueTu,
            resumenPosicion,
            explicacion,
            esActual,
            icono,
        }
    }

    return [
        construirEscenario({
            id: 'conservador',
            nombre: 'Conservador',
            badge: 'Volumen',
            precio: pConservador,
            explicacion:
                precios.length > 0 && pConservador <= precios[0]
                    ? 'Captura el primer lugar de ventas ubicándote justo por debajo del líder sin perder rentabilidad mínima.'
                    : 'Precio competitivo ajustado al umbral de seguridad para maximizar la velocidad de rotación de stock.',
            icono: 'volumen',
        }),
        construirEscenario({
            id: 'equilibrado',
            nombre: 'Equilibrado',
            badge: 'Recomendado',
            precio: pEquilibrado,
            explicacion:
                'Punto óptimo entre volumen de ventas y margen neto. Alineado a la mediana del mercado protegiendo tu objetivo.',
            icono: 'balance',
        }),
        construirEscenario({
            id: 'margen-alto',
            nombre: 'Mayor margen',
            badge: 'Rentabilidad',
            precio: pMargenAlto,
            explicacion:
                'Maximiza la ganancia por unidad vendida situándote en la franja premium. Ideal para diferenciación o stock limitado.',
            icono: 'margen',
        }),
    ]
}
