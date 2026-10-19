import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicNavbar from '@core/layout/PublicNavbar'
import Paletas from '@shared/components/Paletas'
import './Landing.css'

const IconoFlecha = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const PRODUCTO_ACTUAL = {
  nombre: 'Audífonos Pro',
  costo: 85000,
  precioVenta: 119900,
  margenObjetivo: 30,
  competidor: 139900,
}

const formatoMiles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const precio = (n) => `$${formatoMiles.format(n)}`

function precioSugerido(costo, margen) {
  const m = Math.min(95, Math.max(0, margen))
  return Math.round(costo / (1 - m / 100))
}

const reducido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const punteroFino = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

/* ─── Tablero 3D: producto real con el precio sugerido en amarillo ─── */
function TableroHeroe({ costo, margen }) {
  const escena = useRef(null)
  const tablero = useRef(null)
  const [encendido, setEncendido] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setEncendido(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const zona = escena.current
    if (!zona || reducido() || !punteroFino()) return undefined
    function mover(e) {
      const r = zona.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      tablero.current.style.setProperty('--rx', `${9 - y * 8}deg`)
      tablero.current.style.setProperty('--ry', `${-18 + x * 14}deg`)
    }
    function salir() {
      tablero.current.style.removeProperty('--rx')
      tablero.current.style.removeProperty('--ry')
    }
    zona.addEventListener('pointermove', mover)
    zona.addEventListener('pointerleave', salir)
    return () => {
      zona.removeEventListener('pointermove', mover)
      zona.removeEventListener('pointerleave', salir)
    }
  }, [])

  const filas = [
    { nombre: 'Producto', fuente: 'Trendly', texto: PRODUCTO_ACTUAL.nombre, largo: 12, alinear: 'izq' },
    { nombre: 'Costo', fuente: 'AliExpress', texto: precio(costo) },
    { nombre: 'Competidor', fuente: 'MercadoLibre', texto: precio(PRODUCTO_ACTUAL.competidor) },
    { nombre: 'Tu precio', fuente: 'Venta actual', texto: precio(PRODUCTO_ACTUAL.precioVenta) },
    { nombre: 'Sugerido', fuente: `Margen ${margen}%`, texto: precio(precioSugerido(costo, margen)), acento: true },
  ]

  return (
    <section ref={escena} className={`mosaico mosaico-alto ld-tablero tb-sube${encendido ? ' encendido' : ''}`} style={{ '--i': 2 }} aria-labelledby="ld-tablero-titulo">
      <h2 id="ld-tablero-titulo" className="sr-only">Tablero de productos</h2>
      <div ref={tablero} className="tablero-3d">
        {filas.map(({ nombre, fuente, texto, largo = 9, alinear = 'der', acento }, n) => (
          <div className="tablero-fila" key={nombre}>
            <span className="tablero-fila-nombre"><b>{nombre}</b><span>{fuente}</span></span>
            <Paletas texto={encendido ? texto : ''} largo={largo} alinear={alinear} acento={acento} retraso={250 + n * 160} />
          </div>
        ))}
      </div>
      <p className="ld-tablero-pie">
        <span>Monitoreo activo</span>
        <span>Recolección cada <b className="cifra">6 horas</b></span>
      </p>
    </section>
  )
}

/* ─── La cosa viva: tu costo y tu margen reescriben el precio sugerido ─── */
function Calculadora({ costo, margen, onCambio }) {
  const [texto, setTexto] = useState({ costo: formatoMiles.format(costo), margen: String(margen) })

  function cambiar(evento) {
    const { name, value } = evento.target
    setTexto((t) => ({ ...t, [name]: value }))
    const numero = Number(value.replace(/\D/g, ''))
    onCambio(name, name === 'margen' ? Math.min(95, numero) : numero)
  }

  return (
    <form className="mosaico mosaico-verde ld-calculo tb-sube" style={{ '--i': 3 }} onSubmit={(e) => e.preventDefault()}>
      <h2>Prueba con tu producto</h2>
      <label className="ld-campo">
        Costo en COP
        <input name="costo" inputMode="numeric" autoComplete="off" value={texto.costo} onChange={cambiar}
          onBlur={() => costo && setTexto((t) => ({ ...t, costo: formatoMiles.format(costo) }))} />
      </label>
      <label className="ld-campo">
        Margen objetivo %
        <input name="margen" inputMode="numeric" autoComplete="off" value={texto.margen} onChange={cambiar} />
      </label>
    </form>
  )
}

