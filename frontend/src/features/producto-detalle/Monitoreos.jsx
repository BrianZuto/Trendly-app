import { cuando, MARKETPLACES } from './util'

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

const ESTADOS = {
    ACTIVO: { texto: 'Activo', clase: 'estado-activo' },
    PAUSADO: { texto: 'Pausado', clase: 'estado-pausado' },
    ERROR: { texto: 'Error', clase: 'estado-error' },
}

// Cómo se pidió vigilar: una publicación puntual o los primeros resultados de una búsqueda
function queSeVigila(m) {
    if (m.tipo === 'URL') return { titulo: 'Por URL', detalle: m.idPublicacion }
    return { titulo: `"${m.valor}"`, detalle: `Palabra clave · primeros ${m.topN}` }
}

// SCRUM-38: cada monitoreo es una fila con su tipo, estado, frecuencia y última captura.
// Pausar o eliminar actúa sobre el monitoreo entero, así una búsqueda se pausa con todos sus resultados
export default function Monitoreos({ monitoreos, ocupado, onAlternar, onEliminar }) {
    return (
        <div className="vigilas">
            <h3 id="vigilas-titulo">Lo que vigila Trendly</h3>
            <ul className="vigilas-lista" aria-labelledby="vigilas-titulo">
                {monitoreos.map((m) => {
                    const mk = MARKETPLACES[m.marketplace]
                    const estado = ESTADOS[m.estado] ?? ESTADOS.ACTIVO
                    const pausado = m.estado === 'PAUSADO'
                    const { titulo, detalle } = queSeVigila(m)
                    const quien = m.tipo === 'URL' ? m.idPublicacion : `"${m.valor}"`
                    return (
                        <li key={m.id} className={`vigilas-item${pausado ? ' vigilas-pausado' : ''}`}>
                            <span className={`mk ${mk.clase}`}>{mk.nombre}</span>
                            <div className="vigilas-que">
                                <strong>{titulo}</strong>
                                <span className="mini num">{detalle}</span>
                            </div>
                            <div className="vigilas-estado">
                                <span className={`estado ${estado.clase}`}>{estado.texto}</span>
                                {m.estado === 'ERROR' && m.motivo && <span className="mini">{m.motivo}</span>}
                            </div>
                            <dl className="vigilas-datos">
                                <div>
                                    <dt>Frecuencia</dt>
                                    <dd>Cada {m.frecuenciaHoras ?? 6} h</dd>
                                </div>
                                <div>
                                    <dt>Última captura</dt>
                                    <dd className="num">{cuando(m.ultimaCaptura)}</dd>
                                </div>
                            </dl>
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
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
