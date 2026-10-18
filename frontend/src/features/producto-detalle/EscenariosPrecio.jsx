import { useMemo, useState } from 'react'
import { formatearPesos, formatearPorcentaje } from '@features/productos/formato'
import { calcularEscenarios } from './escenarios'
import './EscenariosPrecio.css'

export default function EscenariosPrecio({ costo, margenObjetivo, precioActual, publicaciones, onAplicarPrecio }) {
    const [aplicando, setAplicando] = useState(null)
    const [mensajeExito, setMensajeExito] = useState('')

    const escenarios = useMemo(
        () =>
            calcularEscenarios({
                costo,
                margenObjetivo,
                publicaciones,
                precioActual,
            }),
        [costo, margenObjetivo, publicaciones, precioActual],
    )

    async function manejarAplicar(escenario) {
        if (!onAplicarPrecio || escenario.esActual) return
        setAplicando(escenario.id)
        setMensajeExito('')
        try {
            await onAplicarPrecio(escenario.precio)
            setMensajeExito(`Precio actualizado a ${formatearPesos(escenario.precio)} (${escenario.nombre})`)
            setTimeout(() => setMensajeExito(''), 4000)
        } finally {
            setAplicando(null)
        }
    }

    return (
        <section className="hoja escenarios" aria-labelledby="escenarios-titulo">
            <div className="escenarios-cabeza">
                <div>
                    <div className="escenarios-etiqueta-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        Inteligencia de Precios
                    </div>
                    <h2 id="escenarios-titulo">Tres escenarios estratégicos</h2>
                    <p className="mini">
                        Proyecciones calculadas en tiempo real combinando tu costo real, tu margen objetivo y las publicaciones activas con stock.
                    </p>
                </div>
                {mensajeExito && (
                    <div className="escenarios-aviso-exito" role="status">
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
                        </svg>
                        {mensajeExito}
                    </div>
                )}
            </div>

            <div className="escenarios-grilla">
                {escenarios.map((esc) => {
                    const esRecomendado = esc.id === 'equilibrado'
                    return (
                        <article
                            key={esc.id}
                            className={`escenario-tarjeta escenario-${esc.id}${esc.esActual ? ' es-actual' : ''}${esRecomendado ? ' es-recomendado' : ''}`}
                        >
                            <div className="escenario-tarjeta-arriba">
                                <span className={`escenario-badge ${esRecomendado ? 'badge-recomendado' : ''}`}>
                                    {esc.badge}
                                </span>
                                {esc.esActual && <span className="escenario-chip-actual">Precio actual</span>}
                            </div>

                            <h3 className="escenario-nombre">{esc.nombre}</h3>
                            <div className="escenario-precio num">{formatearPesos(esc.precio)}</div>

                            <div className="escenario-metricas">
                                <div className="escenario-metrica">
                                    <span className="escenario-metrica-rotulo">Ganancia</span>
                                    <strong className="num">+{formatearPesos(esc.ganancia)}</strong>
                                </div>
                                <div className="escenario-metrica">
                                    <span className="escenario-metrica-rotulo">Margen</span>
                                    <strong className={`num ${esc.margen >= margenObjetivo ? 'margen-cumple' : 'margen-bajo'}`}>
                                        {formatearPorcentaje(esc.margen)}
                                    </strong>
                                </div>
                            </div>

                            <div className="escenario-posicion" title="Posición proyectada frente a la competencia">
                                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path d="M2 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5zM8 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7zM14 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4z" />
                                </svg>
                                <span>{esc.resumenPosicion}</span>
                            </div>

                            <p className="escenario-explicacion">{esc.explicacion}</p>

                            <button
                                type="button"
                                className={`app-boton ${esRecomendado && !esc.esActual ? 'app-boton-amarillo' : 'app-boton-claro'} escenario-boton`}
                                disabled={esc.esActual || aplicando === esc.id}
                                onClick={() => manejarAplicar(esc)}
                            >
                                {aplicando === esc.id
                                    ? 'Aplicando…'
                                    : esc.esActual
                                    ? 'Tu precio actual'
                                    : `Aplicar ${formatearPesos(esc.precio)}`}
                            </button>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
