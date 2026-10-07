import { Outlet } from 'react-router-dom'

export default function PublicLayout() {
    return (
        <main className="publico">
            <div className="tarjeta">
                <p className="marca marca-grande">Trendly</p>
                <Outlet />
            </div>
        </main>
    )
}