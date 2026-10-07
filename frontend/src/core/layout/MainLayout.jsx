import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@core/auth/useAuth'

export default function MainLayout() {
    const { usuario, cerrarSesion } = useAuth()
    const navigate = useNavigate()

    function salir() {
        cerrarSesion()
        navigate('/login', { replace: true })
    }

    return (
        <div className="app">
            <header className="barra">
                <span className="marca">Trendly</span>
                <nav aria-label="Principal">
                    <NavLink to="/dashboard">Dashboard</NavLink>
                    <NavLink to="/productos">Productos</NavLink>
                </nav>
                <div className="barra-usuario">
                    <span>{usuario?.nombre}</span>
                    <button type="button" className="boton boton-secundario" onClick={salir}>
                        Cerrar sesión
                    </button>
                </div>
            </header>
            <main className="contenido">
                <Outlet />
            </main>
        </div>
    )
}