import { useCallback, useMemo, useState } from 'react'
import { formatearPesos } from '@features/productos/formato'
import {
    analizarEquivalencias,
    agregarExclusion,
    quitarExclusion,
    motivoSospecha,
} from './equivalencias'
import './EquivalenciasProducto.css'

function clasePuntaje(puntaje) {
    if (puntaje >= 70) return 'alto'
    if (puntaje >= 40) return 'medio'
    return 'bajo'
}

function claseConfianza(confianza) {
    if (confianza >= 70) return 'confianza-alta'
    if (confianza >= 40) return 'confianza-media'
    return 'confianza-baja'
}

const IconoExcluir = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
)

const IconoRestaurar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
)

function FilaPublicacion({ pub, sospechosos, publicaciones, onExcluir }) {
    const esSospechosa = sospechosos.has(pub.idPublicacion)
    const motivo = esSospechosa ? motivoSospecha(Number(pub.precio), publicaciones) : null

    return (
        <div className="equivalencias-fila">
            {pub.imagen ? (
                <img className="equivalencias-fila-foto" src={pub.imagen} alt="" />
            ) : (
                <span className="equivalencias-fila-foto" aria-hidden="true" />
            )}

            <div className="equivalencias-fila-info">
                <span className="equivalencias-fila-vendedor">{pub.vendedor || pub.idPublicacion}</span>
                <div className="equivalencias-fila-meta">
                    <span className="num">{formatearPesos(pub.precio)}</span>
                    {pub.puntajeEquivalencia !== undefined && (
                        <span className={`equivalencias-puntaje ${clasePuntaje(pub.puntajeEquivalencia)}`}>
                            {pub.puntajeEquivalencia}% match
                        </span>
                    )}
                    {esSospechosa && motivo && (
                        <span className="equivalencias-sospechoso" title={motivo.mensaje}>
                            {motivo.icono} Precio sospechoso
                        </span>
                    )}
                </div>
            </div>

            <div className="equivalencias-acciones">
                <button
                    type="button"
                    className="equivalencias-btn-excluir"
                    title="No es el mismo producto"
                    aria-label={`Marcar ${pub.vendedor || pub.idPublicacion} como diferente`}
                    onClick={() => onExcluir(pub)}
                >
                    <IconoExcluir />
                    <span>No es el mismo</span>
                </button>
            </div>
        </div>
    )
}

function FilaExcluida({ excluida, onRestaurar }) {
    return (
        <div className="equivalencias-fila equivalencias-excluida">
            <span className="equivalencias-fila-foto" aria-hidden="true" />
            <div className="equivalencias-fila-info">
                <span className="equivalencias-fila-vendedor">{excluida.vendedor || excluida.idPublicacion}</span>
                <div className="equivalencias-fila-meta">
                    {excluida.precio && <span className="num">{formatearPesos(excluida.precio)}</span>}
                    <span>Excluido por el usuario</span>
                </div>
            </div>
            <div className="equivalencias-acciones">
                <button
                    type="button"
                    className="equivalencias-btn-restaurar"
                    title="Restaurar esta publicación"
                    aria-label={`Restaurar ${excluida.vendedor || excluida.idPublicacion}`}
                    onClick={() => onRestaurar(excluida.idPublicacion)}
                >
                    <IconoRestaurar />
                </button>
            </div>
        </div>
    )
}

