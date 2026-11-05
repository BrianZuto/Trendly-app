import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/core/auth/AuthProvider'
import { LogoTrendly } from '@/core/Logo'
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

// Sin sesión solo existe el login; con sesión, las pestañas y el detalle. Al cerrar o vencer la sesión se vuelve al login
function Navegacion() {
    const { cargando, sesion } = useAuth()
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
            </Stack.Protected>
            <Stack.Protected guard={!sesion}>
                <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            </Stack.Protected>
        </Stack>
    )
}
