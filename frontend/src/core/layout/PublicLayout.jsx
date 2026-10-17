import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Paletas from '@shared/components/Paletas'
import PublicNavbar from './PublicNavbar'
import './PublicLayout.css'

const SALUDOS = {
    '/login': ['BIENVENIDO', 'DE NUEVO'],
    '/registro': ['TU PRECIO,', 'AL DIA'],
}

// Productos de ejemplo que el tablero va mostrando mientras se llena el formulario
const MUESTRAS = [
    { producto: 'AUDIFONOS BT', competidor: '$139.900', sugerido: '$121.429' },
    { producto: 'LAMPARA LED', competidor: '$64.900', sugerido: '$57.000' },
    { producto: 'TERMO 1L', competidor: '$45.500', sugerido: '$41.300' },
]

function TableroAcceso() {
    const [indice, setIndice] = useState(0)

    useEffect(() => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
        const t = setInterval(() => setIndice((i) => (i + 1) % MUESTRAS.length), 4200)
        return () => clearInterval(t)
    }, [])

    const { producto, competidor, sugerido } = MUESTRAS[indice]
    return (
        <div className="tablero-3d acceso-tablero-3d">
            <div className="tablero-fila">
                <span className="tablero-fila-nombre"><b>Producto</b><span>Ejemplo</span></span>
                <Paletas texto={producto} largo={12} retraso={500} />
            </div>
            <div className="tablero-fila">
                <span className="tablero-fila-nombre"><b>Competidor</b><span>MercadoLibre</span></span>
                <Paletas texto={competidor} largo={9} alinear="der" retraso={640} />
            </div>
            <div className="tablero-fila">
                <span className="tablero-fila-nombre"><b>Sugerido</b><span>Margen 30%</span></span>
                <Paletas texto={sugerido} largo={9} alinear="der" acento retraso={780} />
            </div>
        </div>
    )
}

export default function PublicLayout() {
    const { pathname } = useLocation()
    const saludo = SALUDOS[pathname] ?? SALUDOS['/login']
    const largo = Math.max(...saludo.map((l) => l.length))

    return (
        <div className="tb-pagina">
            <PublicNavbar />

            <main className="tb-rejilla acceso">
                {/* Tablero lateral: recuerda qué hace Trendly mientras se llena el formulario */}
                <aside className="mosaico mosaico-alto acceso-tablero tb-sube" aria-label="Qué hace Trendly">
                    <div className="acceso-saludo">
                        {saludo.map((linea, n) => (
                            <Paletas key={`${pathname}-${n}`} texto={linea} largo={largo} retraso={300 + n * 220} />
                        ))}
                    </div>
                    <TableroAcceso />
                    <p className="acceso-nota">Cifras de ejemplo. Trendly recoge los precios de tus competidores cada 6 horas.</p>
                </aside>

                <div className="mosaico mosaico-papel acceso-form tb-sube" style={{ '--i': 1 }}>
                    <div className="auth-card">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    )
}
