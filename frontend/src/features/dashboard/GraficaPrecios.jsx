import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLOR_PROPIO, escalaPrecios, fechaCorta, fechaHora, marcasDeFechas, pesos, pesosCortos } from './tablero'

const TINTA_SUAVE = '#86868b'
const REJILLA = 'rgba(0, 0, 0, 0.06)'

// Tooltip propio: fecha con hora y, de menor a mayor, cada línea con su precio; "Tú" marcado
function Detalle({ active, payload, label, series }) {
    if (!active || !payload?.length) return null
    const nombres = Object.fromEntries(series.map((s) => [s.clave, s]))
    const filas = payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => ({ clave: p.dataKey, valor: p.value, color: p.dataKey === 'propio' ? COLOR_PROPIO : nombres[p.dataKey]?.color, nombre: p.dataKey === 'propio' ? 'Tú' : nombres[p.dataKey]?.nombre }))
        .sort((a, b) => a.valor - b.valor)
    return (
        <div className="tablero-detalle">
            <p className="tablero-detalle-fecha">{fechaHora(label)}</p>
            <ul>
                {filas.map((f) => (
                    <li key={f.clave} className={f.clave === 'propio' ? 'es-propio' : undefined}>
                        <span className="tablero-punto" style={{ background: f.color }} aria-hidden="true" />
                        <span className="tablero-detalle-nombre">{f.nombre}</span>
                        <span className="num">{pesos(f.valor)}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// Recharts parte el texto del eje en dos líneas cuando no cabe; un <text> propio no se parte nunca
function MarcaPrecio({ x, y, payload }) {
    return (
        <text x={x} y={y} dy={4} textAnchor="end" fill={TINTA_SUAVE} fontSize={11}>
            {pesosCortos(payload.value)}
        </text>
    )
}

// "Tú" al final de la línea punteada: la única etiqueta directa, para no llenar la gráfica de números
function EtiquetaPropia({ viewBox }) {
    if (!viewBox) return null
    return (
        <text x={viewBox.x + viewBox.width + 6} y={viewBox.y + 4} className="tablero-etiqueta-tu">
            Tú
        </text>
    )
}

export default function GraficaPrecios({ filas, series, ocultas, precioPropio, compacta, animar }) {
    const visibles = series.filter((s) => !ocultas.has(s.clave))
    const valores = filas.flatMap((f) => visibles.map((s) => f[s.clave])).concat(ocultas.has('propio') ? [] : [precioPropio])
    const { dominio, marcas } = escalaPrecios(valores)
    const fechas = marcasDeFechas(filas, compacta ? 4 : 8)
    const fin = filas.length ? filas[filas.length - 1].t : 0

    return (
        <div className="tablero-grafica" style={{ height: compacta ? 260 : 360 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filas} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={REJILLA} vertical={false} />
                    <XAxis
                        dataKey="t"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        ticks={fechas}
                        tickFormatter={fechaCorta}
                        tick={{ fill: TINTA_SUAVE, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: REJILLA }}
                        minTickGap={12}
                    />
                    <YAxis
                        domain={dominio}
                        ticks={marcas}
                        tick={<MarcaPrecio />}
                        tickLine={false}
                        axisLine={false}
                        width={compacta ? 64 : 74}
                        allowDataOverflow
                    />
                    <Tooltip
                        content={<Detalle series={series} />}
                        cursor={{ stroke: 'rgba(0, 0, 0, 0.25)', strokeWidth: 1 }}
                        isAnimationActive={false}
                    />
                    {visibles.map((s) => (
                        <Line
                            key={s.clave}
                            type="linear"
                            dataKey={s.clave}
                            name={s.nombre}
                            stroke={s.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                            connectNulls={false}
                            isAnimationActive={animar}
                            animationDuration={280}
                            animationEasing="ease-out"
                        />
                    ))}
                    {!ocultas.has('propio') && (
                        <Line
                            type="linear"
                            dataKey="propio"
                            name="Tú"
                            stroke={COLOR_PROPIO}
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff', fill: COLOR_PROPIO }}
                            isAnimationActive={false}
                            label={(props) => (props.payload?.t === fin || props.index === filas.length - 1 ? <EtiquetaPropia key="tu" viewBox={{ x: props.x - 1, y: props.y, width: 0 }} /> : null)}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
