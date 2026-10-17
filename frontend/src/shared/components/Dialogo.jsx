import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Dialogo.css'

const ENFOCABLES = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

// Ventana modal propia: Escape cierra, el foco queda adentro y vuelve a donde estaba al cerrar
export default function Dialogo({ titulo, subtitulo, rol = 'dialog', className = '', onCerrar, children }) {
    const ref = useRef(null)
    const idTitulo = useId()

    useEffect(() => {
        const anterior = document.activeElement
        const nodo = ref.current
        // El primer campo antes que la X de cerrar: se abre para escribir
        const primero = nodo.querySelector('input:not([disabled])') ?? nodo.querySelector(ENFOCABLES)
        ;(primero ?? nodo).focus()
        const desborde = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = desborde
            anterior?.focus?.()
        }
    }, [])

    function teclado(evento) {
        if (evento.key === 'Escape') {
            evento.stopPropagation()
            onCerrar()
            return
        }
        if (evento.key !== 'Tab') return
        const enfocables = [...ref.current.querySelectorAll(ENFOCABLES)]
        if (enfocables.length === 0) return
        const primero = enfocables[0]
        const ultimo = enfocables[enfocables.length - 1]
        if (evento.shiftKey && document.activeElement === primero) {
            evento.preventDefault()
            ultimo.focus()
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault()
            primero.focus()
        }
    }

    return createPortal(
        <div
            className="dialogo-fondo"
            onMouseDown={(evento) => evento.target === evento.currentTarget && onCerrar()}
        >
            <div
                ref={ref}
                className={`dialogo ${className}`.trim()}
                role={rol}
                aria-modal="true"
                aria-labelledby={idTitulo}
                tabIndex={-1}
                onKeyDown={teclado}
            >
                <div className={`dialogo-cabeza${subtitulo ? ' con-subtitulo' : ''}`}>
                    <div>
                        <h2 id={idTitulo} className="dialogo-titulo">
                            {titulo}
                        </h2>
                        {subtitulo && <p className="dialogo-subtitulo">{subtitulo}</p>}
                    </div>
                    {subtitulo && (
                        <button type="button" className="dialogo-cerrar" aria-label="Cerrar" onClick={onCerrar}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                        </button>
                    )}
                </div>
                {children}
            </div>
        </div>,
        document.body,
    )
}
