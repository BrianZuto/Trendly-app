import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { formatearPesos, formatearPorcentaje } from '@/core/formato'
import { Aparecer } from '@/core/movimiento'
import { listarMonitoreos, obtenerHistorico, obtenerProducto, obtenerSugerencia } from '@/core/services/api'
import { Cargando, ErrorConReintento, Pastilla, colores, tarjeta, tipo } from '@/core/ui'
import { useCarga } from '@/core/useCarga'
import GraficaHistorico from './GraficaHistorico'
import { DIAS_GRAFICA, desdeHace, serieDiaria } from './historico'

const POSICION = {
    MAS_BARATO: 'Eres el más barato',
    EN_RANGO: 'Estás en el rango de la competencia',
    MAS_CARO: 'Estás por encima de la competencia',
}

async function cargarDetalle(id) {
    const [producto, sugerencia, monitoreos] = await Promise.all([
        obtenerProducto(id),
        // Sin sugerencia (o si falla) el detalle se muestra igual
        obtenerSugerencia(id).catch(() => null),
        listarMonitoreos(id).catch(() => []),
    ])
    const desde = desdeHace(DIAS_GRAFICA)
    const historicos = await Promise.allSettled(monitoreos.map((m) => obtenerHistorico(m.id, { desde })))
    const capturas = historicos.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    return { producto, sugerencia, serie: serieDiaria(capturas), monitoreos: monitoreos.length }
}

export default function ProductoDetalleScreen() {
    const { id } = useLocalSearchParams()
    const cargar = useCallback(() => cargarDetalle(id), [id])
    const { datos, error, cargando, refrescando, recargar, refrescar } = useCarga(cargar)

    if (cargando) return <Cargando texto="Cargando producto…" />
    if (error && !datos) return <ErrorConReintento mensaje={error} onReintentar={recargar} />

    const { producto, sugerencia, serie, monitoreos } = datos
    const bajoObjetivo = producto.margenActual !== null && producto.margenActual < producto.margenObjetivo

    return (
        <ScrollView
            style={estilos.pantalla}
            contentContainerStyle={estilos.contenido}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colores.tinta} />}
        >
            <Stack.Screen options={{ title: producto.nombre }} />

            <Aparecer style={estilos.bloque}>
                <View style={estilos.cabecera}>
                    <Text style={tipo.titulo} accessibilityRole="header">
                        {producto.nombre}
                    </Text>
                    <Text style={tipo.nota}>SKU {producto.sku}</Text>
                </View>

                <View style={estilos.cifras}>
                    <Cifra etiqueta="Tu precio" valor={formatearPesos(producto.precioVenta)} />
                    <View style={estilos.separador} />
                    <Cifra etiqueta="Costo" valor={formatearPesos(producto.costo)} />
                    <View style={estilos.separador} />
                    <Cifra
                        etiqueta="Margen"
                        valor={formatearPorcentaje(producto.margenActual)}
                        detalle={`objetivo ${formatearPorcentaje(producto.margenObjetivo)}`}
                        alerta={bajoObjetivo}
                    />
                </View>

                <Sugerencia sugerencia={sugerencia} />

                <View style={estilos.tarjeta}>
                    <Text style={tipo.seccion} accessibilityRole="header">
                        Histórico de precios · {DIAS_GRAFICA} días
                    </Text>
                    {monitoreos === 0 ? (
                        <Text style={tipo.nota}>Este producto no tiene competidores vigilados. Agrégalos desde la web.</Text>
                    ) : (
                        <GraficaHistorico serie={serie} precioVenta={Number(producto.precioVenta)} />
                    )}
                </View>
            </Aparecer>
        </ScrollView>
    )
}

// La recomendación es lo que el vendedor viene a buscar: va arriba y con el amarillo de la marca
function Sugerencia({ sugerencia }) {
    if (!sugerencia || sugerencia.estado === 'PENDIENTE') {
        return (
            <View style={estilos.tarjeta}>
                <View style={estilos.tituloSugerencia}>
                    <Ionicons name="hourglass-outline" size={18} color={colores.tintaMedia} />
                    <Text style={tipo.seccion} accessibilityRole="header">
                        Precio sugerido
                    </Text>
                </View>
                <Text style={tipo.nota}>
                    {sugerencia
                        ? 'Pendiente: hacen falta al menos 2 capturas de la competencia en los últimos 7 días.'
                        : 'No se pudo consultar el precio sugerido.'}
                </Text>
            </View>
        )
    }
    return (
        <View style={[estilos.tarjeta, estilos.destacada]}>
            <View style={estilos.tituloSugerencia}>
                <Ionicons name="sparkles" size={16} color={colores.tinta} />
                <Text style={estilos.etiquetaSugerencia} accessibilityRole="header">
                    Precio sugerido
                </Text>
            </View>
            <Text style={estilos.sugerido}>
                {sugerencia.precioSugerido === null ? 'Sin precio posible' : formatearPesos(sugerencia.precioSugerido)}
            </Text>
            <Text style={estilos.medio}>
                Margen resultante {formatearPorcentaje(sugerencia.margenResultante)}
                {sugerencia.posicion ? ` · ${POSICION[sugerencia.posicion]}` : ''}
            </Text>
            {sugerencia.competitivo === false && <Pastilla tono="peligro" texto="No es competitivo con tu margen objetivo." />}
            <View style={estilos.competencia}>
                <Cifra etiqueta="Mínimo competencia" valor={formatearPesos(sugerencia.minimoCompetencia)} />
                <Cifra etiqueta="Promedio" valor={formatearPesos(sugerencia.promedioCompetencia)} />
            </View>
        </View>
    )
}

function Cifra({ etiqueta, valor, detalle, alerta = false }) {
    return (
        <View style={estilos.cifra}>
            <Text style={estilos.cifraEtiqueta}>{etiqueta}</Text>
            <Text style={[estilos.valor, alerta && { color: colores.peligro }]}>{valor}</Text>
            {detalle && <Text style={tipo.nota}>{detalle}</Text>}
        </View>
    )
}

const estilos = StyleSheet.create({
    pantalla: { backgroundColor: colores.humo },
    contenido: { padding: 16, paddingBottom: 40 },
    bloque: { gap: 12 },
    cabecera: { gap: 2, paddingHorizontal: 4, marginBottom: 4 },
    tarjeta: { ...tarjeta, gap: 10 },
    destacada: { backgroundColor: colores.etiquetaSuave, borderColor: colores.etiqueta, borderWidth: 1 },
    cifras: { ...tarjeta, flexDirection: 'row', alignItems: 'flex-start' },
    separador: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colores.borde, marginHorizontal: 12 },
    cifra: { flex: 1, gap: 2 },
    cifraEtiqueta: { fontSize: 12, fontWeight: '500', color: colores.tintaSuave, letterSpacing: 0.1 },
    valor: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: colores.tinta, ...tipo.cifra },
    tituloSugerencia: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    etiquetaSugerencia: { fontSize: 13, fontWeight: '700', color: colores.tinta, textTransform: 'uppercase', letterSpacing: 0.6 },
    sugerido: { fontSize: 38, fontWeight: '800', letterSpacing: -1.2, color: colores.tinta, ...tipo.cifra },
    medio: { fontSize: 15, color: colores.tintaMedia, lineHeight: 21 },
    competencia: { flexDirection: 'row', gap: 16, marginTop: 6 },
})
