import Ionicons from '@expo/vector-icons/Ionicons'
import { Children, Fragment } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Presionable } from './movimiento'

// La paleta del tablero web (frontend/src/index.css): negro, blanco y grises. El único color es el rojo de los mensajes
// de error (--peligro-texto). Lo importante se señala con contraste (negro, contorno), no con color
export const colores = {
    tinta: '#000000',
    tintaMedia: '#48484a',
    tintaSuave: '#6e6e73',
    tintaTenue: '#86868b',
    papel: '#ffffff',
    humo: '#f5f5f7',
    humoOscuro: '#e5e5ea',
    borde: 'rgba(0, 0, 0, 0.09)',
    peligro: '#d70015',
}

const CIFRAS = { fontVariant: ['tabular-nums'] }

/**
 * La única escala tipográfica de la app. Sigue las reglas del tablero web (los .css de frontend/src), que es el estándar
 * de Trendly: fuente del sistema (San Francisco), títulos y valores en peso 600, tracking negativo pequeño en lo grande,
 * rótulos de cifras en minúscula y gris claro, y mayúsculas solo en el súper-título de una sección. Cada estilo fija
 * tamaño, peso, interlineado y tracking juntos. Ninguna pantalla define tamaños propios: si falta un estilo, va aquí.
 */
export const tipo = {
    // La cifra protagonista de una pantalla (precio sugerido) y la marca del login
    destacado: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1, color: colores.tinta, ...CIFRAS },
    // Título de la pantalla (como el h1 de la web: 600, -0.03em)
    titulo: { fontSize: 26, lineHeight: 31, fontWeight: '600', letterSpacing: -0.7, color: colores.tinta },
    // Precio en una lista y títulos de los encabezados
    titulo2: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.4, color: colores.tinta, ...CIFRAS },
    // Valor de una cifra (como .bandeja-cifras dd de la web: 18/600)
    valor: { fontSize: 18, lineHeight: 23, fontWeight: '600', letterSpacing: -0.2, color: colores.tinta, ...CIFRAS },
    // Nombre en una fila o dato principal de una tarjeta
    titular: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, color: colores.tinta },
    // Texto corrido
    cuerpo: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.1, color: colores.tintaMedia },
    // Texto corrido que debe resaltar (el cambio de precio)
    cuerpoFuerte: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1, color: colores.tinta, ...CIFRAS },
    // Datos secundarios: SKU, fecha, competidor, margen bajo una cifra
    nota: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: colores.tintaSuave },
    // Rótulo de una cifra o de un campo, en minúscula (como .bandeja-cifras dt de la web: 12 px, gris claro)
    etiqueta: { fontSize: 12, lineHeight: 16, fontWeight: '400', color: colores.tintaTenue },
    // Súper-título de una sección, el único texto en mayúsculas (como .alertas-super-titulo de la web)
    supertitulo: { fontSize: 11.5, lineHeight: 15, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', color: colores.tintaSuave },
    // Lo más pequeño: pestañas, ejes de la gráfica, contadores
    mini: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.1, color: colores.tintaSuave },
    cifra: CIFRAS,
}

// Espaciado en múltiplos de 4: el mismo ritmo en todas las pantallas
export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 }

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
            <View style={estilos.vacioIcono}>
                <Ionicons name="cloud-offline-outline" size={26} color={colores.tintaSuave} />
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

/**
 * Pastilla de estado, solo en la paleta de la app:
 * - neutro: gris, lo informativo (margen, "Leída")
 * - oscuro: negro, lo que está pendiente de atender ("Nueva", "Abierta")
 * - contorno: borde negro, lo que pide atención (relevancia alta, margen bajo el objetivo, no competitivo)
 */
export function Pastilla({ texto, tono = 'neutro' }) {
    return (
        <View style={[estilos.pastilla, estilos[`pastilla_${tono}`] ?? estilos.pastilla_neutro]}>
            <Text style={[estilos.pastillaTexto, { color: tono === 'oscuro' ? colores.papel : colores.tinta }]}>{texto}</Text>
        </View>
    )
}

export const tarjeta = {
    backgroundColor: colores.papel,
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: espacio.l,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colores.borde,
}

/** Superficie blanca de las secciones. */
export function Tarjeta({ children, style, ...props }) {
    return (
        <View {...props} style={[tarjeta, estilos.tarjetaInterior, style]}>
            {children}
        </View>
    )
}

/** Súper-título en mayúsculas de una sección ("PRECIO SUGERIDO", "COMPETIDOR"). */
export function Etiqueta({ children, style, ...props }) {
    return (
        <Text {...props} style={[tipo.supertitulo, style]}>
            {children}
        </Text>
    )
}

/** Varias cifras en una tarjeta, separadas por líneas finas (detalle del producto y de la alerta). */
export function FilaDeCifras({ children }) {
    const cifras = Children.toArray(children).filter(Boolean)
    return (
        <View style={[tarjeta, estilos.filaCifras]}>
            {cifras.map((cifra, i) => (
                <Fragment key={cifra.key ?? i}>
                    {i > 0 && <View style={estilos.separador} />}
                    {cifra}
                </Fragment>
            ))}
        </View>
    )
}

/** Un dato con su rótulo: "Tu precio / $159.900". Igual en el detalle del producto y en el de la alerta. */
export function Cifra({ etiqueta, valor, detalle, style }) {
    return (
        <View style={[estilos.cifra, style]}>
            <Text style={tipo.etiqueta}>{etiqueta}</Text>
            <Text style={tipo.valor}>{valor}</Text>
            {detalle ? <Text style={tipo.nota}>{detalle}</Text> : null}
        </View>
    )
}

const estilos = StyleSheet.create({
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, gap: espacio.m },
    suave: { ...tipo.cuerpo, color: colores.tintaSuave, textAlign: 'center' },
    error: { ...tipo.cuerpo, color: colores.peligro, textAlign: 'center' },
    tarjetaInterior: { gap: espacio.s },
    cifra: { flex: 1, gap: 2 },
    filaCifras: { flexDirection: 'row', alignItems: 'flex-start' },
    separador: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colores.borde, marginHorizontal: espacio.m },
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
    botonTexto: { ...tipo.titular, color: colores.papel },
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
    chipTexto: { ...tipo.cuerpo, fontWeight: '500', color: colores.tinta },
    pastilla: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
    pastillaTexto: { ...tipo.mini, fontSize: 12, lineHeight: 16 },
    pastilla_neutro: { backgroundColor: colores.humoOscuro },
    pastilla_oscuro: { backgroundColor: colores.tinta },
    pastilla_contorno: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.tinta },
})
