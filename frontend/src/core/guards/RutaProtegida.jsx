import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@core/auth/useAuth'

export default function RutaProtegida() {
    const { autenticado } = useAuth()
    return autenticado ? <Outlet /> : <Navigate to="/login" replace />
}