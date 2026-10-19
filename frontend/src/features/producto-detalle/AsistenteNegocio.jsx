import { useEffect, useMemo, useState } from 'react'
import { mensajeDeError } from '@core/api/errores'
import { formatearPesos, formatearPorcentaje } from '@features/productos/formato'
import { responderPreguntaAsistente } from './asistenteNegocio'
import './AsistenteNegocio.css'

const PREGUNTAS_RAPIDAS = [
    '¿Qué pasa si subo el margen al 25%?',
    '¿Qué pasa si busco un 35% de margen?',
    '¿Por qué varió mi rentabilidad?',
    '¿Cómo entrar al Top 3?',
    '¿Quién es el competidor más agresivo?',
]

const DURACION_CONFIRMACION = 2800

export default function AsistenteNegocio({ producto, publicaciones = [], onAplicarPrecio }) {
    const [preguntaSeleccionada, setPreguntaSeleccionada] = useState(PREGUNTAS_RAPIDAS[0])
    const [sliderMargen, setSliderMargen] = useState(() => Math.round(producto?.margenObjetivo || 25))
    const [aplicando, setAplicando] = useState(false)
    const [resultadoAplicacion, setResultadoAplicacion] = useState(null)

    const respuesta = useMemo(() => {
        return responderPreguntaAsistente(preguntaSeleccionada, producto, publicaciones)
    }, [preguntaSeleccionada, producto, publicaciones])

    useEffect(() => {
        if (resultadoAplicacion?.tipo !== 'exito') return undefined
        const temporizador = window.setTimeout(() => setResultadoAplicacion(null), DURACION_CONFIRMACION)
        return () => window.clearTimeout(temporizador)
    }, [resultadoAplicacion])

    function handleChipClick(pregunta) {
        setPreguntaSeleccionada(pregunta)
        setResultadoAplicacion(null)
        const match = pregunta.match(/(\d+)\s*%/)
        if (match) {
            setSliderMargen(parseInt(match[1], 10))
        }
    }

    function handleSliderChange(e) {
        const nuevoValor = parseInt(e.target.value, 10)
        setSliderMargen(nuevoValor)
        setResultadoAplicacion(null)
        setPreguntaSeleccionada(`¿Qué pasa si subo el margen al ${nuevoValor}%?`)
    }

    async function aplicarPrecio(precio) {
        setAplicando(true)
        setResultadoAplicacion(null)
        try {
            await onAplicarPrecio(precio)
            setResultadoAplicacion({
                tipo: 'exito',
                precio,
            })
        } catch (error) {
            setResultadoAplicacion({
                tipo: 'error',
                mensaje: `No se pudo fijar el precio. ${mensajeDeError(error)}`,
            })
        } finally {
            setAplicando(false)
        }
    }

    return (
        <section className="asistente-panel" aria-labelledby="asistente-titulo">
            <header className="asistente-encabezado">
                <h2 id="asistente-titulo" className="asistente-titulo">
                    Simulador de Decisiones de Negocio
                </h2>
                <p className="asistente-descripcion descripcion-seccion">
                    Consulta escenarios de rentabilidad y posición competitiva basados exclusivamente en los costos reales de tu proveedor y precios del mercado.
                </p>
            </header>

            <div className="asistente-chips" role="group" aria-label="Preguntas rápidas">
                {PREGUNTAS_RAPIDAS.map((pregunta) => (
                    <button
                        key={pregunta}
                        type="button"
                        className={`asistente-chip ${preguntaSeleccionada === pregunta ? 'activo' : ''}`}
                        onClick={() => handleChipClick(pregunta)}
                    >
                        {pregunta}
                    </button>
                ))}
            </div>

            <div className="asistente-slider-seccion">
                <span className="asistente-slider-etiqueta">Simular margen libre:</span>
                <div className="asistente-slider-control">
                    <input
                        type="range"
                        className="asistente-slider"
                        min="5"
                        max="70"
                        step="1"
                        value={sliderMargen}
                        onChange={handleSliderChange}
                        aria-label="Margen deseado"
                    />
                    <span className="asistente-slider-valor">{sliderMargen}%</span>
                </div>
            </div>

            <div className="asistente-respuesta-caja">
                <h3 className="asistente-respuesta-titulo">{respuesta.titulo}</h3>
                <p className="asistente-respuesta-texto">{respuesta.texto}</p>

                {respuesta.tipo === 'SIMULACION_MARGEN' && respuesta.datos && (
                    <div className="asistente-metricas-grid">
                        <div className="asistente-metrica-item">
                            <span className="asistente-metrica-rotulo">Precio necesario</span>
                            <span className="asistente-metrica-valor">{formatearPesos(respuesta.datos.precioRequerido)}</span>
                        </div>
                        <div className="asistente-metrica-item">
                            <span className="asistente-metrica-rotulo">Nueva posición</span>
                            <span className="asistente-metrica-valor">
                                {respuesta.datos.posicionNueva}.º de {respuesta.datos.total}
                            </span>
                        </div>
                        <div className="asistente-metrica-item">
                            <span className="asistente-metrica-rotulo">Venden más barato</span>
                            <span className="asistente-metrica-valor">{respuesta.datos.masBaratos} ofertas</span>
                        </div>
                        <div className="asistente-metrica-item">
                            <span className="asistente-metrica-rotulo">Margen neto</span>
                            <span className="asistente-metrica-valor">{formatearPorcentaje(respuesta.datos.nuevoMargen)}</span>
                        </div>
                    </div>
                )}

                {respuesta.accion && onAplicarPrecio && (
                    <div className="asistente-respuesta-acciones">
                        <button
                            type="button"
                            className={`asistente-boton-aplicar${resultadoAplicacion?.tipo === 'exito' ? ' precio-fijado' : ''}`}
                            disabled={aplicando}
                            onClick={() => aplicarPrecio(respuesta.accion.nuevoPrecio)}
                            aria-live="polite"
                            aria-label={
                                resultadoAplicacion?.tipo === 'exito'
                                    ? `Precio fijado en ${formatearPesos(resultadoAplicacion.precio)}`
                                    : undefined
                            }
                        >
                            {resultadoAplicacion?.tipo === 'exito' ? (
                                <>
                                    <svg className="asistente-boton-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                        <path d="m4 10.5 4 4 8-9" />
                                    </svg>
                                    <span>Fijado {formatearPesos(resultadoAplicacion.precio)}</span>
                                </>
                            ) : aplicando ? 'Aplicando precio…' : respuesta.accion.label}
                        </button>
                    </div>
                )}
                {resultadoAplicacion?.tipo === 'error' && (
                    <p
                        className="asistente-aplicar-resultado error"
                        role="alert"
                    >
                        <span>{resultadoAplicacion.mensaje}</span>
                    </p>
                )}
            </div>
        </section>
    )
}
