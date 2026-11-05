import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { formatearFecha, formatearPesos, formatearPorcentaje } from '@/core/formato'
import { Aparecer } from '@/core/movimiento'
import { marcarAlertaLeida, obtenerAlerta } from '@/core/services/api'
import {
    Boton,
    Cargando,
    Cifra,
    ErrorConReintento,
    FilaDeCifras,
    Pastilla,
    Tarjeta,
    colores,
    espacio,
    tipo,
} from '@/core/ui'
import { useCarga } from '@/core/useCarga'
import { QUE_PASO } from './AlertasScreen'

const DECISION = {
    ACEPTAR: 'Aceptaste el precio sugerido',
    AJUSTAR: 'Ajustaste el precio',
    DESCARTAR: 'Descartaste la alerta',
}

// Abrir una alerta nueva la marca como leída, igual que en la bandeja web (baja el contador)
async function cargarAlerta(id) {
    const alerta = await obtenerAlerta(id)
    return alerta.estado === 'NUEVA' ? marcarAlertaLeida(id) : alerta
}

// "$159.900 → $149.900" al aceptar o ajustar; el motivo al descartar
function detalleDecision(decision) {
    if (decision.accion === 'DESCARTAR') return decision.motivo ? `Motivo: ${decision.motivo}` : null
    return `${formatearPesos(decision.precioAnterior)} → ${formatearPesos(decision.precioFinal)}`
}

const variacion = (pct) => `${pct > 0 ? '+' : ''}${formatearPorcentaje(pct)}`

/**
 * Detalle de una alerta (SCRUM-52): lo abre tocar la notificación push o una fila de la pestaña Alertas. Sigue la misma
 * estructura que el detalle del producto: título, fila de cifras, precio sugerido y contexto. Sin decoración: la
 * jerarquía sale de la tipografía.
 */
export default function AlertaDetalleScreen() {
    const { id } = useLocalSearchParams()
    const router = useRouter()
    const cargar = useCallback(() => cargarAlerta(id), [id])
    const { datos: alerta, error, cargando, refrescando, recargar, refrescar } = useCarga(cargar)

    if (cargando) return <Cargando texto="Cargando alerta…" />
    if (error && !alerta) return <ErrorConReintento mensaje={error} onReintentar={recargar} />

    const paso = QUE_PASO[alerta.tipo] ?? { texto: alerta.tipo }
    const hayPrecios = alerta.precioAnterior !== null && alerta.precioNuevo !== null
    const cerrada = alerta.estado === 'CERRADA'

    return (
        <ScrollView
            style={estilos.pantalla}
            contentContainerStyle={estilos.contenido}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colores.tinta} />}
        >
            <Aparecer style={estilos.bloque}>
                <View style={estilos.cabecera}>
                    <Text style={tipo.titulo} accessibilityRole="header">
                        {paso.texto}
                    </Text>
                    <Text style={tipo.nota}>
                        {alerta.productoNombre} · {formatearFecha(alerta.creadoEn)}
                    </Text>
                    <View style={estilos.etiquetas}>
                        {alerta.relevancia === 'ALTA' && <Pastilla tono="contorno" texto="Alta" />}
                        <Pastilla tono={cerrada ? 'neutro' : 'oscuro'} texto={cerrada ? 'Cerrada' : 'Abierta'} />
                    </View>
                </View>

                {hayPrecios && (
                    <FilaDeCifras>
                        <Cifra etiqueta="Antes" valor={formatearPesos(alerta.precioAnterior)} />
                        <Cifra
                            etiqueta="Ahora"
                            valor={formatearPesos(alerta.precioNuevo)}
                            detalle={alerta.variacionPct === null ? null : variacion(alerta.variacionPct)}
                        />
                        <Cifra
                            etiqueta="Tu precio"
                            valor={formatearPesos(alerta.precioVentaActual)}
                            detalle={`margen ${formatearPorcentaje(alerta.margenActual)}`}
                        />
                    </FilaDeCifras>
                )}

                <Tarjeta>
                    <Cifra
                        etiqueta="Precio sugerido"
                        valor={alerta.precioSugerido === null ? 'Sin sugerencia' : formatearPesos(alerta.precioSugerido)}
                        detalle={
                            alerta.margenSugerido === null || alerta.margenSugerido === undefined
                                ? null
                                : `Margen ${formatearPorcentaje(alerta.margenSugerido)} · objetivo ${formatearPorcentaje(alerta.margenObjetivo)}`
                        }
                    />
                </Tarjeta>

                <Tarjeta>
                    <Cifra etiqueta="Competidor" valor={alerta.competidor} detalle={alerta.tituloPublicacion} />
                </Tarjeta>

                {alerta.decision && (
                    <Tarjeta accessibilityRole="summary">
                        <Cifra etiqueta="Decisión" valor={DECISION[alerta.decision.accion]} detalle={detalleDecision(alerta.decision)} />
                    </Tarjeta>
                )}

                <View style={estilos.acciones}>
                    <Boton titulo="Ver producto" variante="claro" onPress={() => router.push(`/producto/${alerta.productoId}`)} />
                    {!cerrada && (
                        <Text style={[tipo.nota, estilos.centrado]}>Para aceptar o ajustar el precio, abre la alerta en la web.</Text>
                    )}
                </View>
            </Aparecer>
        </ScrollView>
    )
}

const estilos = StyleSheet.create({
    pantalla: { backgroundColor: colores.humo },
    contenido: { padding: espacio.l, paddingBottom: 40 },
    bloque: { gap: espacio.m },
    // Igual que la cabecera del detalle del producto
    cabecera: { gap: 2, paddingHorizontal: espacio.xs, marginBottom: espacio.xs },
    etiquetas: { flexDirection: 'row', gap: 6, marginTop: espacio.s },
    acciones: { gap: espacio.s, marginTop: espacio.xs },
    centrado: { textAlign: 'center' },
})
