import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { useGSAP } from '@gsap/react'
import { mensajeDeError } from '@core/api/errores'
import { buscarOfertas } from '@core/services/proveedores.service'
import Mensaje from '@shared/components/Mensaje'
import { validarBusquedaProveedor } from '@shared/utils/validaciones'
import { formatearDolares, formatearPesos } from '@features/productos/formato'
import { ORDENES_OFERTAS, recomendar, totalPesos } from './recomendaciones'

gsap.registerPlugin(useGSAP, Flip)

const FILTROS = [
    ['gratis', 'Envío gratis', (o) => o.envioUsd === 0],
    ['calificado', '4,5 o más', (o) => o.calificacion >= 4.5],
    ['rapido', 'Llega en 15 días o menos', (o) => o.diasMax <= 15],
]

const animar = () => window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches

const numero = (n) => n.toLocaleString('es-CO')

function Estrellas({ valor }) {
    return (
        <span className="estrellas" role="img" aria-label={`Calificación ${numero(valor)} de 5`}>
            <span className="estrellas-llenas" style={{ width: `${(valor / 5) * 100}%` }} aria-hidden="true">
                ★★★★★
            </span>
            <span aria-hidden="true">★★★★★</span>
        </span>
    )
}

function Precio({ oferta }) {
    return (
        <div className="oferta-precio">
            <strong className="num">{formatearDolares(oferta.precioUsd)}</strong>
            <span className={`mini num${oferta.envioUsd === 0 ? ' envio-gratis' : ''}`}>
                {oferta.envioUsd === 0 ? 'Envío gratis' : `+ envío ${formatearDolares(oferta.envioUsd)}`}
            </span>
            <span className="mini num">≈ {formatearPesos(totalPesos(oferta))} puesto en Colombia</span>
        </div>
    )
}

function Oferta({ oferta, onElegir }) {
    return (
        <li className="hoja oferta" data-flip-id={oferta.idPublicacion}>
            <div className="oferta-foto">
                <img src={oferta.imagen} alt="" />
                {oferta.insignias.length > 0 && (
                    <span className="oferta-insignias">
                        {oferta.insignias.map((i) => (
                            <span key={i} className={`insignia${i === 'Recomendado' ? ' insignia-top' : ''}`}>
                                {i}
                            </span>
                        ))}
                    </span>
                )}
            </div>
            <div className="oferta-cuerpo">
                <p className="oferta-titulo">{oferta.titulo}</p>
                <p className="mini oferta-tienda">
                    <span className="mk mk-ae">AliExpress</span> {oferta.tienda}
                </p>
                <Precio oferta={oferta} />
                <p className="oferta-dato">
                    Llega en <strong className="num">{oferta.diasMin}–{oferta.diasMax} días</strong>
                </p>
                <p className="oferta-dato">
                    <Estrellas valor={oferta.calificacion} /> <strong className="num">{numero(oferta.calificacion)}</strong>
                    <span className="mini num"> · {numero(oferta.resenas)} reseñas · {numero(oferta.ventas)} vendidos</span>
                </p>
                {oferta.alertas.length > 0 && (
                    <p className="oferta-alertas">
                        {oferta.alertas.map((a) => (
                            <span key={a}>{a}</span>
                        ))}
                    </p>
                )}
                <button type="button" className="app-boton app-boton-claro app-boton-chico oferta-elegir" aria-label={`Elegir la oferta de ${oferta.tienda}`} onClick={() => onElegir(oferta)}>
                    Elegir
                </button>
            </div>
        </li>
    )
}

