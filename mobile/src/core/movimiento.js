import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Pressable } from 'react-native'

// Curva ease-out fuerte para entradas: arranca rápido, así la respuesta se siente inmediata
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)

// Respeta "Reducir movimiento" del sistema: sin desplazamientos ni escalas, solo cambios de opacidad
export function useMovimientoReducido() {
    const [reducido, setReducido] = useState(false)
    useEffect(() => {
        let vigente = true
        AccessibilityInfo.isReduceMotionEnabled()
            .then((valor) => vigente && setReducido(Boolean(valor)))
            .catch(() => {})
        const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducido)
        return () => {
            vigente = false
            suscripcion?.remove?.()
        }
    }, [])
    return reducido
}

// Pressable que se hunde un poco al tocarlo (en el touch-down, no al soltar) y vuelve con un resorte sin rebote
export function Presionable({ style, children, escala = 0.97, onPressIn, onPressOut, ...props }) {
    const reducido = useMovimientoReducido()
    const [valor] = useState(() => new Animated.Value(1))

    const ir = (destino) =>
        Animated.spring(valor, {
            toValue: destino,
            useNativeDriver: true,
            // Críticamente amortiguado: llega rápido y no se pasa del objetivo
            stiffness: 600,
            damping: 49,
            mass: 1,
        }).start()

    const transformacion = reducido
        ? { opacity: valor.interpolate({ inputRange: [escala, 1], outputRange: [0.6, 1] }) }
        : { transform: [{ scale: valor }] }

    return (
        <Pressable
            {...props}
            onPressIn={(evento) => {
                ir(escala)
                onPressIn?.(evento)
            }}
            onPressOut={(evento) => {
                ir(1)
                onPressOut?.(evento)
            }}
        >
            {(estado) => (
                <Animated.View style={[typeof style === 'function' ? style(estado) : style, transformacion]}>
                    {typeof children === 'function' ? children(estado) : children}
                </Animated.View>
            )}
        </Pressable>
    )
}

// Entrada suave del contenido cuando reemplaza al "Cargando…": opacidad y 8 px de desplazamiento, 220 ms
export function Aparecer({ children, style, retraso = 0, desplazamiento = 8 }) {
    const reducido = useMovimientoReducido()
    const [progreso] = useState(() => new Animated.Value(0))

    useEffect(() => {
        const animacion = Animated.timing(progreso, {
            toValue: 1,
            duration: 220,
            delay: retraso,
            easing: EASE_OUT,
            useNativeDriver: true,
        })
        animacion.start()
        return () => animacion.stop()
    }, [progreso, retraso])

    const desplazar = reducido
        ? []
        : [{ translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [desplazamiento, 0] }) }]

    return <Animated.View style={[style, { opacity: progreso, transform: desplazar }]}>{children}</Animated.View>
}

// Vibración solo en momentos con significado (confirmar, error, cambiar un filtro). Si el equipo no la soporta, se ignora
export const vibrar = {
    seleccion: () => Haptics.selectionAsync().catch(() => {}),
    exito: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
}
