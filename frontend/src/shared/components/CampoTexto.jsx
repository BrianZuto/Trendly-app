import { useId } from 'react'

export default function CampoTexto({ etiqueta, error, ...props }) {
    const id = useId()
    const idError = `${id}-error`
    return (
        <div className="campo">
            <label htmlFor={id}>{etiqueta}</label>
            <input
                id={id}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? idError : undefined}
                {...props}
            />
            {error && (
                <p id={idError} className="campo-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}