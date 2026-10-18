import { Link } from 'react-router-dom'

export default function PoliticaDatos() {
    return (
        <main className="publico">
            <article className="tarjeta tarjeta-ancha">
                <p className="marca marca-grande">Trendly</p>
                <h1>Política de tratamiento de datos personales</h1>

                <h2>Responsable</h2>
                <p>
                    Trendly, proyecto académico del curso Ingeniería de Software III de la Universidad del Quindío, es responsable del
                    tratamiento de los datos personales que registras en la plataforma, conforme a la Ley 1581 de 2012.
                </p>

                <h2>Datos que recolectamos</h2>
                <p>Tu nombre, tu correo electrónico, tu contraseña (guardada cifrada) y los datos de los productos que registras.</p>

                <h2>Para qué los usamos</h2>
                <ul>
                    <li>Crear y administrar tu cuenta.</li>
                    <li>Monitorear precios y calcular sugerencias para tus productos.</li>
                    <li>Enviarte alertas y reportes sobre tus productos.</li>
                </ul>

                <h2>Tus derechos</h2>
                <p>
                    Puedes conocer, actualizar y rectificar tus datos, solicitar su supresión, revocar tu autorización y pedir prueba de
                    ella en cualquier momento.
                </p>

                <h2>Autorización</h2>
                <p>
                    Al marcar la casilla de aceptación en el registro autorizas de forma previa, expresa e informada este tratamiento. Se
                    guarda la fecha en que lo aceptaste.
                </p>

                <p className="pie">
                    <Link to="/registro">Volver al registro</Link>
                </p>
            </article>
        </main>
    )
}