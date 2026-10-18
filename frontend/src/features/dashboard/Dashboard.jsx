import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mensajeDeError } from '@core/api/errores'
import { useAuth } from '@core/auth/useAuth'
import { listarMonitoreos, obtenerHistorico } from '@core/services/monitoreos.service'
import { listarProductos } from '@core/services/productos.service'
import Mensaje from '@shared/components/Mensaje'
import { MARKETPLACES } from '@shared/utils/marketplaces'
import { agruparPorPublicacion, armarSeries, COLOR_PROPIO, DIA, fechaHora, leer, pesos, porcentajeConSigno, RANGOS, resumir } from './tablero'
import './Dashboard.css'

// Recharts pesa: la gráfica se descarga aparte, solo cuando hay algo que dibujar
const GraficaPrecios = lazy(() => import('./GraficaPrecios'))

const DIAS_HISTORICO = 90

function useConsulta(consulta) {
    const [coincide, setCoincide] = useState(() => window.matchMedia?.(consulta).matches ?? false)
    useEffect(() => {
        const lista = window.matchMedia?.(consulta)
        if (!lista) return
        const cambiar = () => setCoincide(lista.matches)
        lista.addEventListener?.('change', cambiar)
        return () => lista.removeEventListener?.('change', cambiar)
    }, [consulta])
    return coincide
}

// Todo el histórico del producto (90 días) se trae una vez; los rangos solo recortan en el navegador
async function cargarHistorico(productoId) {
    const hasta = Date.now()
    const desde = hasta - DIAS_HISTORICO * DIA
    const monitoreos = await listarMonitoreos(productoId)
    const puntos = await Promise.all(
        monitoreos.map((m) => obtenerHistorico(m.id, { desde: new Date(desde).toISOString(), hasta: new Date(hasta).toISOString() })),
    )
    return { publicaciones: agruparPorPublicacion(puntos.flat()), hasta }
}

function Tarjeta({ titulo, valor, pie, tono, cargando }) {
    return (
        <article className="tablero-tarjeta">
            <h2>{titulo}</h2>
            {cargando ? (
                <>
                    <span className="tablero-esqueleto tablero-esqueleto-valor" />
                    <span className="tablero-esqueleto tablero-esqueleto-pie" />
                </>
            ) : (
                <>
                    <p className={`tablero-valor num${tono ? ` ${tono}` : ''}`}>{valor || '—'}</p>
                    {pie && <div className="tablero-pie">{pie}</div>}
                </>
            )}
        </article>
    )
}

function Rango({ dias, onCambiar }) {
    return (
        <div className="tablero-campo">
            <span className="tablero-etiqueta" id="rango-etiqueta">
                Rango
            </span>
            <div className="tablero-segmentos" role="radiogroup" aria-labelledby="rango-etiqueta">
                {RANGOS.map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={dias === n} className={dias === n ? 'on' : ''} onClick={() => onCambiar(n)}>
                        {n} días
                    </button>
                ))}
            </div>
        </div>
    )
}

