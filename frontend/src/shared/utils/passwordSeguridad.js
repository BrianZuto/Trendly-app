export const REQUISITOS = [
    { id: 'longitud', texto: 'Al menos 8 caracteres', cumple: (v) => v.length >= 8 },
    { id: 'letra', texto: 'Al menos una letra', cumple: (v) => /\p{L}/u.test(v) },
    { id: 'numero', texto: 'Al menos un número', cumple: (v) => /\d/.test(v) },
]

export const RECOMENDACIONES = [
    { id: 'mayusculas', texto: 'Mayúsculas y minúsculas', cumple: (v) => /\p{Lu}/u.test(v) && /\p{Ll}/u.test(v) },
    { id: 'simbolo', texto: 'Un símbolo, por ejemplo ! ? # $', cumple: (v) => /[^\p{L}\d\s]/u.test(v) },
    { id: 'largo', texto: '12 caracteres o más', cumple: (v) => v.length >= 12 },
]

export function requisitosCumplidos(valor) {
    return REQUISITOS.every((requisito) => requisito.cumple(valor))
}

export function nivelSeguridad(valor) {
    if (!valor) return { nivel: 0, etiqueta: '' }
    if (!requisitosCumplidos(valor)) return { nivel: 1, etiqueta: 'Débil' }
    const extras = RECOMENDACIONES.filter((recomendacion) => recomendacion.cumple(valor)).length
    return extras >= 2 ? { nivel: 3, etiqueta: 'Fuerte' } : { nivel: 2, etiqueta: 'Aceptable' }
}