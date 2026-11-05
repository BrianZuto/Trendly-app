import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { formatearPesos, formatearPorcentaje } from '@/core/formato'
import { Aparecer } from '@/core/movimiento'
import { listarMonitoreos, obtenerHistorico, obtenerProducto, obtenerSugerencia } from '@/core/services/api'
import { Cargando, Cifra, ErrorConReintento, FilaDeCifras, Pastilla, Tarjeta, colores, espacio, tipo } from '@/core/ui'
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

                <FilaDeCifras>
                    <Cifra etiqueta="Tu precio" valor={formatearPesos(producto.precioVenta)} />
                    <Cifra etiqueta="Costo" valor={formatearPesos(producto.costo)} />
                    <Cifra
                        etiqueta="Margen"
                        valor={formatearPorcentaje(producto.margenActual)}
                        detalle={`objetivo ${formatearPorcentaje(producto.margenObjetivo)}${bajoObjetivo ? ' · por debajo' : ''}`}
                    />
                </FilaDeCifras>

                <Sugerencia sugerencia={sugerencia} />

                <Tarjeta>
                    <Text style={tipo.etiqueta} accessibilityRole="header">
                        Histórico de precios · {DIAS_GRAFICA} días
                    </Text>
                    {monitoreos === 0 ? (
                        <Text style={tipo.nota}>Este producto no tiene competidores vigilados. Agrégalos desde la web.</Text>
                    ) : (
                        <GraficaHistorico serie={serie} precioVenta={Number(producto.precioVenta)} />
                    )}
                </Tarjeta>
            </Aparecer>
        </ScrollView>
    )
}

// La recomendación es lo que el vendedor viene a buscar: va arriba y se destaca solo por el tamaño del precio
function Sugerencia({ sugerencia }) {
    if (!sugerencia || sugerencia.estado === 'PENDIENTE') {
        return (
            <Tarjeta>
                <Cifra
                    etiqueta="Precio sugerido"
                    valor={sugerencia ? 'Pendiente' : 'Sin datos'}
                    detalle={
                        sugerencia
                            ? 'Hacen falta al menos 2 capturas de la competencia en los últimos 7 días.'
                            : 'No se pudo consultar el precio sugerido.'
                    }
                />
            </Tarjeta>
        )
    }
    return (
        <Tarjeta>
            <Cifra
                etiqueta="Precio sugerido"
                valor={sugerencia.precioSugerido === null ? 'Sin precio posible' : formatearPesos(sugerencia.precioSugerido)}
                detalle={`Margen resultante ${formatearPorcentaje(sugerencia.margenResultante)}${
                    sugerencia.posicion ? ` · ${POSICION[sugerencia.posicion]}` : ''
                }`}
            />
            {sugerencia.competitivo === false && <Pastilla tono="contorno" texto="No es competitivo con tu margen objetivo" />}
            <View style={estilos.competencia}>
                <Cifra etiqueta="Mínimo competencia" valor={formatearPesos(sugerencia.minimoCompetencia)} />
                <Cifra etiqueta="Promedio" valor={formatearPesos(sugerencia.promedioCompetencia)} />
            </View>
        </Tarjeta>
    )
}

const estilos = StyleSheet.create({
    pantalla: { backgroundColor: colores.humo },
    contenido: { padding: espacio.l, paddingBottom: 40 },
    bloque: { gap: espacio.m },
    cabecera: { gap: 2, paddingHorizontal: espacio.xs, marginBottom: espacio.xs },
    competencia: { flexDirection: 'row', gap: espacio.l, marginTop: espacio.xs },
})
