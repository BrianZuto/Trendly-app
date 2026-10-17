import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicNavbar, { LogoTrendly } from '@core/layout/PublicNavbar'
import './Landing.css'

/* ─── Íconos SVG ─── */
const IconoCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconoFlecha = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)

// Producto de ejemplo: las cifras son ilustrativas y se marcan como tal en el tablero
const DATOS_DEMO = {
  nombre: 'Audífonos Bluetooth',
  sku: 'DEMO-001',
  costo: 85000,
  precioVenta: 119900,
  margenObjetivo: 30,
  competidor: 139900,
}

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatoPorcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/* ─── Tablero: el producto de ejemplo con su precio reescrito ─── */
function TableroPrecios() {
  const precioSugerido = Math.round(DATOS_DEMO.costo / (1 - DATOS_DEMO.margenObjetivo / 100))
  const margenActual = ((DATOS_DEMO.precioVenta - DATOS_DEMO.costo) / DATOS_DEMO.precioVenta) * 100
  const diferenciaCompetidor = DATOS_DEMO.competidor - DATOS_DEMO.precioVenta

  const filas = [
    { nombre: 'Costo', fuente: 'AliExpress', valor: DATOS_DEMO.costo },
    { nombre: 'Competidor', fuente: 'MercadoLibre', valor: DATOS_DEMO.competidor, clase: 'fila-competidor' },
    { nombre: 'Tu precio', fuente: 'venta actual', valor: DATOS_DEMO.precioVenta, clase: 'fila-propia' },
  ]

  return (
    <article className="tablero-precios" aria-label="Vista de ejemplo de comparación de precios">
      <header className="tablero-producto">
        <h2>{DATOS_DEMO.nombre}</h2>
        <span>SKU {DATOS_DEMO.sku}</span>
        <span className="tablero-ejemplo">Ejemplo</span>
      </header>

      <table className="tablero-tabla">
        <caption className="sr-only">Precios de referencia en pesos colombianos</caption>
        <tbody>
          {filas.map(({ nombre, fuente, valor, clase }) => (
            <tr key={nombre} className={clase}>
              <th scope="row">
                {nombre} <small>{fuente}</small>
              </th>
              <td className="cifra">
                <span>{formatoCOP.format(valor)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="tablero-posicion">
        <strong className="cifra">{formatoCOP.format(diferenciaCompetidor)} menos</strong> que el precio observado en MercadoLibre
      </p>

      <div className="etiqueta tablero-etiqueta">
        <span className="etiqueta-titulo">Precio sugerido · objetivo {DATOS_DEMO.margenObjetivo}%</span>
        <strong className="etiqueta-precio cifra">{formatoCOP.format(precioSugerido)}</strong>
        <span className="etiqueta-nota">Margen actual: {formatoPorcentaje.format(margenActual)}%</span>
        <span className="etiqueta-delta">
          <span>Para alcanzar tu objetivo</span>
          <strong className="cifra">+{formatoCOP.format(precioSugerido - DATOS_DEMO.precioVenta)}</strong>
        </span>
      </div>
    </article>
  )
}

/* ─── Registro rápido: el email viaja al formulario de registro ─── */
function RepisaRegistro() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  function enviar(evento) {
    evento.preventDefault()
    navigate('/registro', { state: { email: email.trim() } })
  }

  return (
    <form className="tablero-repisa" onSubmit={enviar}>
      <label htmlFor="repisa-email" className="sr-only">Tu email</label>
      <input
        id="repisa-email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
      />
      <button type="submit" className="btn btn-etiqueta btn-lg">
        Crear mi cuenta
        <IconoFlecha />
      </button>
      <p className="repisa-nota">
        Gratis hasta 10 productos. <a href="#planes">Ver planes</a>
      </p>
    </form>
  )
}

function PlanItem({ texto }) {
  return (
    <li className="plan-item">
      <IconoCheck />
      {texto}
    </li>
  )
}

export default function Landing() {
  return (
    <div className="landing-root">
      <PublicNavbar />

      <main>
        {/* ── Primer pantallazo: la pizarra ── */}
        <section className="tablero" aria-labelledby="hero-heading">
          <div className="tablero-marco">
            <div className="tablero-encabezado">
              <h1 id="hero-heading" className="hero-title">
                Domina el mercado y protege tu margen
              </h1>
              <p className="hero-subtitle">
                Trendly monitorea precios y disponibilidad en MercadoLibre y AliExpress, y sugiere un precio y margen a partir del costo y el margen objetivo de tu producto.
              </p>
            </div>
            <TableroPrecios />
            <RepisaRegistro />
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section className="recorrido" aria-labelledby="steps-heading">
          <div className="seccion">
            <h2 id="steps-heading" className="seccion-titulo">De tus productos a decisiones de precio</h2>
            <ol className="recorrido-lista">
              <li className="recorrido-paso">
                <span className="recorrido-numero cifra" aria-hidden="true">1</span>
                <h3>Registra tu producto</h3>
                <p>Agrega su costo, precio de venta y margen objetivo</p>
              </li>
              <li className="recorrido-paso">
                <span className="recorrido-numero cifra" aria-hidden="true">2</span>
                <h3>Monitoreamos el mercado</h3>
                <p>La recolección programada consulta competidores cada 6 horas</p>
              </li>
              <li className="recorrido-paso">
                <span className="recorrido-numero cifra" aria-hidden="true">3</span>
                <h3>Revisa sugerencias y alertas</h3>
                <p>Consulta el precio y margen sugeridos, y las alertas generadas tras cada recolección</p>
              </li>
            </ol>
          </div>
        </section>

        {/* ── Planes ── */}
        <section id="planes" className="planes" aria-labelledby="planes-heading">
          <div className="seccion">
            <h2 id="planes-heading" className="seccion-titulo">Elige el plan que se adapta a tu negocio</h2>
            <div className="planes-grid">
              <article className="plan" aria-labelledby="plan-gratuito">
                <div className="etiqueta plan-etiqueta">
                  <h3 id="plan-gratuito" className="etiqueta-titulo">Gratuito</h3>
                  <strong className="etiqueta-precio cifra">$0</strong>
                </div>
                <p className="plan-descripcion">Para empezar a organizar tus productos y monitoreos.</p>
                <ul className="plan-features" role="list">
                  <PlanItem texto="Hasta 10 productos registrados" />
                  <PlanItem texto="Recolección programada cada 6 horas" />
                  <PlanItem texto="Precio y margen sugeridos según tu objetivo" />
                </ul>
                <Link to="/registro" className="btn btn-pizarra btn-lg plan-cta">Crear cuenta gratis</Link>
              </article>

              <article className="plan plan-pro" aria-labelledby="plan-pro">
                <div className="etiqueta plan-etiqueta">
                  <h3 id="plan-pro" className="etiqueta-titulo">Pro</h3>
                  <strong className="etiqueta-precio plan-por-anunciar">Precio por anunciar</strong>
                </div>
                <p className="plan-descripcion">Para vendedores que necesitan monitorear más productos.</p>
                <ul className="plan-features" role="list">
                  <PlanItem texto="Hasta 100 productos registrados" />
                  <PlanItem texto="Frecuencia configurable desde 1 hora" />
                  <PlanItem texto="Precio y margen sugeridos según tu objetivo" />
                </ul>
                <Link to="/registro" className="btn btn-etiqueta btn-lg plan-cta">Empezar con el gratuito</Link>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="pie-tablero">
        <div className="pie-tablero-interior">
          <Link to="/" className="landing-logo" aria-label="Trendly, inicio">
            <LogoTrendly />
            Trendly
          </Link>
          <p>Monitoreo y análisis de precios para vendedores</p>
          <Link to="/politica-datos">Política de tratamiento de datos</Link>
          <p className="pie-copy">© 2026 Trendly</p>
        </div>
      </footer>
    </div>
  )
}
