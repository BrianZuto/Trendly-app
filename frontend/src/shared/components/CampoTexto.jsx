import { useId } from 'react'

// `prefijo` y `sufijo` ("$", "%") van pegados al campo y no son parte de su nombre
export default function CampoTexto({ etiqueta, error, prefijo, sufijo, ...props }) {
    const id = useId()
    const idError = `${id}-error`
    const input = (
        <input
            id={id}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? idError : undefined}
            {...props}
        />
    )
    return (
        <div className="campo">
            <label htmlFor={id}>{etiqueta}</label>
            {prefijo || sufijo ? (
                <div className={`campo-control${prefijo ? ' con-prefijo' : ''}${sufijo ? ' con-sufijo' : ''}`}>
                    {prefijo && <span className="campo-prefijo" aria-hidden="true">{prefijo}</span>}
                    {input}
                    {sufijo && <span className="campo-sufijo" aria-hidden="true">{sufijo}</span>}
                </div>
            ) : (
                input
            )}
            {error && (
                <p id={idError} className="campo-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}
