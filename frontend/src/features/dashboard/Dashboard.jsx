import { Link } from 'react-router-dom'
import { useAuth } from '@core/auth/useAuth'

export default function Dashboard() {
    const { usuario } = useAuth()
    return (
        <section>
            <h1>Hola, {usuario?.nombre}</h1>
            <p>Bienvenido a Trendly.</p>
            <p>
                Empieza registrando los productos que quieres vigilar en <Link to="/productos">Productos</Link>.
            </p>
        </section>
    )
}