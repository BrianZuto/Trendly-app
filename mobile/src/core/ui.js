import Ionicons from '@expo/vector-icons/Ionicons'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Presionable } from './movimiento'

// Los mismos tonos del tablero web (frontend/src/index.css)
export const colores = {
    tinta: '#000000',
    tintaMedia: '#48484a',
    tintaSuave: '#6e6e73',
    papel: '#ffffff',
    humo: '#f5f5f7',
    humoOscuro: '#e5e5ea',
    borde: 'rgba(0, 0, 0, 0.09)',
    etiqueta: '#ffd23f',
    etiquetaSuave: '#fff6d6',
    peligro: '#d70015',
    peligroSuave: '#fdecee',
    exito: '#1f7a3a',
    exitoSuave: '#e9f6ee',
}

// Escala tipográfica: los títulos grandes llevan tracking negativo; el texto pequeño queda en 0
export const tipo = {
    titulo: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, color: colores.tinta },
    seccion: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, color: colores.tinta },
    cuerpo: { fontSize: 15, color: colores.tintaMedia, lineHeight: 21 },
    nota: { fontSize: 13, color: colores.tintaSuave, lineHeight: 18 },
    cifra: { fontVariant: ['tabular-nums'] },
}

export function Cargando({ texto }) {
    return (
        <View style={estilos.centro}>
            <ActivityIndicator color={colores.tinta} />
            <Text style={estilos.suave}>{texto}</Text>
        </View>
    )
}

export function Vacio({ texto, icono = 'file-tray-outline' }) {
    return (
        <View style={estilos.centro}>
            <View style={estilos.vacioIcono}>
                <Ionicons name={icono} size={26} color={colores.tintaSuave} />
            </View>
            <Text style={estilos.suave}>{texto}</Text>
        </View>
    )
}

export function ErrorConReintento({ mensaje, onReintentar }) {
    return (
        <View style={estilos.centro}>
            <View style={[estilos.vacioIcono, { backgroundColor: colores.peligroSuave }]}>
                <Ionicons name="cloud-offline-outline" size={26} color={colores.peligro} />
            </View>
            <Text style={estilos.error} accessibilityRole="alert">
                {mensaje}
            </Text>
            <Boton titulo="Reintentar" variante="claro" onPress={onReintentar} />
        </View>
    )
}

export function Boton({ titulo, onPress, deshabilitado = false, variante = 'oscuro', cargando = false }) {
    const claro = variante === 'claro'
    return (
        <Presionable
            accessibilityRole="button"
            accessibilityLabel={titulo}
            accessibilityState={{ disabled: deshabilitado, busy: cargando }}
            disabled={deshabilitado}
            onPress={onPress}
            style={[estilos.boton, claro && estilos.botonClaro, deshabilitado && { opacity: 0.55 }]}
        >
            {cargando && <ActivityIndicator color={claro ? colores.tinta : colores.papel} style={{ marginRight: 8 }} />}
            <Text style={[estilos.botonTexto, claro && { color: colores.tinta }]}>{titulo}</Text>
        </Presionable>
    )
}

export function Chip({ titulo, activo, onPress }) {
    return (
        <Presionable
            accessibilityRole="button"
            accessibilityLabel={titulo}
            accessibilityState={{ selected: activo }}
            onPress={onPress}
            escala={0.95}
            style={[estilos.chip, activo && estilos.chipActivo]}
        >
            <Text style={[estilos.chipTexto, activo && { color: colores.papel }]}>{titulo}</Text>
        </Presionable>
    )
}

// Pastilla de estado: tono suave de fondo con texto del mismo color, legible sin depender solo del color
export function Pastilla({ texto, tono = 'neutro' }) {
    const paleta = {
        neutro: [colores.humo, colores.tintaMedia],
        oscuro: [colores.tinta, colores.papel],
        alerta: [colores.etiqueta, colores.tinta],
        peligro: [colores.peligroSuave, colores.peligro],
        exito: [colores.exitoSuave, colores.exito],
    }[tono]
    return (
        <View style={[estilos.pastilla, { backgroundColor: paleta[0] }]}>
            <Text style={[estilos.pastillaTexto, { color: paleta[1] }]}>{texto}</Text>
        </View>
    )
}

export const tarjeta = {
    backgroundColor: colores.papel,
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colores.borde,
}

const estilos = StyleSheet.create({
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
    suave: { color: colores.tintaSuave, fontSize: 15, textAlign: 'center', lineHeight: 21 },
    error: { color: colores.peligro, fontSize: 15, textAlign: 'center', lineHeight: 21 },
    vacioIcono: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colores.humoOscuro,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boton: {
        flexDirection: 'row',
        backgroundColor: colores.tinta,
        borderRadius: 14,
        borderCurve: 'continuous',
        minHeight: 52,
        paddingHorizontal: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonClaro: { backgroundColor: colores.papel, borderWidth: StyleSheet.hairlineWidth, borderColor: colores.borde },
    botonTexto: { color: colores.papel, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
    chip: {
        borderRadius: 999,
        backgroundColor: colores.papel,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colores.borde,
        paddingHorizontal: 16,
        minHeight: 36,
        justifyContent: 'center',
    },
    chipActivo: { backgroundColor: colores.tinta, borderColor: colores.tinta },
    chipTexto: { color: colores.tinta, fontSize: 14, fontWeight: '500' },
    pastilla: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
    pastillaTexto: { fontSize: 12, fontWeight: '600' },
})
