import { useMemo } from 'react'
import { formatearPesos } from '@features/productos/formato'
import { generarAlertasAccionables } from './alertasAccionables'
import './AlertasAccionables.css'

export default function AlertasAccionables({ producto, monitoreos = [], onAplicarPrecio }) {
    const { resumen, alertas } = useMemo(() => {
        return generarAlertasAccionables(producto, monitoreos)
    }, [producto, monitoreos])

    const badgeClase =
        resumen.estadoGeneral === 'CRITICO'
            ? 'alertas-badge-critico'
            : resumen.estadoGeneral === 'OPORTUNIDAD'
              ? 'alertas-badge-oportunidad'
              : 'alertas-badge-estable'

    return (
        <section className="alertas-panel" aria-labelledby="alertas-titulo">
            <header className="alertas-encabezado">
                <div className="alertas-titulo-bloque">
                    <span className="alertas-super-titulo">Inteligencia Comercial · Alertas en Vivo</span>
                    <h2 id="alertas-titulo" className="alertas-titulo">
                        {resumen.titular}
                    </h2>
                    <p className="alertas-descripcion">{resumen.descripcion}</p>
                </div>

                <div className={`alertas-badge-estado ${badgeClase}`}>
                    <span>Posición {resumen.posicionActual}.º de {resumen.totalCompetidores}</span>
                </div>
            </header>

            {alertas.length === 0 ? (
                <div className="alerta-vacio">
                    <span className="alerta-vacio-icono" aria-hidden="true">✓</span>
                    <div className="alerta-vacio-texto">
                        No se han registrado bajas agresivas ni movimientos que comprometan tus posiciones. Tu precio actual de{' '}
                        <strong>{formatearPesos(producto.precioVenta)}</strong> mantiene un margen saludable del{' '}
                        <strong>{producto.margenActual}%</strong>.
                    </div>
                </div>
            ) : (
                <div className="alertas-lista">
                    {alertas.map((alerta) => {
                        const esCritica = alerta.severidad === 'alta'
                        const esOportunidad = alerta.tipo === 'OPORTUNIDAD_SUBIDA'
                        const cardClase = esCritica
                            ? 'alerta-card-critica'
                            : esOportunidad
                              ? 'alerta-card-oportunidad'
                              : 'alerta-card-info'

                        return (
                            <article key={alerta.id} className={`alerta-card ${cardClase}`}>
                                <div className="alerta-fila-superior">
                                    <div className="alerta-origen">
                                        <span>{alerta.competidor}</span>
                                        <span className="alerta-origen-tag">{alerta.marketplace}</span>
                                    </div>
                                    <div
                                        className={`alerta-cambio-chip ${
                                            alerta.porcentajeCambio < 0 ? 'alerta-cambio-baja' : 'alerta-cambio-sube'
                                        }`}
                                    >
                                        {alerta.porcentajeCambio > 0 ? `+${alerta.porcentajeCambio}%` : `${alerta.porcentajeCambio}%`}
                                    </div>
                                </div>

                                <p className="alerta-impacto">{alerta.impacto}</p>

                                <div className="alerta-accion-caja">
                                    <div className="alerta-accion-texto">{alerta.accion.texto}</div>

                                    {alerta.accion.botonLabel && onAplicarPrecio && (
                                        <button
                                            type="button"
                                            className="alerta-accion-boton"
                                            onClick={() => onAplicarPrecio(alerta.accion.precioSugerido)}
                                        >
                                            {alerta.accion.botonLabel}
                                        </button>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
