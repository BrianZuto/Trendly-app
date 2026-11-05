import * as Notifications from 'expo-notifications'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/core/auth/AuthProvider'
import { LogoTrendly } from '@/core/Logo'
import { rutaDe } from '@/core/notificaciones'
import { colores } from '@/core/ui'

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="dark" />
                <Navegacion />
            </AuthProvider>
        </SafeAreaProvider>
    )
}

/**
 * Ruta de la alerta cuya notificación tocó el vendedor (SCRUM-52), tanto con la app abierta como cuando la notificación
 * fue la que abrió la app. Queda pendiente hasta que haya sesión: si tuvo que iniciar sesión, se abre después.
 */
function useAlertaTocada() {
    const [ruta, setRuta] = useState(null)
    useEffect(() => {
        let vigente = true
        Notifications.getLastNotificationResponseAsync()
            .then((respuesta) => {
                const destino = rutaDe(respuesta)
                if (vigente && destino) setRuta(destino)
            })
            .catch(() => {})
        const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
            const destino = rutaDe(respuesta)
            if (destino) setRuta(destino)
        })
        return () => {
            vigente = false
            suscripcion.remove()
        }
    }, [])
    const olvidar = useCallback(() => setRuta(null), [])
    return [ruta, olvidar]
}

// Sin sesión solo existe el login; con sesión, las pestañas y los detalles. Al cerrar o vencer la sesión se vuelve al login
function Navegacion() {
    const { cargando, sesion } = useAuth()
    const router = useRouter()
    const [alertaTocada, olvidarAlertaTocada] = useAlertaTocada()

    useEffect(() => {
        if (!sesion || !alertaTocada) return undefined
        // Un instante después: recién iniciada la sesión, el navegador todavía no tiene montadas las pantallas protegidas
        const espera = setTimeout(() => {
            router.push(alertaTocada)
            olvidarAlertaTocada()
            Notifications.clearLastNotificationResponseAsync().catch(() => {})
        }, 0)
        return () => clearTimeout(espera)
    }, [sesion, alertaTocada, router, olvidarAlertaTocada])

    if (cargando) {
        return (
            <View
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.humo }}
                accessibilityLabel="Abriendo Trendly…"
            >
                <LogoTrendly tamano={72} />
            </View>
        )
    }

    return (
        <Stack
            screenOptions={{
                headerTintColor: colores.tinta,
                headerStyle: { backgroundColor: colores.humo },
                headerShadowVisible: false,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: colores.humo },
                headerBackTitle: 'Atrás',
            }}
        >
            <Stack.Protected guard={Boolean(sesion)}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
                <Stack.Screen name="alerta/[id]" options={{ title: 'Alerta' }} />
            </Stack.Protected>
            <Stack.Protected guard={!sesion}>
                <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            </Stack.Protected>
        </Stack>
    )
}
