import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { quitarDispositivo, registrarDispositivo } from '@/core/services/api'

// Mismo id que usa el backend en "channelId" (ExpoPushHttpCliente): en Android, sin el canal no se muestra la notificación
export const CANAL_ALERTAS = 'alertas'

// Con la app abierta la alerta también se muestra como banner
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
})

const projectId = () => Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId

/** Estado del permiso del sistema: 'granted', 'denied' o 'undetermined'. */
export async function estadoPermiso() {
    const { status } = await Notifications.getPermissionsAsync()
    return status
}

/**
 * Pide permiso (solo la primera vez: después iOS ya no muestra el diálogo), obtiene el token de Expo Push y lo registra
 * en el backend. Devuelve el token o null si no se pudo: simulador, permiso negado o sin conexión. Nunca lanza: la app
 * funciona igual sin notificaciones.
 */
export async function registrarParaPush() {
    try {
        if (!Device.isDevice) return null
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(CANAL_ALERTAS, {
                name: 'Alertas de precio',
                // eslint-disable-next-line import/namespace -- AndroidImportance se reexporta desde un archivo de tipos
                importance: Notifications.AndroidImportance.HIGH,
            })
        }
        let estado = await estadoPermiso()
        if (estado !== 'granted') {
            estado = (await Notifications.requestPermissionsAsync()).status
        }
        if (estado !== 'granted') return null
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() })
        await registrarDispositivo(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID')
        return token
    } catch {
        return null
    }
}

/** Al cerrar sesión el celular deja de recibir las alertas de esa cuenta. Si falla, no impide salir. */
export async function olvidarCelular(token) {
    if (!token) return
    try {
        await quitarDispositivo(token)
    } catch {
        // Sin conexión: el token queda en el servidor hasta que otra cuenta lo registre o Expo lo invalide
    }
}

/** La ruta que trae una notificación de alerta ("/alerta/15"), o null si no es nuestra. */
export function rutaDe(respuesta) {
    const url = respuesta?.notification?.request?.content?.data?.url
    return typeof url === 'string' && url.startsWith('/alerta/') ? url : null
}
