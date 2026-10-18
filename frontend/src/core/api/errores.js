// ejemplo 409 → "Email ya registrado" en el registro
export function mensajeDeError(error, porEstado = {}) {
    const respuesta = error?.response
    if (!respuesta) {
        return 'No se pudo conectar con el servidor. Inténtalo de nuevo.'
    }
    if (porEstado[respuesta.status]) return porEstado[respuesta.status]

    const mensajeApi = extraerMensaje(respuesta.data)
    if (mensajeApi) return mensajeApi

    if (respuesta.status === 401) return 'Credenciales inválidas'
    if (respuesta.status === 403) return 'No tienes permiso para realizar esta acción'
    if (respuesta.status >= 500) return 'Ocurrió un error en el servidor. Inténtalo más tarde.'
    return 'No se pudo completar la solicitud'
}

function extraerMensaje(datos) {
    if (!datos) return ''
    if (typeof datos === 'string') return datos
    const directo = datos.message ?? datos.mensaje ?? datos.detail
    if (typeof directo === 'string' && directo.trim()) return directo
    if (Array.isArray(datos.errors) && datos.errors.length > 0) {
        return datos.errors
            .map((e) => (typeof e === 'string' ? e : (e.defaultMessage ?? e.message ?? '')))
            .filter(Boolean)
            .join('. ')
    }
    return ''
}
