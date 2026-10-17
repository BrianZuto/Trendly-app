import { Outlet } from 'react-router-dom'
import PublicNavbar from './PublicNavbar'
import './PublicLayout.css'

export default function PublicLayout() {
    return (
        <div className="auth-root">
            <PublicNavbar />

            <main className="auth-main">
                {/* Pizarra lateral: recuerda qué hace Trendly mientras se llena el formulario */}
                <aside className="auth-tablero" aria-label="Qué hace Trendly">
                    <p className="auth-tablero-titulo">Tu competencia cambia de precio. Tú te enteras primero.</p>
                    <ul className="auth-tablero-lista" role="list">
                        <li>Monitoreo cada 6 horas en MercadoLibre y AliExpress</li>
                        <li>Tu margen actual frente a tu margen objetivo</li>
                        <li>Alertas cuando un precio o la disponibilidad cambia</li>
                    </ul>
                    <div className="etiqueta auth-etiqueta" aria-hidden="true">
                        <span className="etiqueta-titulo">Precio sugerido · ejemplo</span>
                        <strong className="etiqueta-precio cifra">$ 121.429</strong>
                    </div>
                </aside>

                <div className="auth-form">
                    <div className="auth-card">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    )
}
