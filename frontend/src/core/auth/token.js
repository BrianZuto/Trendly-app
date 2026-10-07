// Almacenamiento de la sesion en el navegador (token JWT y datos del usuario)
const TOKEN_KEY = 'trendly.token'
const USUARIO_KEY = 'trendly.usuario'

export function getToken() {
    return localStorage.getItem(TOKEN_KEY)
}

export function guardarSesion(token, usuario) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario))
}

export function guardarToken(token) {
    localStorage.setItem(TOKEN_KEY, token)
}

export function limpiarSesion() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
}

export function getUsuarioGuardado() {
    try {
        const crudo = localStorage.getItem(USUARIO_KEY)
        return crudo ? JSON.parse(crudo) : null
    } catch {
        return null
    }
}

export function decodificarPayload(token) {
    try {
        const parte = token.split('.')[1]
        const base64 = parte.replace(/-/g, '+').replace(/_/g, '/')
        return JSON.parse(atob(base64))
    } catch {
        return null
    }
}

export function tokenVigente(token) {
    if (!token) return false
    const payload = decodificarPayload(token)
    if (!payload) return false
    if (payload.exp === undefined) return true
    return payload.exp * 1000 > Date.now()
}

// Devolver sesion guardada 
export function leerSesionVigente() {
    const token = getToken()
    const usuario = getUsuarioGuardado()
    if (token && usuario && tokenVigente(token)) return { token, usuario }
    limpiarSesion()
    return { token: null, usuario: null }
}
