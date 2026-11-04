import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@core/auth/useAuth'
import { EVENTO_ALERTAS, listarAlertas } from '@core/services/alertas.service'
import { LogoTrendly } from './PublicNavbar'
import './MainLayout.css'

const iniciales = (nombre = '') =>
    nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0].toUpperCase())
        .join('')

// Contador de alertas nuevas (SCRUM-49): se consulta al cambiar de página y cuando la bandeja avisa un cambio
function useAlertasNuevas(pathname) {
    const [nuevas, setNuevas] = useState(0)

    useEffect(() => {
        let vigente = true
        const contar = () =>
            listarAlertas({ estado: 'NUEVA' })
                .then((lista) => vigente && setNuevas(lista.length))
                .catch(() => {
                    // Sin contador si falla: no debe romper la navegación
                })
        contar()
        window.addEventListener(EVENTO_ALERTAS, contar)
        return () => {
            vigente = false
            window.removeEventListener(EVENTO_ALERTAS, contar)
        }
    }, [pathname])

    return nuevas
}

// La barra de la app es la pizarra de la plaza; el contenido va sobre papel
export default function MainLayout() {
    const { usuario, cerrarSesion } = useAuth()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [parametros] = useSearchParams()
    const busqueda = pathname === '/productos' ? (parametros.get('q') ?? '') : ''
    const nuevas = useAlertasNuevas(pathname)

    function salir() {
        cerrarSesion()
        navigate('/login', { replace: true })
    }

    // La búsqueda filtra la lista de productos; desde otra sección lleva a ella
    function buscar(evento) {
        const q = evento.target.value
        navigate(q ? `/productos?q=${encodeURIComponent(q)}` : '/productos', { replace: pathname === '/productos' })
    }

    return (
        <div className="app">
            <header className="app-barra">
                <div className="app-barra-fila">
                    <Link to="/dashboard" className="app-barra-marca" aria-label="Trendly, ir al panel">
                        <span className="app-barra-logo">
                            <LogoTrendly />
                        </span>
                        <span className="app-barra-nombre-marca" aria-hidden="true">
                            Trendly
                        </span>
                    </Link>
                    <label className="app-barra-buscar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                        <input
                            type="search"
                            aria-label="Buscar productos"
                            placeholder="Busca tus productos por nombre o SKU"
                            value={busqueda}
                            onChange={buscar}
                        />
                    </label>
                    {usuario?.nombre && (
                        <div className="app-barra-usuario">
                            <span className="app-barra-avatar" aria-hidden="true">
                                {iniciales(usuario.nombre)}
                            </span>
                            <span className="app-barra-quien">
                                {usuario.nombre}
                                {usuario.email && <span>{usuario.email}</span>}
                            </span>
                        </div>
                    )}
                    <button type="button" className="app-barra-salir" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
                        </svg>
                    </button>
                </div>
                <nav className="app-barra-nav" aria-label="Principal">
                    <NavLink to="/dashboard">Panel</NavLink>
                    <NavLink to="/productos">Productos</NavLink>
                    <NavLink to="/alertas" aria-label={nuevas > 0 ? `Alertas, ${nuevas} nuevas` : 'Alertas'}>
                        Alertas
                        {nuevas > 0 && (
                            <span className="app-barra-contador" aria-hidden="true">
                                {nuevas > 99 ? '99+' : nuevas}
                            </span>
                        )}
                    </NavLink>
                </nav>
            </header>
            <main className="app-contenido">
                <Outlet />
            </main>
        </div>
    )
}