// Lo mismo que muestra la gráfica, en tabla: una fila por día con su última captura
function TablaDatos({ filas, series }) {
    const porDia = new Map()
    for (const fila of filas) porDia.set(new Date(fila.t).toDateString(), fila)
    const dias = [...porDia.values()].reverse()
    return (
        <div className="tablero-tabla-contenedor">
            <table className="tablero-tabla">
                <caption className="sr-only">Precios por día</caption>
                <thead>
                    <tr>
                        <th scope="col">Fecha</th>
                        {series.map((s) => (
                            <th key={s.clave} scope="col" className="r">
                                {s.nombre}
                            </th>
                        ))}
                        <th scope="col" className="r">
                            Tú
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {dias.map((fila) => (
                        <tr key={fila.t}>
                            <th scope="row" className="num">
                                {fechaHora(fila.t)}
                            </th>
                            {series.map((s) => (
                                <td key={s.clave} className="r num">
                                    {fila[s.clave] === null ? 'Sin stock' : pesos(fila[s.clave])}
                                </td>
                            ))}
                            <td className="r num">{pesos(fila.propio)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function Dashboard() {
    const { usuario } = useAuth()
    const [parametros, setParametros] = useSearchParams()
    const [productos, setProductos] = useState(null)
    const [errorProductos, setErrorProductos] = useState('')
    const [historico, setHistorico] = useState({ productoId: null, estado: 'cargando', publicaciones: [], hasta: 0, error: '' })
    const [dias, setDias] = useState(30)
    const [porPublicacion, setPorPublicacion] = useState(false)
    const [ocultas, setOcultas] = useState(() => new Set())
    const compacta = useConsulta('(max-width: 760px)')
    const animar = useConsulta('(prefers-reduced-motion: no-preference)')

    useEffect(() => {
        let vigente = true
        listarProductos()
            .then((lista) => vigente && setProductos(lista))
            .catch((fallo) => vigente && setErrorProductos(mensajeDeError(fallo)))
        return () => {
            vigente = false
        }
    }, [])

    const pedido = Number(parametros.get('producto'))
    const producto = productos?.find((p) => p.id === pedido) ?? productos?.[0] ?? null
    const productoId = producto?.id ?? null

    useEffect(() => {
        if (productoId === null) return
        let vigente = true
        cargarHistorico(productoId)
            .then(({ publicaciones, hasta }) => vigente && setHistorico({ productoId, estado: 'listo', publicaciones, hasta, error: '' }))
            .catch((fallo) => vigente && setHistorico({ productoId, estado: 'error', publicaciones: [], hasta: 0, error: mensajeDeError(fallo) }))
        return () => {
            vigente = false
        }
    }, [productoId])

    const listo = historico.estado === 'listo' && historico.productoId === productoId
    const fallo = historico.estado === 'error' && historico.productoId === productoId
    const desde = historico.hasta - dias * DIA
    const resumen = useMemo(() => (listo ? resumir(historico.publicaciones, producto.precioVenta) : null), [listo, historico, producto])
    const grafica = useMemo(
        () => (listo ? armarSeries(historico.publicaciones, { desde, hasta: historico.hasta, porPublicacion, precioPropio: producto.precioVenta }) : null),
        [listo, historico, desde, porPublicacion, producto],
    )
    const lectura = listo && grafica.filas.length ? leer(historico.publicaciones, { desde, hasta: historico.hasta, dias, resumen }) : ''

    function elegirProducto(id) {
        setOcultas(new Set())
        setParametros({ producto: String(id) }, { replace: true })
    }

    function alternarSerie(clave) {
        setOcultas((actual) => {
            const siguiente = new Set(actual)
            if (siguiente.has(clave)) siguiente.delete(clave)
            else siguiente.add(clave)
            return siguiente
        })
    }

    const encabezado = (
        <header className="tablero-encabezado">
            <p className="tablero-saludo">Hola, {usuario?.nombre}</p>
            <h1>Tablero de precios</h1>
            <p className="tablero-subtitulo">Cómo se mueven los precios de tu competencia frente al tuyo</p>
        </header>
    )

    if (errorProductos) {
        return (
            <section className="tablero">
                {encabezado}
                <Mensaje tipo="error">{errorProductos}</Mensaje>
            </section>
        )
    }

    if (productos && productos.length === 0) {
        return (
            <section className="tablero">
                {encabezado}
                <div className="tablero-panel tablero-vacio">
                    <p className="tablero-vacio-titulo">Aún no tienes productos</p>
                    <p>Agrega tu primer producto y los competidores que quieres vigilar. Aquí verás cómo se mueven sus precios frente al tuyo.</p>
                    <Link to="/productos/nuevo" className="app-boton">
                        Agregar un producto
                    </Link>
                </div>
            </section>
        )
    }

    const cargando = !productos || (!listo && !fallo)
    const sinCapturas = (listo && grafica.filas.length === 0) || fallo
    const diferencia = resumen?.minimo ? resumen.diferencia : null
    const tonoDiferencia = diferencia === null ? '' : diferencia > 0 ? 'es-mas-caro' : 'es-mas-barato'
    const altoGrafica = compacta ? 260 : 360

    return (
        <section className="tablero" aria-busy={cargando}>
            {encabezado}

            <div className="tablero-controles">
                <div className="tablero-campo tablero-campo-producto">
                    <label className="tablero-etiqueta" htmlFor="tablero-producto">
                        Producto
                    </label>
                    <select id="tablero-producto" value={productoId ?? ''} disabled={!productos} onChange={(e) => elegirProducto(Number(e.target.value))}>
                        {(productos ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.nombre} — {p.sku}
                            </option>
                        ))}
                    </select>
                </div>
                <Rango dias={dias} onCambiar={setDias} />
            </div>

            {fallo && <Mensaje tipo="error">{historico.error}</Mensaje>}

            <div className="tablero-tarjetas">
                <Tarjeta
                    titulo="Mínimo de la competencia"
                    cargando={cargando}
                    valor={resumen?.minimo && pesos(resumen.minimo.precio)}
                    pie={
                        resumen?.minimo && (
                            <>
                                <span className={`mk ${MARKETPLACES[resumen.minimo.fuente].clase}`}>{MARKETPLACES[resumen.minimo.fuente].nombre}</span>
                                <span className="tablero-pie-texto">{resumen.minimo.vendedor}</span>
                            </>
                        )
                    }
                />
                <Tarjeta
                    titulo="Promedio de la competencia"
                    cargando={cargando}
                    valor={resumen?.promedio && pesos(resumen.promedio)}
                    pie={resumen?.conStock ? `${resumen.conStock} ${resumen.conStock === 1 ? 'publicación' : 'publicaciones'} con stock` : null}
                />
                <Tarjeta titulo="Mi precio" cargando={!productos} valor={producto && pesos(producto.precioVenta)} pie="Precio de venta" />
                <Tarjeta
                    titulo="Diferencia"
                    cargando={cargando}
                    tono={tonoDiferencia}
                    valor={diferencia !== null && porcentajeConSigno(diferencia)}
                    pie={diferencia === null ? null : diferencia > 0 ? 'Sobre el más barato' : diferencia < 0 ? 'Bajo el más barato' : 'Igual al más barato'}
                />
            </div>

            <section className="tablero-panel" aria-labelledby="evolucion-titulo">
                <div className="tablero-panel-cabeza">
                    <h2 id="evolucion-titulo">Evolución</h2>
                    <label className="tablero-interruptor">
                        <input type="checkbox" checked={porPublicacion} disabled={!listo || sinCapturas} onChange={(e) => setPorPublicacion(e.target.checked)} />
                        <span aria-hidden="true" />
                        Ver por publicación
                    </label>
                </div>

                {cargando ? (
                    <div className="tablero-esqueleto tablero-esqueleto-grafica" style={{ height: altoGrafica }} role="status" aria-label="Cargando la gráfica" />
                ) : sinCapturas ? (
                    <div className="tablero-sin-capturas" style={{ minHeight: compacta ? 220 : 320 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                        </svg>
                        <p>Aún no hay capturas; la primera llega en máximo 6 horas</p>
                    </div>
                ) : (
                    <>
                        <Suspense fallback={<div className="tablero-esqueleto tablero-esqueleto-grafica" style={{ height: altoGrafica }} />}>
                            <GraficaPrecios filas={grafica.filas} series={grafica.series} ocultas={ocultas} precioPropio={producto.precioVenta} compacta={compacta} animar={animar} />
                        </Suspense>
                        <ul className="tablero-leyenda" aria-label="Líneas de la gráfica">
                            {[...grafica.series, { clave: 'propio', nombre: 'Tú', color: COLOR_PROPIO }].map((s) => (
                                <li key={s.clave}>
                                    <button
                                        type="button"
                                        aria-pressed={!ocultas.has(s.clave)}
                                        onClick={() => alternarSerie(s.clave)}
                                        className={s.clave === 'propio' ? 'es-propio' : undefined}
                                        title={ocultas.has(s.clave) ? 'Mostrar en la gráfica' : 'Ocultar de la gráfica'}
                                    >
                                        <span className="tablero-muestra" style={{ '--color': s.color }} aria-hidden="true" />
                                        {s.nombre}
                                        {porPublicacion && s.detalle && s.detalle !== s.nombre && <span className="tablero-leyenda-detalle">{s.detalle}</span>}
                                    </button>
                                </li>
                            ))}
                            {grafica.ocultas > 0 && <li className="tablero-leyenda-mas">y {grafica.ocultas} más</li>}
                        </ul>
                        {lectura && <p className="tablero-lectura">{lectura}</p>}
                        <details className="tablero-datos">
                            <summary>Ver los datos en una tabla</summary>
                            <TablaDatos filas={grafica.filas} series={grafica.series} />
                        </details>
                    </>
                )}
            </section>
        </section>
    )
}
