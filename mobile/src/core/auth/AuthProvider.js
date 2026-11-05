import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { setManejadorNoAutorizado, setToken } from '@/core/api/client'
import { iniciarSesion, obtenerPerfil } from '@/core/services/api'
import { guardarSesion, leerSesionGuardada, limpiarSesion, msParaVencer, tokenVigente } from './token'

const AuthContext = createContext(null)

export const AVISO_SESION_VENCIDA = 'Tu sesión venció. Vuelve a iniciar sesión.'
// setTimeout no admite más de ~24,8 días; si el token dura más, el chequeo al volver a la app lo cubre
const MAX_TIMER_MS = 2_147_483_647

export function AuthProvider({ children }) {
    const [cargando, setCargando] = useState(true)
    const [sesion, setSesion] = useState(null)
    const [aviso, setAviso] = useState(null)
    const sesionRef = useRef(null)

    const aplicar = useCallback((nueva) => {
        sesionRef.current = nueva
        setToken(nueva?.token ?? null)
        setSesion(nueva)
    }, [])

    const cerrarSesion = useCallback(
        async ({ vencida = false } = {}) => {
            if (!sesionRef.current) return
            aplicar(null)
            setAviso(vencida ? AVISO_SESION_VENCIDA : null)
            await limpiarSesion()
        },
        [aplicar],
    )

    // Al abrir la app se recupera la sesión guardada, solo si el token sigue vigente
    useEffect(() => {
        let vigente = true
        async function recuperar() {
            try {
                const guardada = await leerSesionGuardada()
                if (!vigente) return
                if (guardada && tokenVigente(guardada.token)) {
                    aplicar(guardada)
                } else if (guardada) {
                    setAviso(AVISO_SESION_VENCIDA)
                    await limpiarSesion()
                }
            } catch {
                // Si el almacén seguro falla, se pide iniciar sesión otra vez
            } finally {
                if (vigente) setCargando(false)
            }
        }
        // recuperar() maneja sus propios errores, así que no hay promesa que pueda quedar rechazada
        void recuperar()
        return () => {
            vigente = false
        }
    }, [aplicar])

    // Si el API responde 401, el token venció o lo invalidaron: de vuelta al login
    useEffect(() => {
        setManejadorNoAutorizado(() => cerrarSesion({ vencida: true }))
        return () => setManejadorNoAutorizado(null)
    }, [cerrarSesion])

    // También se cierra al llegar la hora de vencimiento, y al volver a la app (los timers no corren en segundo plano)
    useEffect(() => {
        if (!sesion) return undefined
        const restante = msParaVencer(sesion.token)
        const timer = Number.isFinite(restante)
            ? setTimeout(() => cerrarSesion({ vencida: true }), Math.min(restante, MAX_TIMER_MS))
            : null
        const suscripcion = AppState.addEventListener('change', (estado) => {
            if (estado === 'active' && !tokenVigente(sesion.token)) cerrarSesion({ vencida: true })
        })
        return () => {
            if (timer) clearTimeout(timer)
            suscripcion.remove()
        }
    }, [sesion, cerrarSesion])

    const entrar = useCallback(
        async ({ email, password }) => {
            const { token } = await iniciarSesion({ email, password })
            setToken(token)
            try {
                const usuario = await obtenerPerfil()
                await guardarSesion(token, usuario)
                setAviso(null)
                aplicar({ token, usuario })
            } catch (error) {
                setToken(null)
                throw error
            }
        },
        [aplicar],
    )

    const valor = useMemo(
        () => ({ cargando, sesion, usuario: sesion?.usuario ?? null, aviso, entrar, cerrarSesion }),
        [cargando, sesion, aviso, entrar, cerrarSesion],
    )

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const contexto = useContext(AuthContext)
    if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider')
    return contexto
}
