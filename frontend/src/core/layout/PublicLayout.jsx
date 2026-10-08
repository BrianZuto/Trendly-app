import { Link } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import './PublicLayout.css'

export default function PublicLayout() {
    return (
        <div className="auth-root">
            {/* Fondo con cuadrícula y orbes — mismo sistema que landing */}
            <div className="auth-bg" aria-hidden="true">
                <div className="auth-bg-grid"></div>
                <div className="auth-bg-orb auth-orb-1"></div>
                <div className="auth-bg-orb auth-orb-2"></div>
            </div>

            {/* Barra mínima */}
            <header className="auth-header">
                <Link to="/" className="auth-logo" aria-label="Volver al inicio de Trendly">
                    <span className="auth-logo-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                    </span>
                    Trendly
                </Link>
            </header>

            <main className="auth-main">
                {/* Tarjeta glassmorphism */}
                <div className="auth-card">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}