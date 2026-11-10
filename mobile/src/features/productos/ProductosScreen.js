import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { formatearPesos, formatearPorcentaje } from '@/core/formato'
import { Aparecer, Presionable } from '@/core/movimiento'
import { listarProductos } from '@/core/services/api'
import { Cargando, ErrorConReintento, Pastilla, Vacio, colores, tarjeta, tipo } from '@/core/ui'
import { useCarga } from '@/core/useCarga'

export default function ProductosScreen() {
    const router = useRouter()
    const { datos, error, cargando, refrescando, recargar, refrescar } = useCarga(listarProductos)

    if (cargando) return <Cargando texto="Cargando productos…" />
    if (error && !datos) return <ErrorConReintento mensaje={error} onReintentar={recargar} />

    return (
        <Aparecer style={estilos.pantalla}>
            <FlatList
                contentContainerStyle={estilos.contenido}
                contentInsetAdjustmentBehavior="automatic"
                data={datos}
                keyExtractor={(producto) => String(producto.id)}
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colores.tinta} />}
                ListHeaderComponent={
                    datos.length > 0 ? (
                        <Text style={estilos.resumen}>
                            {datos.length} {datos.length === 1 ? 'producto' : 'productos'}
                        </Text>
                    ) : null
                }
                ListEmptyComponent={<Vacio icono="cube-outline" texto="Aún no tienes productos. Regístralos desde la web." />}
                renderItem={({ item }) => <FilaProducto producto={item} onPress={() => router.push(`/producto/${item.id}`)} />}
            />
        </Aparecer>
    )
}

function FilaProducto({ producto, onPress }) {
    const sinMargen = producto.margenActual === null || producto.margenActual === undefined
    const bajoObjetivo = !sinMargen && producto.margenActual < producto.margenObjetivo
    return (
        <Presionable
            accessibilityRole="button"
            accessibilityLabel={`${producto.nombre}, precio ${formatearPesos(producto.precioVenta)}`}
            accessibilityHint="Abre el detalle con la gráfica y el precio sugerido"
            onPress={onPress}
            escala={0.98}
            style={estilos.tarjeta}
        >
            <View style={estilos.cuerpo}>
                <Text style={estilos.nombre} numberOfLines={2}>
                    {producto.nombre}
                </Text>
                <Text style={estilos.sku}>SKU {producto.sku}</Text>
                <View style={estilos.fila}>
                    <Text style={estilos.precio}>{formatearPesos(producto.precioVenta)}</Text>
                    <Pastilla
                        tono={bajoObjetivo ? 'contorno' : 'neutro'}
                        texto={`Margen ${formatearPorcentaje(producto.margenActual)} · obj. ${formatearPorcentaje(producto.margenObjetivo)}`}
                    />
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colores.tintaSuave} />
        </Presionable>
    )
}

const estilos = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: colores.humo },
    contenido: { padding: 16, gap: 10, flexGrow: 1 },
    resumen: { ...tipo.nota, marginBottom: 2, marginLeft: 4 },
    tarjeta: { ...tarjeta, flexDirection: 'row', alignItems: 'center', gap: 12 },
    cuerpo: { flex: 1, gap: 4 },
    fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, flexWrap: 'wrap' },
    nombre: tipo.titular,
    sku: tipo.nota,
    precio: tipo.titulo2,
})
