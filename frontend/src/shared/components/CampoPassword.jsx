import { useId, useState } from 'react'

function IconoOjo({ tachado }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
            {tachado && <path d="M3 3l18 18" />}
        </svg>
    )
}

export default function CampoPassword({ etiqueta, error, ayuda, ...props }) {
    const id = useId()
    const idError = `${id}-error`
    const idAyuda = `${id}-ayuda`
    const [visible, setVisible] = useState(false)
    const [mayusActiva, setMayusActiva] = useState(false)

    const descritoPor = [error && idError, ayuda && idAyuda].filter(Boolean).join(' ') || undefined

    return (
        <div className="campo">
            <label htmlFor={id}>{etiqueta}</label>
            <div className="campo-password">
                <input
                    {...props}
                    id={id}
                    type={visible ? 'text' : 'password'}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={descritoPor}
                    onKeyUp={(evento) => setMayusActiva(evento.getModifierState?.('CapsLock') ?? false)}
                    onBlur={() => setMayusActiva(false)}
                />
                <button
                    type="button"
                    className="boton-ojo"
                    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={visible}
                    onClick={() => setVisible((anterior) => !anterior)}
                >
                    <IconoOjo tachado={visible} />
                </button>
            </div>
            {mayusActiva && (
                <p className="campo-aviso" role="status">
                    Bloq Mayús está activado
                </p>
            )}
            {error && (
                <p id={idError} className="campo-error" role="alert">
                    {error}
                </p>
            )}
            {ayuda && <div id={idAyuda}>{ayuda}</div>}
        </div>
    )
}