import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useAuth } from '@/core/auth/AuthProvider'
import { LogoTrendly } from '@/core/Logo'
import { listarAlertas } from '@/core/services/api'
import { colores, tipo } from '@/core/ui'

function Marca() {
    return (
        <View style={estilos.marca}>
            <LogoTrendly tamano={30} />
        </View>
    )
}

const icono = (lleno, contorno) =>
    function Icono({ color, focused, size }) {
        return <Ionicons name={focused ? lleno : contorno} size={size ?? 24} color={color} />
    }

// Contador de alertas nuevas en la pestaña, como el del menú web. Se actualiza al cambiar de pestaña
function useAlertasNuevas() {
    const [nuevas, setNuevas] = useState(0)
    const actualizar = useCallback(() => {
        listarAlertas({ estado: 'NUEVA' })
            .then((lista) => setNuevas(lista.length))
            .catch(() => {})
    }, [])
    useEffect(actualizar, [actualizar])
    return [nuevas, actualizar]
}

export default function TabsLayout() {
    const { usuario } = useAuth()
    const [nuevas, actualizarNuevas] = useAlertasNuevas()
    const nombre = usuario?.nombre?.split(' ')[0]

    return (
        <Tabs
            screenListeners={{ focus: actualizarNuevas }}
            screenOptions={{
                headerLeft: Marca,
                headerTintColor: colores.tinta,
                headerTitleAlign: 'left',
                headerTitleStyle: estilos.titulo,
                headerStyle: { backgroundColor: colores.humo },
                headerShadowVisible: false,
                tabBarActiveTintColor: colores.tinta,
                tabBarInactiveTintColor: colores.tintaSuave,
                tabBarLabelStyle: estilos.etiqueta,
                tabBarStyle: { backgroundColor: colores.papel, borderTopColor: colores.borde },
                sceneStyle: { backgroundColor: colores.humo },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Mis productos',
                    headerTitle: nombre ? `Hola, ${nombre}` : 'Mis productos',
                    tabBarLabel: 'Productos',
                    tabBarIcon: icono('pricetags', 'pricetags-outline'),
                }}
            />
            <Tabs.Screen
                name="alertas"
                options={{
                    title: 'Alertas',
                    tabBarIcon: icono('notifications', 'notifications-outline'),
                    tabBarBadge: nuevas > 0 ? nuevas : undefined,
                    tabBarBadgeStyle: estilos.contador,
                    tabBarAccessibilityLabel: nuevas > 0 ? `Alertas, ${nuevas} nuevas` : 'Alertas',
                }}
            />
            <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person-circle', 'person-circle-outline') }} />
        </Tabs>
    )
}

const estilos = StyleSheet.create({
    marca: { paddingLeft: 16, paddingRight: 4 },
    titulo: tipo.titulo2,
    // Sin color: lo ponen las pestañas (activa en negro, inactiva en gris)
    etiqueta: { fontSize: tipo.mini.fontSize, fontWeight: tipo.mini.fontWeight, letterSpacing: tipo.mini.letterSpacing },
    contador: { ...tipo.mini, fontWeight: '700', backgroundColor: colores.tinta, color: colores.papel },
})
