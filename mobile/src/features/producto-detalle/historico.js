export const DIAS_GRAFICA = 30

const dia = (iso) => {
    const fecha = new Date(iso)
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

// Un punto por día: el precio más bajo de la competencia (solo capturas con el producto disponible)
export function serieDiaria(capturas) {
    const porDia = new Map()
    for (const captura of capturas) {
        const precio = Number(captura.precioCop)
        if (captura.disponible === false || !(precio > 0)) continue
        const clave = dia(captura.fechaCaptura)
        const actual = porDia.get(clave)
        if (!actual || precio < actual.precio) porDia.set(clave, { fecha: captura.fechaCaptura, precio })
    }
    return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, punto]) => punto)
}

export const desdeHace = (dias, ahora = Date.now()) => new Date(ahora - dias * 86400000).toISOString()
