import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AlertasDecision.css'

const MONEDA_COP = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const PORCENTAJE = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const MOTIVOS = {
    SUPERADO: 'Te superaron en precio',
    MARGEN: 'Margen bajo el objetivo',
    SIN_STOCK: 'Sin stock del proveedor',
}

function pesos(valor) {
    return `$${MONEDA_COP.format(valor)}`
}

function porcentaje(valor, conSigno = false) {
    const signo = valor < 0 ? '−' : valor > 0 && conSigno ? '+' : ''
    return `${signo}${PORCENTAJE.format(Math.abs(valor))} %`
}

function iniciales(nombre) {
    return nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join('')
        .toLocaleUpperCase('es-CO')
}

function TextoAlerta({ alerta }) {
    if (alerta.motivo === 'SIN_STOCK') {
        return <span>{alerta.competidor || 'El proveedor'} no tiene unidades disponibles.</span>
    }

    const cambio = Number(alerta.cambioPct)
    const diferencia = Number(alerta.diferenciaPct)
    const cifras = Number.isFinite(alerta.precioCompetidor)
        && Number.isFinite(alerta.miPrecio)
        && Number.isFinite(cambio)
        && Number.isFinite(diferencia)

    if (!cifras) {
        return <span>{alerta.competidor || 'El competidor'} cambió su precio. Revisa tu posición y margen.</span>
    }

    if (alerta.motivo === 'MARGEN') {
        return (
            <span>
                {alerta.competidor} bajó a <strong>{pesos(alerta.precioCompetidor)}</strong> (<strong>{porcentaje(cambio)}</strong>).
                Igualarlo desde tus <strong>{pesos(alerta.miPrecio)}</strong> dejaría tu margen bajo el objetivo.
            </span>
        )
    }

    return (
        <span>
            {alerta.competidor} bajó a <strong>{pesos(alerta.precioCompetidor)}</strong> (<strong>{porcentaje(cambio)}</strong>).
            Tú estás en <strong>{pesos(alerta.miPrecio)}</strong>, <strong>{porcentaje(diferencia, true)}</strong> sobre el más barato.
        </span>
    )
}

function Miniatura({ alerta }) {
    return alerta.imagen ? (
        <img className="alerta-decision-miniatura" src={alerta.imagen} alt={alerta.nombre} />
    ) : (
        <span className="alerta-decision-miniatura alerta-decision-iniciales" aria-label={alerta.nombre}>
            {iniciales(alerta.nombre)}
        </span>
    )
}

function Esqueleto() {
    return (
        <ul className="alerta-decision-lista" aria-label="Cargando alertas">
            {Array.from({ length: 2 }, (_, indice) => (
                <li className="alerta-decision-fila alerta-decision-esqueleto" key={indice} aria-hidden="true">
                    <span className="alerta-decision-miniatura" />
                    <span className="alerta-decision-esqueleto-texto">
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="alerta-decision-esqueleto-boton" />
                </li>
            ))}
        </ul>
    )
}

export default function AlertasDecision({ alertas = [], cargando = false, error = false, onReintentar }) {
    const [mostrarTodas, setMostrarTodas] = useState(false)
    const navegar = useNavigate()
    const visibles = mostrarTodas ? alertas : alertas.slice(0, 3)

    return (
        <section className="alerta-decision-panel" aria-labelledby="alerta-decision-titulo">
            <header className="alerta-decision-encabezado">
                <div className="alerta-decision-titulos">
                    <div className="alerta-decision-titulo-fila">
                        <h2 id="alerta-decision-titulo">Necesitan tu decisión</h2>
                        {!cargando && !error && alertas.length > 0 && (
                            <span className="alerta-decision-contador">{alertas.length}</span>
                        )}
                    </div>
                    {!error && (
                        <p>
                            {cargando
                                ? 'Revisando tus productos'
                                : `${alertas.length} ${alertas.length === 1 ? 'producto requiere' : 'productos requieren'} atención`}
                        </p>
                    )}
                </div>
            </header>

            {cargando ? (
                <Esqueleto />
            ) : error ? (
                <div className="alerta-decision-error" role="alert">
                    <span>No pudimos cargar las alertas</span>
                    {onReintentar && <button type="button" onClick={onReintentar}>Reintentar</button>}
                </div>
            ) : alertas.length === 0 ? (
                <div className="alerta-decision-vacio">
                    <span className="alerta-decision-check" aria-hidden="true">✓</span>
                    <strong>Todo en orden</strong>
                    <p>Te avisaremos cuando un competidor cambie algo importante</p>
                </div>
            ) : (
                <>
                    <ul className="alerta-decision-lista">
                        {visibles.map((alerta) => (
                            <li
                                className="alerta-decision-fila"
                                key={alerta.id}
                                onClick={() => navegar(`/productos/${alerta.productoId}`)}
                            >
                                <Miniatura alerta={alerta} />
                                <div className="alerta-decision-texto">
                                    <span className={`alerta-decision-motivo alerta-decision-motivo-${alerta.motivo.toLowerCase()}`}>
                                        <i aria-hidden="true" />
                                        {MOTIVOS[alerta.motivo]}
                                    </span>
                                    <h3 title={alerta.nombre}>{alerta.nombre}</h3>
                                    <p><TextoAlerta alerta={alerta} /></p>
                                </div>
                                <button
                                    className="alerta-decision-accion"
                                    type="button"
                                    aria-label={`Revisar precio de ${alerta.nombre}`}
                                    onClick={(evento) => {
                                        evento.stopPropagation()
                                        navegar(`/productos/${alerta.productoId}`)
                                    }}
                                >
                                    Revisar precio
                                </button>
                            </li>
                        ))}
                    </ul>
                    {alertas.length > 3 && !mostrarTodas && (
                        <button className="alerta-decision-ver-mas" type="button" onClick={() => setMostrarTodas(true)}>
                            Ver las {alertas.length} alertas
                        </button>
                    )}
                </>
            )}
        </section>
    )
}
