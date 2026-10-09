import { Outlet } from 'react-router-dom'
import PublicNavbar from './PublicNavbar'
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

            <PublicNavbar />

            <main className="auth-main">
                {/* Tarjeta glassmorphism */}
                <div className="auth-card">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}