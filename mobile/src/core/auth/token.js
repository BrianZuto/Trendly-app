import * as SecureStore from 'expo-secure-store'

// La sesión vive en el almacenamiento cifrado del teléfono (Keychain en iOS, Keystore en Android)
const TOKEN_KEY = 'trendly.token'
const USUARIO_KEY = 'trendly.usuario'

export async function guardarSesion(token, usuario) {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario))
}

export async function limpiarSesion() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USUARIO_KEY)
}

export async function leerSesionGuardada() {
    try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY)
        const usuario = JSON.parse((await SecureStore.getItemAsync(USUARIO_KEY)) ?? 'null')
        return token && usuario ? { token, usuario } : null
    } catch {
        return null
    }
}

export function decodificarPayload(token) {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        return JSON.parse(atob(base64))
    } catch {
        return null
    }
}

// Milisegundos que le quedan al token; Infinity si no trae "exp" y 0 si no se puede leer
export function msParaVencer(token, ahora = Date.now()) {
    const payload = token ? decodificarPayload(token) : null
    if (!payload) return 0
    if (payload.exp === undefined) return Infinity
    return Math.max(0, payload.exp * 1000 - ahora)
}

export const tokenVigente = (token, ahora) => msParaVencer(token, ahora) > 0