export default function EquivalenciasProducto({ nombreProducto, publicaciones, productoId }) {
    const [version, setVersion] = useState(0)

    const analisis = useMemo(
        () =>
            analizarEquivalencias({
                nombreProducto,
                publicaciones,
                productoId,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [nombreProducto, publicaciones, productoId, version],
    )

    const handleExcluir = useCallback(
        (pub) => {
            agregarExclusion(productoId, pub)
            setVersion((v) => v + 1)
        },
        [productoId],
    )

    const handleRestaurar = useCallback(
        (idPublicacion) => {
            quitarExclusion(productoId, idPublicacion)
            setVersion((v) => v + 1)
        },
        [productoId],
    )

    const { equivalentes, noEquivalentes, sospechosos, excluidas, resumen } = analisis

    if (publicaciones.length === 0) {
        return (
            <section className="hoja equivalencias" aria-labelledby="equivalencias-titulo">
                <div className="equivalencias-cabeza">
                    <div>
                        <h2 id="equivalencias-titulo">Equivalencia de publicaciones</h2>
                    </div>
                </div>
                <div className="equivalencias-vacio">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
                    </svg>
                    Agrega competidores para validar si las publicaciones corresponden al mismo producto.
                </div>
            </section>
        )
    }

    const clConfianza = claseConfianza(resumen.confianza)

    return (
        <section className="hoja equivalencias" aria-labelledby="equivalencias-titulo">
            <div className="equivalencias-cabeza">
                <div>
                    <h2 id="equivalencias-titulo">Equivalencia de publicaciones</h2>
                    <p className="descripcion-seccion">
                        Verifica que las publicaciones vigiladas realmente correspondan a{' '}
                        <strong>{nombreProducto}</strong>. Si alguna es un producto diferente, exclúyela para mejorar
                        las comparaciones y escenarios.
                    </p>
                </div>
            </div>

            {/* Resumen con barra de confianza */}
            <div className="equivalencias-resumen">
                <div className="equivalencias-stat">
                    <span className="equivalencias-stat-rotulo">Publicaciones</span>
                    <span className="equivalencias-stat-valor">{resumen.total}</span>
                </div>
                <div className="equivalencias-stat">
                    <span className="equivalencias-stat-rotulo">Verificadas</span>
                    <span className="equivalencias-stat-valor">{resumen.totalEquivalentes}</span>
                </div>
                {resumen.totalSospechosas > 0 && (
                    <div className="equivalencias-stat">
                        <span className="equivalencias-stat-rotulo">Precio sospechoso</span>
                        <span className="equivalencias-stat-valor confianza-baja">{resumen.totalSospechosas}</span>
                    </div>
                )}
                {resumen.totalExcluidas > 0 && (
                    <div className="equivalencias-stat">
                        <span className="equivalencias-stat-rotulo">Excluidas</span>
                        <span className="equivalencias-stat-valor">{resumen.totalExcluidas}</span>
                    </div>
                )}
                <div className="equivalencias-barra-wrap">
                    <div className="equivalencias-barra-label">
                        <span>Confianza de comparación</span>
                        <span className={`num ${clConfianza}`}>{resumen.confianza}%</span>
                    </div>
                    <div className="equivalencias-barra" role="progressbar" aria-valuenow={resumen.confianza} aria-valuemin="0" aria-valuemax="100">
                        <div className={`equivalencias-barra-relleno ${clConfianza}`} style={{ width: `${resumen.confianza}%` }} />
                    </div>
                </div>
            </div>

            {/* Publicaciones equivalentes */}
            <div className="equivalencias-lista">
                {equivalentes.length > 0 && (
                    <>
                        <div className="equivalencias-seccion-titulo">
                            Equivalentes ({equivalentes.length})
                        </div>
                        {equivalentes.map((pub) => (
                            <FilaPublicacion
                                key={pub.idPublicacion}
                                pub={pub}
                                sospechosos={sospechosos}
                                publicaciones={publicaciones}
                                productoId={productoId}
                                onExcluir={handleExcluir}
                            />
                        ))}
                    </>
                )}

                {noEquivalentes.length > 0 && (
                    <>
                        <div className="equivalencias-seccion-titulo">
                            Revisar ({noEquivalentes.length})
                        </div>
                        {noEquivalentes.map((pub) => (
                            <FilaPublicacion
                                key={pub.idPublicacion}
                                pub={pub}
                                sospechosos={sospechosos}
                                publicaciones={publicaciones}
                                productoId={productoId}
                                onExcluir={handleExcluir}
                            />
                        ))}
                    </>
                )}

                {excluidas.length > 0 && (
                    <div className="equivalencias-excluidas">
                        <div className="equivalencias-seccion-titulo">
                            Excluidas ({excluidas.length})
                        </div>
                        {excluidas.map((exc) => (
                            <FilaExcluida key={exc.idPublicacion} excluida={exc} onRestaurar={handleRestaurar} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
