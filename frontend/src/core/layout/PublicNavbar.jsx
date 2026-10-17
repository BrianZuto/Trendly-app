import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Tablero.css'
import './PublicNavbar.css'

// Cuatro paletas, la última encendida: el tablero en miniatura
export function LogoTrendly() {
  return (
    <svg className="logo-icon" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <rect x="4" y="5" width="11" height="10" rx="2" />
      <rect x="17" y="5" width="11" height="10" rx="2" />
      <rect x="4" y="17" width="11" height="10" rx="2" />
      <rect x="17" y="17" width="11" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )
}

export default function PublicNavbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const isAuthView = pathname === '/login' || pathname === '/registro'
  const recorridoHref = pathname === '/' ? '#recorrido' : '/#recorrido'

  function regresar() {
    navigate(location.key === 'default' ? '/' : -1)
  }

  return (
    <header className="pub-barra">
      <nav className="pub-barra-nav" aria-label="Navegación principal">
        {isAuthView && (
          <button type="button" className="pub-barra-volver" aria-label="Regresar a la vista anterior" onClick={regresar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
        )}
        <Link to="/" className="pub-barra-marca" aria-label="Volver al inicio de Trendly">
          <LogoTrendly />
        </Link>
        <ul className="pub-barra-enlaces" role="list">
          <li><a href={recorridoHref}>Cómo funciona</a></li>
          <li><Link to="/politica-datos">Política de datos</Link></li>
        </ul>
        {!isAuthView && (
          <>
            <Link to="/login" className="pub-barra-entrar">Iniciar sesión</Link>
            <Link to="/registro" className="pub-barra-accion">Crear cuenta</Link>
          </>
        )}
      </nav>
    </header>
  )
}
