import { useCallback, useEffect, useMemo, useState } from 'react'
import { setManejadorNoAutorizado } from '@core/api/client'
import { iniciarSesion, obtenerPerfil } from '@core/services/auth.service'
import { AuthContext } from './AuthContext'
import { guardarSesion, guardarToken, leerSesionVigente, limpiarSesion } from './token'

export function AuthProvider({ children }) {
    const [sesion, setSesion] = useState(leerSesionVigente)
    const [sesionExpirada, setSesionExpirada] = useState(false)

    const cerrarSesion = useCallback(() => {
        limpiarSesion()
        setSesion({ token: null, usuario: null })
    }, [])

    useEffect(() => {
        setManejadorNoAutorizado(() => {
            cerrarSesion()
            setSesionExpirada(true)
        })
        return () => setManejadorNoAutorizado(null)
    }, [cerrarSesion])

    const login = useCallback(async (credenciales) => {
        const { token } = await iniciarSesion(credenciales)
        guardarToken(token)
        try {
            const usuario = await obtenerPerfil()
            guardarSesion(token, usuario)
            setSesion({ token, usuario })
            setSesionExpirada(false)
            return usuario
        } catch (error) {
            limpiarSesion()
            throw error
        }
    }, [])

    const valor = useMemo(
        () => ({
            usuario: sesion.usuario,
            autenticado: Boolean(sesion.token),
            sesionExpirada,
            login,
            cerrarSesion,
        }),
        [sesion, sesionExpirada, login, cerrarSesion],
    )

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}