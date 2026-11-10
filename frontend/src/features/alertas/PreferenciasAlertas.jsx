import { useEffect, useId, useState } from 'react'
import { mensajeDeError } from '@core/api/errores'
import { guardarReglasAlerta, obtenerReglasAlerta } from '@core/services/alertas.service'
import CampoTexto from '@shared/components/CampoTexto'
import Dialogo from '@shared/components/Dialogo'
import Mensaje from '@shared/components/Mensaje'

// Mismo rango que ReglaAlertaRequest en el backend
function validarUmbral(texto) {
    const valor = Number(String(texto).replace(',', '.'))
    if (String(texto).trim() === '' || Number.isNaN(valor)) return 'Escribe el umbral en porcentaje'
    if (valor < 0.01 || valor > 100) return 'El umbral debe estar entre 0,01 y 100'
    if (Math.round(valor * 100) !== valor * 100) return 'El umbral admite hasta 2 decimales'
    return ''
}

// Preferencias de aviso (SCRUM-47, SCRUM-48): umbral, avisos de disponibilidad y correos.
// El correo de alertas enlaza aquí para que el vendedor pueda dejar de recibirlos (Ley 1581 de 2012)
export default function PreferenciasAlertas({ onCerrar, onGuardadas }) {
    const [reglas, setReglas] = useState(null)
    const [umbral, setUmbral] = useState('')
    const [errorUmbral, setErrorUmbral] = useState('')
    const [errorApi, setErrorApi] = useState('')
    const [guardando, setGuardando] = useState(false)

    useEffect(() => {
        let vigente = true
        obtenerReglasAlerta()
            .then((datos) => {
                if (!vigente) return
                setReglas(datos)
                setUmbral(String(datos.umbralPct))
            })
            .catch((e) => vigente && setErrorApi(mensajeDeError(e)))
        return () => {
            vigente = false
        }
    }, [])

    async function guardar(evento) {
        evento.preventDefault()
        const error = validarUmbral(umbral)
        setErrorUmbral(error)
        if (error) return
        setErrorApi('')
        setGuardando(true)
        try {
            const guardadas = await guardarReglasAlerta({ ...reglas, umbralPct: Number(String(umbral).replace(',', '.')) })
            onGuardadas(guardadas)
        } catch (e) {
            setErrorApi(mensajeDeError(e))
            setGuardando(false)
        }
    }

    return (
        <Dialogo titulo="Preferencias de aviso" subtitulo="Cuándo y cómo te avisa Trendly" className="dialogo-ancho preferencias" onCerrar={onCerrar}>
            {errorApi && <Mensaje tipo="error">{errorApi}</Mensaje>}
            {!reglas && !errorApi && <p className="dialogo-texto">Cargando tus preferencias…</p>}
            {reglas && (
                <form className="preferencias-form" onSubmit={guardar} noValidate>
                    <div>
                        <CampoTexto
                            etiqueta="Umbral de cambio"
                            name="umbralPct"
                            inputMode="decimal"
                            sufijo="%"
                            value={umbral}
                            error={errorUmbral}
                            onChange={(e) => {
                                setUmbral(e.target.value)
                                setErrorUmbral('')
                            }}
                        />
                        {!errorUmbral && <p className="preferencias-ayuda">Te avisamos cuando un competidor cambia su precio este porcentaje o más.</p>}
                    </div>
                    <Interruptor
                        titulo="Alertas por correo"
                        detalle="Te enviamos un correo con los cambios de precio de tu competencia. Desactívalo si prefieres verlos solo aquí."
                        activo={reglas.recibirCorreos}
                        onCambiar={(valor) => setReglas({ ...reglas, recibirCorreos: valor })}
                    />
                    <Interruptor
                        titulo="Avisos de disponibilidad"
                        detalle="Te avisamos cuando un competidor se queda sin stock o vuelve a tenerlo."
                        activo={reglas.avisarDisponibilidad}
                        onCambiar={(valor) => setReglas({ ...reglas, avisarDisponibilidad: valor })}
                    />
                    <div className="dialogo-acciones">
                        <button type="button" className="app-boton app-boton-claro" onClick={onCerrar}>
                            Cancelar
                        </button>
                        <button type="submit" className="app-boton" disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Guardar preferencias'}
                        </button>
                    </div>
                </form>
            )}
        </Dialogo>
    )
}

function Interruptor({ titulo, detalle, activo, onCambiar }) {
    const id = useId()
    return (
        <div className="preferencias-opcion">
            <div>
                <label htmlFor={id} className="preferencias-titulo">
                    {titulo}
                </label>
                <p id={`${id}-detalle`} className="preferencias-detalle">
                    {detalle}
                </p>
            </div>
            <input
                id={id}
                type="checkbox"
                role="switch"
                className="preferencias-switch"
                aria-describedby={`${id}-detalle`}
                checked={activo}
                onChange={(e) => onCambiar(e.target.checked)}
            />
        </div>
    )
}
