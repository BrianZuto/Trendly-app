import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mensajeDeError } from '@core/api/errores'
import { registrar } from '@core/services/auth.service'
import CampoPassword from '@shared/components/CampoPassword'
import CampoTexto from '@shared/components/CampoTexto'
import IndicadorPassword from '@shared/components/IndicadorPassword'
import Mensaje from '@shared/components/Mensaje'
import { validarRegistro } from '@shared/utils/validaciones'

const INICIAL = { nombre: '', email: '', password: '', confirmar: '', aceptaPolitica: false }

export default function Registro() {
    const navigate = useNavigate()
    const [valores, setValores] = useState(INICIAL)
    const [errores, setErrores] = useState({})
    const [errorApi, setErrorApi] = useState('')
    const [enviando, setEnviando] = useState(false)

    const coincide = valores.confirmar !== '' && valores.confirmar === valores.password

    function cambiar(evento) {
        const { name, type, checked, value } = evento.target
        setValores((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }))
        setErrores((anterior) => ({ ...anterior, [name]: '' }))
    }

    async function enviar(evento) {
        evento.preventDefault()
        const encontrados = validarRegistro(valores)
        setErrores(encontrados)
        if (Object.keys(encontrados).length > 0) return

        setEnviando(true)
        setErrorApi('')
        try {
            await registrar({
                nombre: valores.nombre.trim(),
                email: valores.email.trim(),
                password: valores.password,
                aceptaPolitica: valores.aceptaPolitica,
            })
            navigate('/login', { replace: true, state: { registroExitoso: true } })
        } catch (error) {
            setErrorApi(mensajeDeError(error, { 409: 'Email ya registrado' }))
            setEnviando(false)
        }
    }

    return (
        <>
            <h1>Crear cuenta</h1>
            {errorApi && <Mensaje tipo="error">{errorApi}</Mensaje>}

            <form onSubmit={enviar} noValidate>
                <fieldset className="grupo">
                    <legend>Tus datos</legend>
                    <CampoTexto
                        etiqueta="Nombre"
                        name="nombre"
                        autoComplete="name"
                        autoFocus
                        value={valores.nombre}
                        onChange={cambiar}
                        error={errores.nombre}
                    />
                    <CampoTexto
                        etiqueta="Email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={valores.email}
                        onChange={cambiar}
                        error={errores.email}
                    />
                </fieldset>

                <fieldset className="grupo">
                    <legend>Tu contraseña</legend>
                    <CampoPassword
                        etiqueta="Contraseña"
                        name="password"
                        autoComplete="new-password"
                        value={valores.password}
                        onChange={cambiar}
                        error={errores.password}
                        ayuda={<IndicadorPassword valor={valores.password} />}
                    />
                    <CampoPassword
                        etiqueta="Confirmar contraseña"
                        name="confirmar"
                        autoComplete="new-password"
                        value={valores.confirmar}
                        onChange={cambiar}
                        error={errores.confirmar}
                        ayuda={
                            valores.confirmar !== '' && (
                                <p className={`coincidencia ${coincide ? 'coincide' : ''}`}>
                                    <span aria-hidden="true">{coincide ? '✓' : '○'}</span>{' '}
                                    {coincide ? 'Las contraseñas coinciden' : 'Las contraseñas aún no coinciden'}
                                </p>
                            )
                        }
                    />
                </fieldset>

                <div className="campo campo-check">
                    <label>
                        <input
                            type="checkbox"
                            name="aceptaPolitica"
                            checked={valores.aceptaPolitica}
                            onChange={cambiar}
                            aria-invalid={errores.aceptaPolitica ? 'true' : undefined}
                        />
                        <span>Acepto la política de tratamiento de datos</span>
                    </label>
                    <Link to="/politica-datos" target="_blank" rel="noopener noreferrer">
                        Leer la política
                    </Link>
                    {errores.aceptaPolitica && (
                        <p className="campo-error" role="alert">
                            {errores.aceptaPolitica}
                        </p>
                    )}
                </div>

                <button type="submit" className="boton" disabled={enviando}>
                    {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
            </form>

            <p className="pie">
                ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
        </>
    )
}