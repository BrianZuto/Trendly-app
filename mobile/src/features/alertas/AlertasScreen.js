import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { formatearFecha, formatearPesos, formatearPorcentaje } from '@/core/formato'
import { Aparecer, Presionable, vibrar } from '@/core/movimiento'
import { listarAlertas } from '@/core/services/api'
import { Cargando, Chip, ErrorConReintento, Pastilla, Vacio, colores, tarjeta, tipo } from '@/core/ui'
import { useCarga } from '@/core/useCarga'

const FILTROS = [
    { estado: '', titulo: 'Todas' },
    { estado: 'NUEVA', titulo: 'Nuevas' },
    { estado: 'LEIDA', titulo: 'Leídas' },
    { estado: 'CERRADA', titulo: 'Cerradas' },
]

// Qué pasó, con un ícono que se lee sin depender solo del color
export const QUE_PASO = {
    BAJA_PRECIO: { texto: 'Bajó de precio', icono: 'trending-down', color: colores.exito, fondo: colores.exitoSuave },
    SUBIDA_PRECIO: { texto: 'Subió de precio', icono: 'trending-up', color: colores.peligro, fondo: colores.peligroSuave },
    AGOTADO: { texto: 'Se agotó', icono: 'remove-circle-outline', color: colores.tintaMedia, fondo: colores.humo },
    DISPONIBLE: { texto: 'Volvió a estar disponible', icono: 'checkmark-circle-outline', color: colores.tintaMedia, fondo: colores.humo },
}

const ESTADO = { NUEVA: 'Nueva', LEIDA: 'Leída', CERRADA: 'Cerrada' }

export default function AlertasScreen() {
    const [estado, setEstado] = useState('')
    const cargar = useCallback(() => listarAlertas({ estado }), [estado])
    const carga = useCarga(cargar)

    function filtrar(nuevo) {
        if (nuevo === estado) return
        vibrar.seleccion()
        setEstado(nuevo)
    }

    return (
        <View style={estilos.pantalla}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={estilos.filtros}
                contentContainerStyle={estilos.filtrosContenido}
            >
                {FILTROS.map((filtro) => (
                    <Chip key={filtro.titulo} titulo={filtro.titulo} activo={estado === filtro.estado} onPress={() => filtrar(filtro.estado)} />
                ))}
            </ScrollView>
            <Lista {...carga} />
        </View>
    )
}

function Lista({ datos, error, cargando, refrescando, actualizando, recargar, refrescar }) {
    const router = useRouter()
    if (cargando) return <Cargando texto="Cargando alertas…" />
    if (error && !datos) return <ErrorConReintento mensaje={error} onReintentar={recargar} />
    return (
        // Mientras llega el filtro nuevo, la lista anterior se atenúa en vez de desaparecer
        <Aparecer style={estilos.lista}>
            <FlatList
                style={actualizando && { opacity: 0.45 }}
                contentContainerStyle={estilos.contenido}
                data={datos}
                keyExtractor={(alerta) => String(alerta.id)}
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colores.tinta} />}
                ListEmptyComponent={<Vacio icono="notifications-off-outline" texto="No hay alertas con este filtro." />}
                renderItem={({ item }) => <FilaAlerta alerta={item} onPress={() => router.push(`/producto/${item.productoId}`)} />}
            />
        </Aparecer>
    )
}

function FilaAlerta({ alerta, onPress }) {
    const nueva = alerta.estado === 'NUEVA'
    const hayPrecios = alerta.precioAnterior !== null && alerta.precioNuevo !== null
    const paso = QUE_PASO[alerta.tipo] ?? { texto: alerta.tipo, icono: 'alert-circle-outline', color: colores.tintaMedia, fondo: colores.humo }
    return (
        <Presionable
            accessibilityRole="button"
            accessibilityHint="Abre el producto"
            onPress={onPress}
            escala={0.98}
            style={[estilos.tarjeta, nueva && estilos.tarjetaNueva]}
        >
            <View style={[estilos.icono, { backgroundColor: paso.fondo }]}>
                <Ionicons name={paso.icono} size={20} color={paso.color} />
            </View>
            <View style={estilos.cuerpo}>
                <View style={estilos.fila}>
                    <Text style={estilos.tipo} numberOfLines={1}>
                        {paso.texto}
                    </Text>
                    <View style={estilos.etiquetas}>
                        {alerta.relevancia === 'ALTA' && <Pastilla tono="alerta" texto="Alta" />}
                        <Pastilla tono={nueva ? 'oscuro' : 'neutro'} texto={ESTADO[alerta.estado]} />
                    </View>
                </View>
                <Text style={estilos.producto} numberOfLines={1}>
                    {alerta.productoNombre}
                </Text>
                <Text style={tipo.nota} numberOfLines={1}>
                    {alerta.competidor} · {formatearFecha(alerta.creadoEn)}
                </Text>
                {hayPrecios && (
                    <Text style={estilos.precios}>
                        {formatearPesos(alerta.precioAnterior)} → {formatearPesos(alerta.precioNuevo)}
                        {alerta.variacionPct !== null ? `  (${alerta.variacionPct > 0 ? '+' : ''}${formatearPorcentaje(alerta.variacionPct)})` : ''}
                    </Text>
                )}
                {alerta.precioSugerido !== null && alerta.estado !== 'CERRADA' && (
                    <Text style={estilos.sugerido}>Sugerido {formatearPesos(alerta.precioSugerido)}</Text>
                )}
            </View>
        </Presionable>
    )
}

const estilos = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: colores.humo },
    lista: { flex: 1 },
    filtros: { flexGrow: 0 },
    filtrosContenido: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
    contenido: { padding: 16, gap: 10, flexGrow: 1 },
    tarjeta: { ...tarjeta, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    tarjetaNueva: { borderColor: colores.tinta, borderWidth: 1 },
    icono: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    cuerpo: { flex: 1, gap: 3 },
    fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    tipo: { flexShrink: 1, fontSize: 16, fontWeight: '700', letterSpacing: -0.2, color: colores.tinta },
    etiquetas: { flexDirection: 'row', gap: 6 },
    producto: { fontSize: 15, color: colores.tinta },
    precios: { fontSize: 15, fontWeight: '600', color: colores.tinta, marginTop: 6, ...tipo.cifra },
    sugerido: { fontSize: 14, fontWeight: '500', color: colores.tintaMedia, ...tipo.cifra },
})