/* ─── Registro rápido: el email viaja al formulario de registro ─── */
function RegistroRapido() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  function enviar(evento) {
    evento.preventDefault()
    navigate('/registro', { state: { email: email.trim() } })
  }

  return (
    <form className="mosaico mosaico-etiqueta ld-registro tb-sube" style={{ '--i': 4 }} onSubmit={enviar}>
      <h2>Escribe tu correo y empieza a vigilar tus precios hoy</h2>
      <label htmlFor="ld-email" className="sr-only">Tu email</label>
      <input id="ld-email" type="email" name="email" autoComplete="email" placeholder="tu@correo.com"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" className="btn-t btn-t-noche">
        Crear mi cuenta
        <IconoFlecha />
      </button>
      <p>Solo te pedimos nombre, correo y contraseña.</p>
    </form>
  )
}

/* ─── Cómo funciona: el scroll gira un tambor de tres caras ─── */
const PASOS = [
  { titulo: 'Registra', texto: 'Tu producto con su costo, precio de venta y margen objetivo.' },
  { titulo: 'Recogemos', texto: 'Los precios y la disponibilidad de tus competidores, cada 6 horas.' },
  { titulo: 'Decides', texto: 'Con el precio sugerido y las alertas de cada recolección.' },
]

function Recorrido() {
  const pista = useRef(null)
  const tambor = useRef(null)
  const [activo, setActivo] = useState(0)

  useEffect(() => {
    if (reducido()) return undefined
    let actual = 0
    let corriendo = false
    let marco = 0

    function progreso() {
      const r = pista.current.getBoundingClientRect()
      const recorrido = r.height - window.innerHeight
      return recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0
    }
    function cuadro() {
      // un poco de imán hacia cada cara para que no se quede a medio girar
      const p = progreso() * 2
      const base = Math.round(p)
      const resto = p - base
      const meta = (base + resto * Math.min(1, Math.abs(resto) * 2.2)) * 120
      actual += (meta - actual) * 0.14
      tambor.current.style.setProperty('--giro', `${actual.toFixed(2)}deg`)
      setActivo(Math.round(actual / 120))
      if (Math.abs(meta - actual) > 0.05) marco = requestAnimationFrame(cuadro)
      else corriendo = false
    }
    function despertar() {
      if (!corriendo) {
        corriendo = true
        marco = requestAnimationFrame(cuadro)
      }
    }
    window.addEventListener('scroll', despertar, { passive: true })
    despertar()
    return () => {
      window.removeEventListener('scroll', despertar)
      cancelAnimationFrame(marco)
    }
  }, [])

  function irA(i) {
    setActivo(i)
    if (reducido()) {
      tambor.current.children[i]?.scrollIntoView({ block: 'center' })
      return
    }
    const r = pista.current.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + r.top + (r.height - window.innerHeight) * (i / 2) + 2, behavior: 'smooth' })
  }

  return (
    <section className="ld-recorrido" id="recorrido" aria-labelledby="ld-recorrido-titulo">
      <div ref={pista} className="ld-recorrido-pista">
        <div className="ld-recorrido-fijo">
          <div className="mosaico ld-recorrido-texto">
            <div>
              <h2 id="ld-recorrido-titulo">Muchos precios, una decisión</h2>
              <p>Cada seis horas Trendly recoge lo que cobra el mercado y lo convierte en un precio para ti.</p>
            </div>
            <ol className="ld-pasos">
              {PASOS.map(({ titulo, texto }, i) => (
                <li key={titulo}>
                  <button type="button" className="ld-paso" aria-current={activo === i ? 'step' : undefined} onClick={() => irA(i)}>
                    <span className="ld-paso-marca" aria-hidden="true" />
                    <b>{titulo}</b>
                    <span>{texto}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="mosaico mosaico-alto ld-recorrido-escena">
            <div ref={tambor} className="ld-tambor">
              <div className="ld-cara" aria-label="Formulario del producto activo">
                <h3>Producto en seguimiento <small>Audífonos Pro</small></h3>
                <div className="ld-ui-campos">
                  <div className="ld-ui-campo ld-ui-ancho">Nombre<span>Audífonos Pro</span></div>
                  <div className="ld-ui-campo">Costo<span>$85.000</span></div>
                  <div className="ld-ui-campo">Precio de venta<span>$119.900</span></div>
                  <div className="ld-ui-campo">Margen objetivo<span>30%</span></div>
                  <div className="ld-ui-campo">SKU<span>TRD-AP-01</span></div>
                </div>
                <span className="ld-ui-boton">Guardar cambios</span>
              </div>
              <div className="ld-cara" aria-label="Precios recogidos del mercado">
                <h3>Competidores <small>Recolección de las 12:00</small></h3>
                <ul className="ld-ui-lista">
                  <li><span>MercadoLibre · Tienda Audio</span><b>$139.900</b><span className="ld-ui-estado">Disponible</span></li>
                  <li><span>MercadoLibre · SonidoCo</span><b>$132.500</b><span className="ld-ui-estado agotado">Agotado</span></li>
                  <li><span>AliExpress · proveedor</span><b>$85.000</b><span className="ld-ui-estado">Disponible</span></li>
                </ul>
                <p className="ld-ui-nota">Próxima recolección a las 18:00</p>
              </div>
              <div className="ld-cara" aria-label="Precio sugerido para el producto actual">
                <h3>Precio sugerido <small>Margen objetivo 30%</small></h3>
                <p className="ld-ui-precio">$121.429</p>
                <p className="ld-ui-dato"><span>Margen actual 29,1%</span><span>Subir $1.529</span></p>
                <p className="ld-ui-alerta">Alerta: SonidoCo se quedó sin unidades</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Cierre: la marca construida con bloques que se voltean ─── */
function Cierre() {
  const ref = useRef(null)
  // Sin IntersectionObserver los bloques quedan quietos en su sitio
  const [dentro, setDentro] = useState(() => !('IntersectionObserver' in window))

  useEffect(() => {
    if (dentro) return undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setDentro(true)
        io.disconnect()
      }
    }, { rootMargin: '0px 0px -12% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [dentro])

  return (
    <footer ref={ref} className={`ld-cierre${dentro ? ' dentro' : ''}`}>
      <div className="ld-marca" role="img" aria-label="Trendly">
        {[...'TRENDLY'].map((letra, i) => (
          <span key={i} className="ld-bloque" style={{ '--i': i }} aria-hidden="true">{letra}</span>
        ))}
      </div>
      <p className="ld-cierre-lema">Monitoreo y análisis de precios para vendedores en Colombia y Latinoamérica.</p>
      <div className="ld-cierre-fin">
        <span>© 2026 Trendly</span>
        <Link to="/registro" className="btn-t btn-t-etiqueta ld-cierre-accion">Empezar ahora</Link>
      </div>
    </footer>
  )
}

export default function Landing() {
  const [producto, setProducto] = useState({ costo: PRODUCTO_ACTUAL.costo, margen: PRODUCTO_ACTUAL.margenObjetivo })
  const [enTablero, setEnTablero] = useState(producto)

  // Espera a que se termine de escribir para no girar el tablero en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setEnTablero(producto), 260)
    return () => clearTimeout(t)
  }, [producto])

  return (
    <div className="tb-pagina">
      <PublicNavbar />

      <main className="tb-rejilla">
        <div className="mosaico mosaico-papel ld-nombre tb-sube" style={{ '--i': 0 }}>
          <p>Trendly</p>
        </div>

        <div className="mosaico ld-frase tb-sube" style={{ '--i': 1 }}>
          <h1>Domina el mercado y protege tu margen</h1>
          <p>Trendly vigila tus precios en MercadoLibre y AliExpress y te recomienda el precio ideal para proteger tu margen objetivo.</p>
        </div>

        <TableroHeroe costo={enTablero.costo} margen={enTablero.margen} />
        <Calculadora costo={producto.costo} margen={producto.margen} onCambio={(campo, valor) => setProducto((p) => ({ ...p, [campo]: valor }))} />
        <RegistroRapido />

        <Recorrido />
      </main>

      <Cierre />
    </div>
  )
}
