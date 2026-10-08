import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { mensajeDeError } from '@core/api/errores'
import { useAuth } from '@core/auth/useAuth'
import CampoPassword from '@shared/components/CampoPassword'
import CampoTexto from '@shared/components/CampoTexto'
import Mensaje from '@shared/components/Mensaje'
import { validarLogin } from '@shared/utils/validaciones'

export default function Login() {
    const { login, sesionExpirada } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [valores, setValores] = useState({ email: '', password: '' })
    const [errores, setErrores] = useState({})
    const [errorApi, setErrorApi] = useState('')
    const [enviando, setEnviando] = useState(false)

    function cambiar(evento) {
        const { name, value } = evento.target
        setValores((anterior) => ({ ...anterior, [name]: value }))
        setErrores((anterior) => ({ ...anterior, [name]: '' }))
    }

    async function enviar(evento) {
        evento.preventDefault()
        const encontrados = validarLogin(valores)
        setErrores(encontrados)
        if (Object.keys(encontrados).length > 0) return

        setEnviando(true)
        setErrorApi('')
        try {
            await login({ email: valores.email.trim(), password: valores.password })
            navigate('/dashboard', { replace: true })
        } catch (error) {
            setErrorApi(mensajeDeError(error, { 401: 'Credenciales inválidas' }))
            setEnviando(false)
        }
    }

    return (
        <>
            <h1>Iniciar sesión</h1>
            <p className="auth-subtitle">Bienvenido de nuevo a Trendly</p>
            {location.state?.registroExitoso && <Mensaje tipo="exito">Cuenta creada. Inicia sesión para continuar.</Mensaje>}
            {sesionExpirada && <Mensaje tipo="info">Tu sesión expiró. Inicia sesión de nuevo.</Mensaje>}
            {errorApi && <Mensaje tipo="error">{errorApi}</Mensaje>}

            <form onSubmit={enviar} noValidate>
                <CampoTexto
                    etiqueta="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={valores.email}
                    onChange={cambiar}
                    error={errores.email}
                />
                <CampoPassword
                    etiqueta="Contraseña"
                    name="password"
                    autoComplete="current-password"
                    value={valores.password}
                    onChange={cambiar}
                    error={errores.password}
                />
                <button type="submit" className="boton" disabled={enviando}>
                    {enviando ? 'Ingresando...' : 'Iniciar sesión'}
                </button>
            </form>

            <p className="pie">
                ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
            </p>
        </>
    )
}