import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { TRM } from '@features/productos/formato'
import { cuando, filasDe, MARKETPLACES, pesos, variacion } from './util'

gsap.registerPlugin(useGSAP)

const DIA = 86400000
// Con más filas que esto se muestran las primeras y el resto queda a un clic
const VISIBLES = 10

const porcentaje = (valor) => `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${Math.abs(valor).toLocaleString('es-CO')}%`
const dolares = (valor) => `US$${valor.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const listaY = (nombres) => nombres.join(', ').replace(/, ([^,]*)$/, ' y $1')

// Cambio frente al precio de hace 7 días, con los puntos de esos días
function tramoSieteDias(historial) {
    const desde = Date.parse(historial[historial.length - 1].fecha) - 7 * DIA
    const tramo = historial.filter((h) => Date.parse(h.fecha) >= desde - DIA / 2)
    const puntos = tramo.length > 1 ? tramo : historial.slice(-2)
    return { puntos, cambio: variacion(puntos[0].precio, puntos[puntos.length - 1].precio) }
}

function SieteDias({ historial }) {
    const { puntos, cambio } = tramoSieteDias(historial)
    const precios = puntos.map((p) => p.precio)
    const menor = Math.min(...precios)
    const rango = Math.max(...precios) - menor || 1
    const camino = puntos
        .map((p, i) => `${i ? 'L' : 'M'}${((i / (puntos.length - 1)) * 56).toFixed(1)} ${(18 - ((p.precio - menor) / rango) * 16).toFixed(1)}`)
        .join(' ')
    const clase = cambio < 0 ? 'baja' : cambio > 0 ? 'sube' : 'igual'
    return (
        <span className={`siete ${clase}`}>
            <svg className="spark" viewBox="0 0 56 20" aria-hidden="true">
                <path d={camino} />
            </svg>
            <span className="num">{porcentaje(cambio)}</span>
        </span>
    )
}

// El precio cuenta hasta el nuevo valor y deja una flecha: así se ve que acaba de moverse
function Precio({ pub, cambio, propio }) {
    const ref = useRef(null)
    // Amazon publica en dólares: se muestra en dólares con su equivalente en pesos
    const enUsd = pub.precioUsd !== null
    const formatear = (v) => (enUsd ? dolares(Math.round(v) / 100) : pesos(Math.round(v / 100) * 100))
    const valor = enUsd ? Math.round(pub.precioUsd * 100) : pub.precio
    const frente = pub.precio - propio

    useGSAP(
        () => {
            if (!cambio) return
            const mm = gsap.matchMedia()
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                const antes = enUsd ? Math.round((cambio.antes / cambio.ahora) * valor) : cambio.antes
                const contador = { v: antes }
                const texto = ref.current.querySelector('strong')
                gsap.to(contador, { v: valor, duration: 0.9, ease: 'power3.out', onUpdate: () => (texto.textContent = formatear(contador.v)) })
            })
            return () => mm.revert()
        },
        { scope: ref, dependencies: [cambio?.vez], revertOnUpdate: true },
    )

    const baja = cambio && cambio.ahora < cambio.antes
    return (
        <span className="precio-vivo" ref={ref}>
            {cambio && (
                <span className={`flecha ${baja ? 'baja' : 'sube'}`} aria-label={baja ? 'Bajó' : 'Subió'}>
                    {baja ? '↓' : '↑'}
                </span>
            )}
            <strong className="num">{formatear(valor)}</strong>
            <span className={`frente num ${frente < 0 ? 'mas-barato' : frente > 0 ? 'mas-caro' : ''}`}>
                {frente === 0 ? 'Igual que tú' : `${pesos(Math.abs(frente))} ${frente < 0 ? 'menos' : 'más'} que tú`}
            </span>
        </span>
    )
}

function Movimiento({ movimiento }) {
    const ref = useRef(null)
    useGSAP(
        () => {
            const mm = gsap.matchMedia()
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.from(ref.current, { y: 8, autoAlpha: 0, duration: 0.3, ease: 'power3.out' })
            })
        },
        { scope: ref },
    )
    const baja = movimiento.ahora < movimiento.antes
    return (
        <p className="movimiento" ref={ref} role="status">
            <span className="en-vivo">En vivo</span>
            <span>
                <strong>{movimiento.vendedor}</strong> {baja ? 'bajó' : 'subió'} de <span className="num">{pesos(movimiento.antes)}</span> a{' '}
                <span className="num">{pesos(movimiento.ahora)}</span>{' '}
                <strong className={`num ${baja ? 'baja' : 'sube'}`}>{porcentaje(variacion(movimiento.antes, movimiento.ahora))}</strong>
            </span>
        </p>
    )
}

const IconoPausa = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
)
const IconoReanudar = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
)
const IconoBasura = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
)

// Cómo llegó la publicación: por su URL o por su puesto en la búsqueda
function origenDe(m, pub) {
    if (m.tipo === 'URL') return 'Por URL'
    return pub ? `Puesto ${pub.posicion} de ${m.topN}` : `Primeros ${m.topN} de "${m.valor}"`
}

function EstadoFila({ m, pub }) {
    if (m.estado === 'ERROR') {
        return (
            <>
                <span className="estado estado-error">Error</span>
                {m.motivo && <span className="mini estado-motivo">{m.motivo}</span>}
            </>
        )
    }
    if (m.estado === 'PAUSADO') return <span className="estado estado-pausado">Pausado</span>
    if (!pub) return <span className="mini">Primera captura en camino</span>
    return (
        <>
            <span className={`stock ${pub.disponible ? '' : 'sin-stock'}`}>{pub.disponible ? 'Disponible' : 'Sin stock'}</span>
            <span className="mini num">{cuando(m.ultimaCaptura)}</span>
        </>
    )
}

const ORDENES = {
    precio: (a, b) => (a.pub?.precio ?? Infinity) - (b.pub?.precio ?? Infinity),
    cambio: (a, b) => (a.pub ? tramoSieteDias(a.pub.historial).cambio : Infinity) - (b.pub ? tramoSieteDias(b.pub.historial).cambio : Infinity),
}

function Encabezado({ campo, orden, onOrdenar, children }) {
    const activo = orden.campo === campo
    const dir = activo ? orden.dir : null
    return (
        <th scope="col" className="r" aria-sort={activo ? (dir === 1 ? 'ascending' : 'descending') : 'none'}>
            <button type="button" className={`orden${activo ? ' on' : ''}`} onClick={() => onOrdenar(campo)}>
                {children}
                <svg viewBox="0 0 10 14" aria-hidden="true" className={dir === -1 ? 'desc' : ''}>
                    <path d="M5 1 9 6H1z" className="arriba" />
                    <path d="M5 13 1 8h8z" className="abajo" />
                </svg>
            </button>
        </th>
    )
}

export default function Competidores({ monitoreos, precioPropio, cambios, llegadas, movimiento, ocupado, onAgregar, onAlternar, onEliminar }) {
    const ref = useRef(null)
    const [sitio, setSitio] = useState('TODOS')
    const [soloStock, setSoloStock] = useState(false)
    const [orden, setOrden] = useState({ campo: 'precio', dir: 1 })
    const [todas, setTodas] = useState(false)
    const claveLlegadas = [...llegadas].join(',')

    const filas = filasDe(monitoreos)
    const sitios = [...new Set(filas.map((f) => f.monitoreo.marketplace))]
    const conteo = (mk) => filas.filter((f) => f.monitoreo.marketplace === mk).length
    const filtradas = filas
        .filter((f) => sitio === 'TODOS' || f.monitoreo.marketplace === sitio)
        .filter((f) => !soloStock || f.pub?.disponible)
        .sort((a, b) => ORDENES[orden.campo](a, b) * orden.dir)
    const mostradas = todas ? filtradas : filtradas.slice(0, VISIBLES)
    const ocultas = filtradas.length - mostradas.length
    // Se cuentan las que estás viendo: con un filtro puesto, la comparación es contra ese sitio
    const conPrecio = filtradas.filter((f) => f.pub && f.pub.disponible)
    const masBaratas = conPrecio.filter((f) => f.pub.precio < precioPropio).length
    const hayAmazon = filas.some((f) => f.pub?.precioUsd !== null && f.pub?.precioUsd !== undefined)

    // Tu precio entra a la lista como una fila más, en el puesto que le toca
    const tuIndice = orden.campo === 'precio' ? mostradas.findIndex((f) => (f.pub ? f.pub.precio * orden.dir > precioPropio * orden.dir : orden.dir === 1)) : -1
    const ubicarTu = orden.campo === 'precio' && (tuIndice !== -1 || ocultas === 0)
    const posicionTu = tuIndice === -1 ? mostradas.length : tuIndice

    function ordenar(campo) {
        setOrden((o) => (o.campo === campo ? { campo, dir: -o.dir } : { campo, dir: 1 }))
    }

    function quitarFiltros() {
        setSitio('TODOS')
        setSoloStock(false)
    }

    // Las publicaciones recién capturadas caen en su lugar, una tras otra; su línea de 7 días se dibuja
    useGSAP(
        () => {
            if (!claveLlegadas) return
            const mm = gsap.matchMedia()
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                const nuevas = gsap.utils.toArray('tr[data-llega]')
                gsap.from(nuevas, { y: -12, autoAlpha: 0, duration: 0.4, ease: 'power3.out', stagger: 0.05 })
                nuevas.forEach((fila, i) => {
                    const linea = fila.querySelector('.spark path')
                    if (!linea?.getTotalLength) return
                    const largo = linea.getTotalLength()
                    gsap.fromTo(linea, { strokeDasharray: largo, strokeDashoffset: largo }, { strokeDashoffset: 0, duration: 0.7, delay: 0.2 + i * 0.05, ease: 'power2.inOut' })
                })
            })
        },
        { scope: ref, dependencies: [claveLlegadas] },
    )

    const filaTu = (
        <tr className="fila-tu" key="tu">
            <td colSpan={5}>
                <span className="fila-tu-marca">Tú</span>
                <strong className="num">{pesos(precioPropio)}</strong>
                <span>
                    {masBaratas === 0
                        ? 'Nadie con stock vende más barato que tú'
                        : `${masBaratas} ${masBaratas === 1 ? 'publicación con stock vende' : 'publicaciones con stock venden'} más barato que tú`}
                </span>
            </td>
        </tr>
    )

    return (
        <section className="hoja competidores" aria-labelledby="competidores-titulo" ref={ref} id="competidores">
            <div className="competidores-cabeza">
                <div>
                    <h2 id="competidores-titulo">Competidores</h2>
                    <p className="mini">
                        {filas.length === 0
                            ? 'La reventa de tu producto en otros sitios.'
                            : `${filas.length} ${filas.length === 1 ? 'publicación' : 'publicaciones'} en ${listaY(sitios.map((s) => MARKETPLACES[s].nombre))}. Trendly las revisa cada 6 horas.`}
                    </p>
                </div>
                <button type="button" className="app-boton app-boton-amarillo" onClick={onAgregar}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Agregar competidor
                </button>
            </div>
            {movimiento && <Movimiento key={movimiento.vez} movimiento={movimiento} />}

            {filas.length === 0 ? (
                <p className="competidores-vacio">
                    Todavía no vigilas la reventa. Pega la URL de una publicación de MercadoLibre, Falabella o Amazon, o vigila los primeros
                    resultados de una búsqueda.
                </p>
            ) : (
                <>
                    <div className="competidores-barra">
                        {sitios.length > 1 && (
                            <div className="productos-filtros" role="group" aria-label="Sitio">
                                {['TODOS', ...sitios].map((s) => (
                                    <button key={s} type="button" className={`chip${sitio === s ? ' on' : ''}`} aria-pressed={sitio === s} onClick={() => setSitio(s)}>
                                        {s === 'TODOS' ? 'Todos' : MARKETPLACES[s].nombre} <span className="c">{s === 'TODOS' ? filas.length : conteo(s)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <label className="interruptor">
                            <input type="checkbox" checked={soloStock} onChange={(e) => setSoloStock(e.target.checked)} />
                            <span aria-hidden="true" />
                            Solo con stock
                        </label>
                    </div>

                    {filtradas.length === 0 ? (
                        <div className="competidores-vacio">
                            <p>Ninguna publicación cumple estos filtros.</p>
                            <button type="button" className="app-boton app-boton-claro app-boton-chico" onClick={quitarFiltros}>
                                Quitar filtros
                            </button>
                        </div>
                    ) : (
                        <table className="competidores-tabla">
                            <caption className="sr-only">Publicaciones que vigilas</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Publicación</th>
                                    <Encabezado campo="precio" orden={orden} onOrdenar={ordenar}>
                                        Precio
                                    </Encabezado>
                                    <Encabezado campo="cambio" orden={orden} onOrdenar={ordenar}>
                                        7 días
                                    </Encabezado>
                                    <th scope="col">Estado</th>
                                    <th scope="col">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {mostradas.flatMap(({ clave, monitoreo: m, pub }, i) => {
                                    const mk = MARKETPLACES[m.marketplace]
                                    const pausado = m.estado === 'PAUSADO'
                                    const quien = pub?.vendedor ?? (m.tipo === 'URL' ? m.idPublicacion : `"${m.valor}"`)
                                    const cambio = cambios[clave]
                                    const fila = (
                                        <tr
                                            key={clave}
                                            data-monitoreo={m.id}
                                            data-llega={llegadas.has(clave) ? '' : undefined}
                                            className={
                                                [pausado && 'fila-pausada', cambio && `fila-${cambio.ahora < cambio.antes ? 'baja' : 'sube'}-${cambio.vez % 2}`]
                                                    .filter(Boolean)
                                                    .join(' ') || undefined
                                            }
                                        >
                                            <td className="c-publicacion">
                                                <div className="publicacion">
                                                    {pub ? <img src={pub.imagen} alt="" /> : <span className="publicacion-espera" aria-hidden="true" />}
                                                    <div>
                                                        <strong>{pub ? pub.vendedor : 'Esperando la primera captura'}</strong>
                                                        <span className="publicacion-meta">
                                                            <span className={`mk ${mk.clase}`}>{mk.nombre}</span>
                                                            <span>{origenDe(m, pub)}</span>
                                                            <span className="num publicacion-id">{pub?.idPublicacion ?? m.idPublicacion ?? m.valor}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="r c-precio">
                                                {pub ? <Precio pub={pub} cambio={cambio} propio={precioPropio} /> : <span className="cargando-barra" aria-hidden="true" />}
                                            </td>
                                            <td className="r c-siete">{pub ? <SieteDias historial={pub.historial} /> : <span className="mini">—</span>}</td>
                                            <td className="c-estado">
                                                <span className="estado-celda">
                                                    <EstadoFila m={m} pub={pub} />
                                                </span>
                                            </td>
                                            <td className="r c-acciones">
                                                <span className="acciones">
                                                    <button
                                                        type="button"
                                                        className="icono"
                                                        title={pausado ? 'Reactivar' : 'Pausar'}
                                                        aria-label={`${pausado ? 'Reactivar' : 'Pausar'} ${quien}`}
                                                        disabled={ocupado === m.id}
                                                        onClick={() => onAlternar(m)}
                                                    >
                                                        {pausado ? <IconoReanudar /> : <IconoPausa />}
                                                    </button>
                                                    <button type="button" className="icono icono-peligro" title="Dejar de vigilar" aria-label={`Eliminar ${quien}`} onClick={() => onEliminar(m, quien)}>
                                                        <IconoBasura />
                                                    </button>
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                    return ubicarTu && i === posicionTu ? [filaTu, fila] : [fila]
                                })}
                                {ubicarTu && posicionTu === mostradas.length && filaTu}
                            </tbody>
                        </table>
                    )}

                    {(ocultas > 0 || (todas && filtradas.length > VISIBLES) || hayAmazon) && (
                        <div className="competidores-pie">
                            {ocultas > 0 && (
                                <button type="button" className="app-boton app-boton-claro app-boton-chico" onClick={() => setTodas(true)}>
                                    Ver {ocultas} más
                                </button>
                            )}
                            {todas && filtradas.length > VISIBLES && (
                                <button type="button" className="app-boton app-boton-claro app-boton-chico" onClick={() => setTodas(false)}>
                                    Ver menos
                                </button>
                            )}
                            {hayAmazon && <p className="mini">Amazon publica en dólares. Se compara en pesos con una TRM de {pesos(TRM)}.</p>}
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
