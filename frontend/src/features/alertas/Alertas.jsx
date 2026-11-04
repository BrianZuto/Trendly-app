import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mensajeDeError } from '@core/api/errores'
import { avisarCambioDeAlertas, decidirAlerta, listarAlertas, marcarAlertaLeida } from '@core/services/alertas.service'
import { obtenerHistorico } from '@core/services/monitoreos.service'
import { formatearPesos, formatearPorcentaje } from '@features/productos/formato'
import './Alertas.css'

const ESTADOS = [
    { id: '', texto: 'Todas' },
    { id: 'NUEVA', texto: 'Nuevas' },
    { id: 'LEIDA', texto: 'Leídas' },
    { id: 'CERRADA', texto: 'Cerradas' },
]
const RELEVANCIAS = [
    { id: '', texto: 'Cualquier relevancia' },
    { id: 'ALTA', texto: 'Alta' },
    { id: 'NORMAL', texto: 'Normal' },
]
const QUE_PASO = {
    BAJA_PRECIO: 'Bajó de precio',
    SUBIDA_PRECIO: 'Subió de precio',
    AGOTADO: 'Se agotó',
    DISPONIBLE: 'Volvió a estar disponible',
}
const DECISION = {
    ACEPTAR: 'Aceptaste el precio sugerido',
    AJUSTAR: 'Ajustaste el precio',
    DESCARTAR: 'Descartaste la alerta',
}
const DIAS_GRAFICA = 30

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const cuando = (iso) => fecha.format(new Date(iso))
const variacion = (pct) => (pct === null || pct === undefined ? '' : `${pct > 0 ? '+' : ''}${formatearPorcentaje(pct)}`)

