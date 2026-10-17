import { Link, useLocation, useNavigate } from 'react-router-dom'
import './PublicNavbar.css'

export function LogoTrendly() {
  return (
    <svg className="logo-icon" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="currentColor" />
      <path d="M14 13h17l7 11-7 11H14a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2z" fill="#ffd23f" />
      <circle cx="30" cy="24" r="2.6" fill="currentColor" />
      <path d="M17 20h8M17 24h6M17 28h8" stroke="#16130d" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export default function PublicNavbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const isAuthView = pathname === '/login' || pathname === '/registro'
  const planesHref = pathname === '/' ? '#planes' : '/#planes'

  function regresar() {
    navigate(location.key === 'default' ? '/' : -1)
  }

  return (
    <header className="landing-header">
      <nav className="landing-nav" aria-label="Navegación principal">
        {isAuthView && (
          <button type="button" className="nav-home" aria-label="Regresar a la vista anterior" onClick={regresar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
        )}
        <Link to="/" className="landing-logo" aria-label="Volver al inicio de Trendly">
          <LogoTrendly />
          Trendly
        </Link>
        <ul className="nav-links" role="list">
          <li><a href={planesHref} className="nav-link">Planes</a></li>
          <li><Link to="/politica-datos" className="nav-link">Política de datos</Link></li>
        </ul>
        {!isAuthView && (
          <div className="nav-ctas">
            <Link to="/login" className="btn btn-outline">Iniciar sesión</Link>
            <Link to="/registro" className="btn btn-etiqueta">Empezar gratis</Link>
          </div>
        )}
      </nav>
    </header>
  )
}
