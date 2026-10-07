import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@core/auth/useAuth'

export default function RutaPublica() {
    const { autenticado } = useAuth()
    return autenticado ? <Navigate to="/dashboard" replace /> : <Outlet />
}