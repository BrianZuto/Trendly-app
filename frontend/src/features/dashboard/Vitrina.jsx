import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './Vitrina.css'

const INTERVALO = 6000
const MAX_ANUNCIOS = 5
const ETIQUETAS = {
    PATROCINADO: 'Patrocinado',
    OPORTUNIDAD: 'Oportunidad',
    NOTICIA: 'Noticia',
}

function useMovimientoReducido() {
    const [reducido, setReducido] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

    useEffect(() => {
        const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        if (!media) return undefined
        const cambiar = () => setReducido(media.matches)
        media.addEventListener?.('change', cambiar)
        return () => media.removeEventListener?.('change', cambiar)
    }, [])

    return reducido
}

export default function Vitrina({ anuncios = [] }) {
    const diapositivas = anuncios.slice(0, MAX_ANUNCIOS)
    const reducido = useMovimientoReducido()
    const [indice, setIndice] = useState(0)
    const [sobre, setSobre] = useState(false)
    const [enfocado, setEnfocado] = useState(false)
    const [tocando, setTocando] = useState(false)
    const inicioToque = useRef(null)
    const hayVarias = diapositivas.length > 1
    const puedeRotar = hayVarias && !reducido
    const indiceActivo = Math.min(indice, Math.max(0, diapositivas.length - 1))

    useEffect(() => {
        if (!puedeRotar || sobre || enfocado || tocando) return undefined
        const temporizador = window.setInterval(() => {
            setIndice((actual) => (actual + 1) % diapositivas.length)
        }, INTERVALO)
        return () => window.clearInterval(temporizador)
    }, [diapositivas.length, enfocado, puedeRotar, sobre, tocando])

    if (diapositivas.length === 0) return null

    function cambiarA(siguiente) {
        setIndice((indiceActivo + siguiente + diapositivas.length) % diapositivas.length)
    }

    function elegir(indiceSiguiente) {
        setIndice(indiceSiguiente)
    }

    function manejarTeclado(evento) {
        if (!hayVarias) return
        if (evento.key === 'ArrowLeft') {
            evento.preventDefault()
            cambiarA(-1)
        } else if (evento.key === 'ArrowRight') {
            evento.preventDefault()
            cambiarA(1)
        }
    }

    function iniciarToque(evento) {
        inicioToque.current = evento.changedTouches[0]?.clientX ?? null
        setTocando(true)
    }

    function terminarToque(evento) {
        if (inicioToque.current !== null) {
            const final = evento.changedTouches[0]?.clientX
            const desplazamiento = final - inicioToque.current
            if (Math.abs(desplazamiento) > 40) cambiarA(desplazamiento < 0 ? 1 : -1)
        }
        inicioToque.current = null
        setTocando(false)
    }

    return (
        <section
            className="vitrina"
            aria-roledescription="carrusel"
            aria-label="Vitrina"
            onKeyDown={manejarTeclado}
            onMouseEnter={() => setSobre(true)}
            onMouseLeave={() => setSobre(false)}
            onFocusCapture={() => setEnfocado(true)}
            onBlurCapture={(evento) => {
                if (!evento.currentTarget.contains(evento.relatedTarget)) setEnfocado(false)
            }}
            onTouchStart={iniciarToque}
            onTouchEnd={terminarToque}
        >
            {diapositivas.map((anuncio, posicion) => {
                const activo = posicion === indiceActivo
                const contenido = (
                    <>
                        <span className="vitrina-etiqueta">{ETIQUETAS[anuncio.tipo] || 'Noticia'}</span>
                        <h2 className="vitrina-titulo">{anuncio.titulo}</h2>
                        <p className="vitrina-detalle">{anuncio.detalle}</p>
                        {anuncio.cta.externo ? (
                            <a
                                className="vitrina-cta"
                                href={anuncio.cta.href}
                                target="_blank"
                                rel={anuncio.tipo === 'PATROCINADO' ? 'sponsored noopener' : 'noopener'}
                            >
                                {anuncio.cta.texto}
                            </a>
                        ) : (
                            <Link className="vitrina-cta" to={anuncio.cta.href}>
                                {anuncio.cta.texto}
                            </Link>
                        )}
                    </>
                )

                return (
                    <div
                        key={anuncio.id}
                        className={`vitrina-diapositiva${activo ? ' activa' : ''}`}
                        role="group"
                        aria-roledescription="diapositiva"
                        aria-label={`${posicion + 1} de ${diapositivas.length}`}
                        aria-hidden={!activo}
                        inert={!activo}
                        tabIndex={activo ? 0 : -1}
                        style={{ '--vitrina-posicion': posicion - indiceActivo }}
                    >
                        <div className="vitrina-cuerpo">
                            {contenido}
                        </div>
                        <div className="vitrina-imagen-fondo">
                            <img src={anuncio.imagen} alt={anuncio.imagenAlt || `Imagen de ${anuncio.titulo}`} />
                        </div>
                    </div>
                )
            })}

            {hayVarias && (
                <>
                    <button type="button" className="vitrina-flecha anterior" aria-label="Anuncio anterior" onClick={() => cambiarA(-1)}>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                    <button type="button" className="vitrina-flecha siguiente" aria-label="Anuncio siguiente" onClick={() => cambiarA(1)}>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </button>
                    <div className="vitrina-controles">
                        <div className="vitrina-indicadores" role="group" aria-label="Seleccionar anuncio">
                            {diapositivas.map((anuncio, posicion) => (
                                <button
                                    key={anuncio.id}
                                    type="button"
                                    className={`vitrina-indicador${posicion === indiceActivo ? ' activo' : ''}`}
                                    aria-label={`Mostrar diapositiva ${posicion + 1} de ${diapositivas.length}`}
                                    aria-pressed={posicion === indiceActivo}
                                    onClick={() => elegir(posicion)}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}
