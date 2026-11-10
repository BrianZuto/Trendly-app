// Mismo criterio que la web (frontend/src/core/api/errores.js)
export function mensajeDeError(error, porEstado = {}) {
    const respuesta = error?.response
    if (!respuesta) return 'No se pudo conectar con el servidor. Revisa tu conexión.'
    if (porEstado[respuesta.status]) return porEstado[respuesta.status]

    const datos = respuesta.data
    const directo = typeof datos === 'string' ? datos : (datos?.message ?? datos?.mensaje ?? datos?.detail)
    if (typeof directo === 'string' && directo.trim()) return directo

    if (respuesta.status === 401) return 'Credenciales inválidas'
    if (respuesta.status === 403) return 'No tienes permiso para realizar esta acción'
    if (respuesta.status >= 500) return 'Ocurrió un error en el servidor. Inténtalo más tarde.'
    return 'No se pudo completar la solicitud'
}
