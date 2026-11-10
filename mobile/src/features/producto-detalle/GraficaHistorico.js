import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'
import { formatearFecha, formatearPesos } from '@/core/formato'
import { colores, tipo } from '@/core/ui'
import { DIAS_GRAFICA } from './historico'

const SECCIONES = 4

// Precio más bajo de la competencia por día frente al precio de venta del vendedor
export default function GraficaHistorico({ serie, precioVenta }) {
    const { width } = useWindowDimensions()

    if (serie.length < 2) {
        return (
            <Text style={estilos.vacio}>
                Todavía no hay suficientes capturas de la competencia para dibujar la gráfica.
            </Text>
        )
    }

    const precios = serie.map((p) => p.precio)
    // El eje arranca un poco debajo del menor valor para que la variación se note
    const piso = Math.floor((Math.min(...precios, precioVenta) * 0.95) / 1000) * 1000
    // La librería calcula el techo solo con la primera serie: se fija a mano para que la línea de tu precio no quede por fuera
    const paso = Math.ceil((Math.max(...precios, precioVenta) * 1.03 - piso) / SECCIONES / 1000) * 1000
    const cadaCuanto = Math.ceil(serie.length / 5)
    // Etiquetas corridas media separación para que ni la primera ni la última queden cortadas en el borde
    const conEtiqueta = (i) => i % cadaCuanto === Math.floor(cadaCuanto / 2)
    const ancho = width - 32 - 32 - 56
    const descripcion =
        `Precio más bajo de la competencia en los últimos ${DIAS_GRAFICA} días: entre ${formatearPesos(Math.min(...precios))} ` +
        `y ${formatearPesos(Math.max(...precios))}. Tu precio: ${formatearPesos(precioVenta)}.`

    return (
        <View accessible accessibilityRole="image" accessibilityLabel={descripcion} style={estilos.contenedor}>
            <LineChart
                data={serie.map((p, i) => ({
                    value: p.precio,
                    labelComponent: conEtiqueta(i) ? () => <EtiquetaFecha texto={formatearFecha(p.fecha)} /> : undefined,
                }))}
                data2={serie.map(() => ({ value: precioVenta }))}
                width={ancho}
                height={180}
                spacing={serie.length > 1 ? ancho / (serie.length - 1) : ancho}
                initialSpacing={0}
                endSpacing={0}
                color1={colores.tinta}
                color2={colores.tintaTenue}
                thickness1={2}
                thickness2={2}
                strokeDashArray2={[6, 4]}
                hideDataPoints
                yAxisOffset={piso}
                maxValue={paso * SECCIONES}
                stepValue={paso}
                noOfSections={SECCIONES}
                formatYLabel={(valor) => `${Math.round(Number(valor) / 1000)}k`}
                yAxisTextStyle={estilos.eje}
                xAxisLabelTextStyle={estilos.eje}
                yAxisColor="transparent"
                xAxisColor={colores.borde}
                rulesColor={colores.borde}
                disableScroll
                adjustToWidth
            />
            <View style={estilos.leyenda}>
                <Leyenda color={colores.tinta} texto="Competencia (mínimo del día)" />
                <Leyenda color={colores.tintaTenue} texto="Tu precio" />
            </View>
        </View>
    )
}

// El contenedor de cada etiqueta mide lo mismo que la separación entre días (pocos píxeles): el texto se centra y sobresale
function EtiquetaFecha({ texto }) {
    return (
        <View style={estilos.etiquetaFecha}>
            <Text style={[estilos.eje, estilos.etiquetaTexto]} numberOfLines={1}>
                {texto}
            </Text>
        </View>
    )
}

function Leyenda({ color, texto }) {
    return (
        <View style={estilos.leyendaItem}>
            <View style={[estilos.muestra, { backgroundColor: color }]} />
            <Text style={estilos.leyendaTexto}>{texto}</Text>
        </View>
    )
}

const estilos = StyleSheet.create({
    contenedor: { gap: 12, overflow: 'hidden' },
    vacio: tipo.nota,
    eje: { ...tipo.mini, fontWeight: '400' },
    etiquetaFecha: { alignItems: 'center', overflow: 'visible' },
    etiquetaTexto: { width: 56, textAlign: 'center' },
    leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    muestra: { width: 14, height: 3, borderRadius: 2 },
    leyendaTexto: tipo.nota,
})
