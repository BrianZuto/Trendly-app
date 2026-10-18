import { Link } from 'react-router-dom'
import { useAuth } from '@core/auth/useAuth'
import './Dashboard.css'

// El panel completo (gráficas e historial) llega con SCRUM-43; por ahora, la bienvenida
export default function Dashboard() {
    const { usuario } = useAuth()
    return (
        <section className="panel-inicio">
            <p className="panel-inicio-antetitulo">Tu mercado hoy</p>
            <h1>Hola, {usuario?.nombre}</h1>
            <p className="panel-inicio-texto">
                Bienvenido a Trendly. Empieza registrando los productos que quieres vigilar; cuando lleguen las capturas de
                la competencia, aquí verás cómo se mueven sus precios frente a los tuyos.
            </p>
            <Link to="/productos" className="app-boton">
                Ir a mis productos
            </Link>
        </section>
    )
}