// Paso 1: buscar el producto en AliExpress, comparar proveedores y elegir uno
export default function BuscarProveedor({ busquedaInicial, resultadoInicial, onResultado, onElegir, onManual }) {
    const ref = useRef(null)
    const [consulta, setConsulta] = useState(busquedaInicial)
    const [error, setError] = useState('')
    const [errorApi, setErrorApi] = useState('')
    const [buscando, setBuscando] = useState(false)
    const [ofertas, setOfertas] = useState(resultadoInicial)
    const [orden, setOrden] = useState('recomendado')
    const [filtros, setFiltros] = useState([])
    const estadoFlip = useRef(null)

    const { ofertas: puntuadas, recomendada, razones } = recomendar(ofertas ?? [])
    const activos = FILTROS.filter(([id]) => filtros.includes(id))
    const visibles = puntuadas.filter((o) => activos.every(([, , cumple]) => cumple(o))).sort(ORDENES_OFERTAS[orden].comparar)

    // Las tarjetas entran escalonadas cuando llega una búsqueda nueva
    useGSAP(
        () => {
            if (!ofertas?.length) return
            const mm = gsap.matchMedia()
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.from('.oferta', { y: 24, autoAlpha: 0, duration: 0.45, ease: 'power3.out', stagger: 0.04 })
                gsap.from('.recomendada', { y: 16, autoAlpha: 0, duration: 0.55, ease: 'power3.out' })
                gsap.from('.recomendada-razones li', { x: -10, autoAlpha: 0, duration: 0.35, ease: 'power2.out', stagger: 0.08, delay: 0.25 })
            })
        },
        { scope: ref, dependencies: [ofertas] },
    )

    // Al cambiar el orden o los filtros, cada tarjeta se desliza a su nuevo lugar (Flip)
    useLayoutEffect(() => {
        if (!estadoFlip.current) return
        Flip.from(estadoFlip.current, { duration: 0.5, ease: 'power2.inOut', absolute: true, onEnter: (e) => gsap.fromTo(e, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.3 }), onLeave: (e) => gsap.to(e, { autoAlpha: 0, scale: 0.9, duration: 0.25 }) })
        estadoFlip.current = null
    }, [orden, filtros])

    function antesDeReordenar() {
        if (animar()) estadoFlip.current = Flip.getState(ref.current.querySelectorAll('.oferta'))
    }

    async function buscar(evento) {
        evento.preventDefault()
        const mensaje = validarBusquedaProveedor(consulta)
        setError(mensaje)
        setErrorApi('')
        if (mensaje) return
        setBuscando(true)
        try {
            const encontradas = await buscarOfertas(consulta)
            setOfertas(encontradas)
            setOrden('recomendado')
            setFiltros([])
            onResultado(consulta.trim(), encontradas)
        } catch (fallo) {
            setErrorApi(mensajeDeError(fallo))
        } finally {
            setBuscando(false)
        }
    }

    return (
        <div className="paso-proveedor" ref={ref}>
            <form className="hoja buscador-proveedor" onSubmit={buscar} noValidate role="search">
                <label htmlFor="buscar-proveedor" className="buscador-etiqueta">
                    Busca el producto en AliExpress
                </label>
                <p className="mini">Escribe qué quieres vender o pega la URL de una publicación. Ahí está el proveedor al que le comprarás.</p>
                <div className="buscador-fila">
                    <span className="buscador-campo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                        <input
                            id="buscar-proveedor"
                            value={consulta}
                            autoComplete="off"
                            placeholder="smartwatch amoled  ·  https://es.aliexpress.com/item/…"
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? 'buscar-proveedor-error' : undefined}
                            onChange={(e) => {
                                setConsulta(e.target.value)
                                if (error) setError('')
                            }}
                        />
                        <span className="mk mk-ae">AliExpress</span>
                    </span>
                    <button type="submit" className="app-boton" disabled={buscando}>
                        {buscando ? 'Buscando…' : 'Buscar'}
                    </button>
                </div>
                {error && (
                    <p id="buscar-proveedor-error" className="err" role="alert">
                        {error}.
                    </p>
                )}
                {errorApi && <Mensaje tipo="error">{errorApi}</Mensaje>}
                <button type="button" className="enlace-boton" onClick={onManual}>
                    No tengo proveedor en AliExpress: registrar con costo a mano
                </button>
            </form>

            {buscando && (
                <ul className="ofertas ofertas-cargando" aria-hidden="true">
                    {Array.from({ length: 8 }, (_, n) => (
                        <li key={n} className="hoja oferta oferta-esqueleto" style={{ '--n': n }}>
                            <i />
                            <b />
                            <b />
                        </li>
                    ))}
                </ul>
            )}

            {!buscando && ofertas && recomendada && (
                <>
                    <section className="recomendada" aria-labelledby="recomendada-titulo">
                        <img src={recomendada.imagen} alt="" />
                        <div className="recomendada-texto">
                            <p className="recomendada-sello">Te recomendamos</p>
                            <h2 id="recomendada-titulo">{recomendada.titulo}</h2>
                            <p className="recomendada-tienda">
                                {recomendada.tienda} · <span className="num">{formatearDolares(recomendada.precioUsd)}</span>
                                {recomendada.envioUsd === 0 ? ' con envío gratis' : ` + ${formatearDolares(recomendada.envioUsd)} de envío`}
                            </p>
                            <ul className="recomendada-razones">
                                {razones.map((r) => (
                                    <li key={r}>{r}</li>
                                ))}
                            </ul>
                            <p className="recomendada-nota">
                                Puntaje por reglas: precio con envío (40%), confianza (25%), entrega (20%) y ventas (15%). Las ofertas con alertas
                                no se recomiendan.
                            </p>
                        </div>
                        <button type="button" className="app-boton app-boton-amarillo" onClick={() => onElegir(recomendada)}>
                            Elegir este proveedor
                        </button>
                    </section>

                    <div className="ofertas-controles">
                        <div className="productos-filtros" role="group" aria-label="Ordenar ofertas">
                            {Object.entries(ORDENES_OFERTAS).map(([id, { etiqueta }]) => (
                                <button
                                    key={id}
                                    type="button"
                                    className={`chip${orden === id ? ' on' : ''}`}
                                    aria-pressed={orden === id}
                                    onClick={() => {
                                        antesDeReordenar()
                                        setOrden(id)
                                    }}
                                >
                                    {etiqueta}
                                </button>
                            ))}
                        </div>
                        <div className="productos-filtros" role="group" aria-label="Filtrar ofertas">
                            {FILTROS.map(([id, etiqueta]) => {
                                const on = filtros.includes(id)
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`chip chip-filtro${on ? ' on' : ''}`}
                                        aria-pressed={on}
                                        onClick={() => {
                                            antesDeReordenar()
                                            setFiltros((f) => (on ? f.filter((x) => x !== id) : [...f, id]))
                                        }}
                                    >
                                        {etiqueta}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="mini num" aria-live="polite">
                            {visibles.length === 1 ? '1 oferta' : `${visibles.length} ofertas`} de {puntuadas.length}
                        </p>
                    </div>

                    {visibles.length === 0 ? (
                        <p className="hoja ofertas-vacio">Ninguna oferta cumple esos filtros. Quita alguno para ver más.</p>
                    ) : (
                        <ul className="ofertas" aria-label="Ofertas del proveedor">
                            {visibles.map((o) => (
                                <Oferta key={o.idPublicacion} oferta={o} onElegir={onElegir} />
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    )
}