export default function Alertas() {
    const [estado, setEstado] = useState('')
    const [relevancia, setRelevancia] = useState('')
    const [alertas, setAlertas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [elegidaId, setElegidaId] = useState(null)

    useEffect(() => {
        let vigente = true
        listarAlertas({ estado, relevancia })
            .then((lista) => vigente && setAlertas(lista))
            .catch((e) => vigente && setError(mensajeDeError(e)))
            .finally(() => vigente && setCargando(false))
        return () => {
            vigente = false
        }
    }, [estado, relevancia])

    // Cambiar un filtro vuelve a pedir la lista
    function filtrar(cambio) {
        setCargando(true)
        setError('')
        cambio()
    }

    const reemplazar = useCallback((actualizada) => {
        setAlertas((lista) => lista.map((a) => (a.id === actualizada.id ? actualizada : a)))
        avisarCambioDeAlertas()
    }, [])

    async function abrir(alerta) {
        setElegidaId(alerta.id)
        if (alerta.estado !== 'NUEVA') return
        try {
            reemplazar(await marcarAlertaLeida(alerta.id))
        } catch {
            // Si no se pudo marcar, la alerta sigue contando como nueva; no bloquea la decisión
        }
    }

    const elegida = alertas.find((a) => a.id === elegidaId) ?? null

    return (
        <section className="bandeja" aria-labelledby="bandeja-titulo">
            <header className="bandeja-cabecera">
                <h1 id="bandeja-titulo">Alertas</h1>
                <p>Los cambios de tu competencia que superaron tu umbral. Decide en cada una si cambias tu precio.</p>
            </header>

            <div className="bandeja-filtros">
                <div className="bandeja-chips" role="group" aria-label="Filtrar por estado">
                    {ESTADOS.map(({ id, texto }) => (
                        <button key={texto} type="button" className={estado === id ? 'bandeja-chip on' : 'bandeja-chip'} aria-pressed={estado === id} onClick={() => estado !== id && filtrar(() => setEstado(id))}>
                            {texto}
                        </button>
                    ))}
                </div>
                <label className="bandeja-select">
                    Relevancia
                    <select value={relevancia} onChange={(e) => filtrar(() => setRelevancia(e.target.value))}>
                        {RELEVANCIAS.map(({ id, texto }) => (
                            <option key={texto} value={id}>
                                {texto}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {error && (
                <p className="bandeja-error" role="alert">
                    {error}
                </p>
            )}

            <div className="bandeja-cuerpo">
                <div className="bandeja-lista">
                    {cargando && <p className="bandeja-vacia">Cargando alertas…</p>}
                    {!cargando && !error && alertas.length === 0 && <p className="bandeja-vacia">No hay alertas con estos filtros.</p>}
                    {!cargando && alertas.length > 0 && (
                        <ul aria-label="Alertas">
                            {alertas.map((alerta) => (
                                <li key={alerta.id}>
                                    <FilaAlerta alerta={alerta} activa={alerta.id === elegidaId} onAbrir={() => abrir(alerta)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="bandeja-detalle">
                    {elegida ? (
                        <DetalleAlerta key={elegida.id} alerta={elegida} onDecidida={reemplazar} />
                    ) : (
                        <p className="bandeja-vacia">Elige una alerta para ver el detalle y decidir tu precio.</p>
                    )}
                </div>
            </div>
        </section>
    )
}

function FilaAlerta({ alerta, activa, onAbrir }) {
    const baja = alerta.tipo === 'BAJA_PRECIO'
    return (
        <button type="button" className={activa ? 'bandeja-fila activa' : 'bandeja-fila'} aria-current={activa || undefined} onClick={onAbrir}>
            <span className="bandeja-fila-arriba">
                {alerta.estado === 'NUEVA' && <span className="bandeja-punto" aria-label="Nueva" />}
                <strong>{QUE_PASO[alerta.tipo]}</strong>
                {alerta.relevancia === 'ALTA' && <span className="bandeja-alta">Alta</span>}
                {alerta.estado === 'CERRADA' && <span className="bandeja-cerrada">Cerrada</span>}
            </span>
            <span className="bandeja-fila-producto">{alerta.productoNombre}</span>
            <span className="bandeja-fila-abajo">
                <span>{alerta.competidor}</span>
                {alerta.precioNuevo !== null && (
                    <span className={baja ? 'num baja' : 'num'}>
                        {formatearPesos(alerta.precioNuevo)} {variacion(alerta.variacionPct)}
                    </span>
                )}
            </span>
            <time className="bandeja-fecha" dateTime={alerta.creadoEn}>
                {cuando(alerta.creadoEn)}
            </time>
        </button>
    )
}

function DetalleAlerta({ alerta, onDecidida }) {
    const [modo, setModo] = useState(null) // null | 'AJUSTAR' | 'DESCARTAR'
    const [precio, setPrecio] = useState(alerta.precioSugerido ?? alerta.precioVentaActual)
    const [motivo, setMotivo] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [error, setError] = useState('')
    const cerrada = alerta.estado === 'CERRADA'

    async function decidir(decision) {
        setEnviando(true)
        setError('')
        try {
            onDecidida(await decidirAlerta(alerta.id, decision))
            setModo(null)
        } catch (e) {
            setError(mensajeDeError(e))
        } finally {
            setEnviando(false)
        }
    }

    function enviarAjuste(evento) {
        evento.preventDefault()
        if (!(Number(precio) > 0)) return setError('Escribe el precio final, mayor que cero')
        decidir({ accion: 'AJUSTAR', precioFinal: Number(precio) })
    }

    function enviarDescarte(evento) {
        evento.preventDefault()
        if (!motivo.trim()) return setError('Escribe el motivo para descartar la alerta')
        decidir({ accion: 'DESCARTAR', motivo: motivo.trim() })
    }

    return (
        <article className="bandeja-hoja" aria-labelledby="detalle-titulo">
            <p className="bandeja-que">
                {QUE_PASO[alerta.tipo]}
                {alerta.relevancia === 'ALTA' && <span className="bandeja-alta">Relevancia alta</span>}
            </p>
            <h2 id="detalle-titulo">
                <Link to={`/productos/${alerta.productoId}`}>{alerta.productoNombre}</Link>
            </h2>
            <p className="bandeja-competidor">
                {alerta.competidor}
                {alerta.tituloPublicacion && <span> · {alerta.tituloPublicacion}</span>}
            </p>

            <dl className="bandeja-cifras">
                <div>
                    <dt>Precio anterior</dt>
                    <dd className="num">{alerta.precioAnterior === null ? '—' : formatearPesos(alerta.precioAnterior)}</dd>
                </div>
                <div>
                    <dt>Precio nuevo</dt>
                    <dd className="num">{alerta.precioNuevo === null ? '—' : formatearPesos(alerta.precioNuevo)}</dd>
                </div>
                <div>
                    <dt>Variación</dt>
                    <dd className="num">{variacion(alerta.variacionPct) || '—'}</dd>
                </div>
            </dl>

            <MiniGrafica monitoreoId={alerta.monitoreoId} publicacionId={alerta.publicacionId} />

            <dl className="bandeja-cifras bandeja-precios">
                <div>
                    <dt>Tu precio actual</dt>
                    <dd className="num">{formatearPesos(alerta.precioVentaActual)}</dd>
                    <dd className="bandeja-margen">Margen {formatearPorcentaje(alerta.margenActual)}</dd>
                </div>
                <div className="bandeja-sugerido">
                    <dt>Precio sugerido</dt>
                    <dd className="num">{alerta.precioSugerido ? formatearPesos(alerta.precioSugerido) : 'Sin sugerencia'}</dd>
                    {alerta.margenSugerido !== null && (
                        <dd className="bandeja-margen">
                            Margen {formatearPorcentaje(alerta.margenSugerido)} · objetivo {formatearPorcentaje(alerta.margenObjetivo)}
                        </dd>
                    )}
                </div>
            </dl>

            {cerrada ? (
                <Decision decision={alerta.decision} />
            ) : (
                <div className="bandeja-acciones">
                    <div className="bandeja-botones">
                        <button
                            type="button"
                            className="app-boton"
                            disabled={enviando || !alerta.precioSugerido}
                            title={alerta.precioSugerido ? undefined : 'Esta alerta no tiene precio sugerido'}
                            onClick={() => decidir({ accion: 'ACEPTAR' })}
                        >
                            Aceptar sugerido
                        </button>
                        <button type="button" className="app-boton app-boton-claro" aria-expanded={modo === 'AJUSTAR'} disabled={enviando} onClick={() => setModo(modo === 'AJUSTAR' ? null : 'AJUSTAR')}>
                            Ajustar precio
                        </button>
                        <button type="button" className="app-boton app-boton-claro" aria-expanded={modo === 'DESCARTAR'} disabled={enviando} onClick={() => setModo(modo === 'DESCARTAR' ? null : 'DESCARTAR')}>
                            Descartar
                        </button>
                    </div>

                    {modo === 'AJUSTAR' && (
                        <form className="bandeja-form" onSubmit={enviarAjuste}>
                            <label>
                                Precio final
                                <input type="number" min="1" step="any" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
                            </label>
                            <button type="submit" className="app-boton" disabled={enviando}>
                                Guardar precio
                            </button>
                        </form>
                    )}

                    {modo === 'DESCARTAR' && (
                        <form className="bandeja-form" onSubmit={enviarDescarte}>
                            <label>
                                Motivo
                                <textarea rows="3" maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: es una oferta de un vendedor sin reputación" />
                            </label>
                            <button type="submit" className="app-boton" disabled={enviando}>
                                Descartar alerta
                            </button>
                        </form>
                    )}

                    {error && (
                        <p className="bandeja-error" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </article>
    )
}

function Decision({ decision }) {
    if (!decision) return <p className="bandeja-decision">Esta alerta está cerrada.</p>
    return (
        <div className="bandeja-decision" role="status">
            <strong>{DECISION[decision.accion]}</strong>
            {decision.precioFinal !== null && (
                <span className="num">
                    {formatearPesos(decision.precioAnterior)} → {formatearPesos(decision.precioFinal)}
                </span>
            )}
            {decision.motivo && <span>Motivo: {decision.motivo}</span>}
            <time dateTime={decision.decididoEn}>{cuando(decision.decididoEn)}</time>
        </div>
    )
}

// Precio de la publicación en los últimos 30 días, sin ejes: solo la forma y los extremos
function MiniGrafica({ monitoreoId, publicacionId }) {
    const [puntos, setPuntos] = useState(null)

    useEffect(() => {
        if (!monitoreoId) return undefined
        let vigente = true
        const desde = new Date(Date.now() - DIAS_GRAFICA * 86400000).toISOString()
        obtenerHistorico(monitoreoId, { desde })
            .then((lista) => vigente && setPuntos(lista.filter((p) => !publicacionId || p.idPublicacion === publicacionId)))
            .catch(() => vigente && setPuntos([]))
        return () => {
            vigente = false
        }
    }, [monitoreoId, publicacionId])

    if (!monitoreoId || !puntos || puntos.length < 2) return null
    const precios = puntos.map((p) => p.precioCop)
    const min = Math.min(...precios)
    const max = Math.max(...precios)
    const alto = 48
    const ancho = 240
    const y = (precio) => (max === min ? alto / 2 : alto - ((precio - min) / (max - min)) * (alto - 6) - 3)
    const linea = precios.map((precio, i) => `${(i / (precios.length - 1)) * ancho},${y(precio)}`).join(' ')
    const descripcion = `Precio del competidor en los últimos ${DIAS_GRAFICA} días: entre ${formatearPesos(min)} y ${formatearPesos(max)}`

    return (
        <figure className="bandeja-grafica">
            <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" role="img" aria-label={descripcion}>
                <polyline points={linea} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </svg>
            <figcaption>
                <span>Últimos {DIAS_GRAFICA} días</span>
                <span className="num">
                    {formatearPesos(min)} – {formatearPesos(max)}
                </span>
            </figcaption>
        </figure>
    )
}
