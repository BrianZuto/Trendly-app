import { useCallback, useEffect, useRef, useState } from 'react'
import { mensajeDeError } from '@/core/api/errores'

// Carga datos del API al montar la pantalla, con recarga manual (deslizar hacia abajo o "Reintentar").
// "actualizando" indica que se están trayendo datos nuevos mientras se siguen mostrando los anteriores (p. ej. al filtrar)
export function useCarga(cargar) {
    const [estado, setEstado] = useState({ datos: null, error: null, cargando: true, refrescando: false, actualizando: false })
    const montado = useRef(true)

    const ejecutar = useCallback(
        async (refrescando = false) => {
            setEstado((previo) => ({
                ...previo,
                error: null,
                cargando: !refrescando && !previo.datos,
                actualizando: !refrescando && Boolean(previo.datos),
                refrescando,
            }))
            try {
                const datos = await cargar()
                if (montado.current) setEstado({ datos, error: null, cargando: false, refrescando: false, actualizando: false })
            } catch (error) {
                // Un 401 ya lo atiende AuthProvider (vuelve al login); el resto se muestra en pantalla
                if (montado.current) {
                    setEstado((previo) => ({
                        ...previo,
                        error: mensajeDeError(error),
                        cargando: false,
                        refrescando: false,
                        actualizando: false,
                    }))
                }
            }
        },
        [cargar],
    )

    useEffect(() => {
        montado.current = true
        ejecutar()
        return () => {
            montado.current = false
        }
    }, [ejecutar])

    return { ...estado, recargar: () => ejecutar(false), refrescar: () => ejecutar(true) }
}
