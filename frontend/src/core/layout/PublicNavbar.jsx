import { Link, useLocation, useNavigate } from 'react-router-dom'
import './PublicNavbar.css'

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
        <Link to="/" className="landing-logo" aria-label="Volver al inicio de Trendly">
          <span className="logo-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4.5 5.5h15v3.6h-5.7v9.4h-3.6V9.1H4.5z" />
            </svg>
          </span>
          Trendly
        </Link>
        <ul className="nav-links" role="list">
          <li><a href={planesHref} className="nav-link">Planes</a></li>
          <li><Link to="/politica-datos" className="nav-link">Política de datos</Link></li>
        </ul>
        {isAuthView ? (
          <div className="nav-ctas nav-ctas-home">
            <button type="button" className="nav-home" aria-label="Regresar a la vista anterior" onClick={regresar}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="nav-ctas">
            <Link to="/login" className="btn btn-outline">Iniciar sesión</Link>
            <Link to="/registro" className="btn btn-primary">Empezar gratis</Link>
          </div>
        )}
      </nav>
    </header>
  )
}
