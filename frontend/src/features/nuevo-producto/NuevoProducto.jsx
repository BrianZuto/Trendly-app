import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { mensajeDeError } from '@core/api/errores'
import { crearProducto } from '@core/services/productos.service'
import { buscarOfertas } from '@core/services/proveedores.service'
import CampoTexto from '@shared/components/CampoTexto'
import Mensaje from '@shared/components/Mensaje'
import Paletas from '@shared/components/Paletas'
import { MARKETPLACES, SITIOS_SOPORTADOS } from '@shared/utils/marketplaces'
import { validarProducto, validarReventa } from '@shared/utils/validaciones'
import { calcularMargen, formatearDolares, formatearPesos, formatearPorcentaje, pesosEnPaletas, precioMinimo, TRM } from '@features/productos/formato'
import BuscarProveedor from './BuscarProveedor'
import { recomendar, totalPesos } from './recomendaciones'
import '@features/productos/Productos.css'
import './NuevoProducto.css'

gsap.registerPlugin(useGSAP)

const PASOS = ['Proveedor', 'Tus datos de venta', 'Dónde comparar']

// "Smartwatch amoled 1.9 original con garantía" → nombre corto para tu catálogo y la búsqueda de reventa
const nombreCorto = (titulo) => titulo.replace(/^Publicación de AliExpress \d+$/, '').slice(0, 60).trim()
const palabrasClave = (texto) => texto.split(/\s+/).slice(0, 4).join(' ')

const margenCorto = (valor) => `${valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`

function Pasos({ actual }) {
    return (
        <ol className="pasos" aria-label="Pasos">
            {PASOS.map((nombre, i) => (
                <li key={nombre} className={i === actual ? 'on' : i < actual ? 'hecho' : undefined} aria-current={i === actual ? 'step' : undefined}>
                    <span className="pasos-n" aria-hidden="true">
                        {i < actual ? '✓' : i + 1}
                    </span>
                    {nombre}
                </li>
            ))}
        </ol>
    )
}

function ProveedorElegido({ oferta, onCambiar }) {
    return (
        <div className="hoja elegido">
            <img src={oferta.imagen} alt="" />
            <div className="elegido-texto">
                <p className="mini elegido-rotulo">
                    <span className="mk mk-ae">AliExpress</span> Proveedor elegido
                </p>
                <strong>{oferta.titulo}</strong>
                <span className="mini num">
                    {oferta.tienda} · ★ {oferta.calificacion.toLocaleString('es-CO')} · llega en {oferta.diasMin}–{oferta.diasMax} días
                </span>
            </div>
            <button type="button" className="app-boton app-boton-claro app-boton-chico" onClick={onCambiar}>
                Cambiar
            </button>
        </div>
    )
}

function DesgloseCosto({ oferta, extra, costoReferencia }) {
    const proveedor = costoReferencia ?? totalPesos(oferta)
    return (
        <dl className="desglose">
            <div>
                <dt>Producto</dt>
                <dd className="num">{formatearDolares(oferta.precioUsd)}</dd>
            </div>
            <div>
                <dt>Envío</dt>
                <dd className="num">{oferta.envioUsd === 0 ? 'Gratis' : formatearDolares(oferta.envioUsd)}</dd>
            </div>
            <div>
                <dt>En pesos (TRM {formatearPesos(TRM)})</dt>
                <dd className="num">{formatearPesos(proveedor)}</dd>
            </div>
            <div>
                <dt>Tus costos extra</dt>
                <dd className="num">{formatearPesos(extra)}</dd>
            </div>
        </dl>
    )
}

export default function NuevoProducto() {
    const navigate = useNavigate()
    const location = useLocation()
    const ref = useRef(null)
    const parametros = new URLSearchParams(location.search)
    const tendenciaDesdeUrl =
        parametros.get('origen') === 'tendencias' && parametros.get('id') && parametros.get('nombre')
            ? {
                  id: parametros.get('id'),
                  nombre: parametros.get('nombre'),
                  categoria: parametros.get('categoria') ?? '',
                  costo: Number(parametros.get('costo')),
                  precioVenta: Number(parametros.get('precioVenta')),
                  margenObjetivo: Number(parametros.get('margenObjetivo')),
              }
            : null
    const tendencia = location.state?.productoTendencia ?? tendenciaDesdeUrl
    const idTendencia = tendencia?.id
    const nombreTendencia = tendencia?.nombre
    const [paso, setPaso] = useState(tendencia ? 1 : 0)
    // null: aún no elige · 'manual': sin proveedor · oferta: la elegida
    const [proveedor, setProveedor] = useState(null)
    const [busqueda, setBusqueda] = useState({ consulta: '', ofertas: null })
    const [buscandoProveedorTendencia, setBuscandoProveedorTendencia] = useState(Boolean(tendencia))
    const [datos, setDatos] = useState(() => (tendencia ? {
        nombre: tendencia.nombre,
        sku: tendencia.id.toLocaleUpperCase('es-CO'),
        costo: String(tendencia.costo),
        costosExtra: '0',
        precioVenta: String(tendencia.precioVenta),
        margenObjetivo: String(tendencia.margenObjetivo),
    } : { nombre: '', sku: '', costo: '', costosExtra: '', precioVenta: '', margenObjetivo: '' }))
    const [reventa, setReventa] = useState({
        palabraClave: tendencia?.nombre.split(/\s+/).slice(0, 4).join(' ') ?? '',
        marketplaces: ['MERCADOLIBRE'],
        topN: '5',
    })
    const [errores, setErrores] = useState({})
    const [errorApi, setErrorApi] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [hecho, setHecho] = useState(false)

    useEffect(() => {
        if (!idTendencia || !nombreTendencia) return undefined
        let vigente = true

        async function seleccionarProveedor() {
            setBuscandoProveedorTendencia(true)
            setErrorApi('')
            try {
                const ofertas = await buscarOfertas(nombreTendencia)
                const recomendada = recomendar(ofertas).recomendada
                if (!recomendada) throw new Error('No encontramos ofertas de proveedor para este producto')
                if (!vigente) return
                setBusqueda({ consulta: nombreTendencia, ofertas })
                setProveedor(recomendada)
            } catch (fallo) {
                if (vigente) setErrorApi(mensajeDeError(fallo))
            } finally {
                if (vigente) setBuscandoProveedorTendencia(false)
            }
        }

        seleccionarProveedor()
        return () => {
            vigente = false
        }
    }, [idTendencia, nombreTendencia])

    const manual = proveedor === 'manual'
    const extra = Number(datos.costosExtra) || 0
    const costoBase = tendencia ? Number(tendencia.costo) : proveedor && !manual ? totalPesos(proveedor) : Number(datos.costo)
    const costo = costoBase + extra
    const margen = calcularMargen(costo, datos.precioVenta)
    const objetivo = datos.margenObjetivo === '' ? null : Number(datos.margenObjetivo)
    const bajo = margen !== null && objetivo !== null && margen < objetivo
    const minimo = objetivo !== null ? precioMinimo(costo, objetivo) : null

    // Cada paso entra deslizándose desde la derecha
    useGSAP(
        () => {
            const mm = gsap.matchMedia()
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.from('.paso-actual', { x: 28, autoAlpha: 0, duration: 0.4, ease: 'power3.out' })
                gsap.fromTo('.pasos li.on .pasos-n', { scale: 0.6 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' })
            })
        },
        { scope: ref, dependencies: [paso] },
    )

    function ir(siguiente) {
        setPaso(siguiente)
        setErrores({})
        setErrorApi('')
        window.scrollTo?.({ top: 0, behavior: 'smooth' })
    }

    function elegir(oferta) {
        setProveedor(oferta)
        const nombre = nombreCorto(oferta.titulo)
        setDatos((d) => ({ ...d, nombre: d.nombre || nombre }))
        setReventa((r) => ({ ...r, palabraClave: r.palabraClave || palabrasClave(nombre || busqueda.consulta) }))
        ir(1)
    }

    function sinProveedor() {
        setProveedor('manual')
        ir(1)
    }

    function cambiar(evento) {
        const { name, value } = evento.target
        setDatos((d) => ({ ...d, [name]: value }))
        setErrores((e) => ({ ...e, [name]: '' }))
    }

    async function siguienteDeDatos(evento) {
        evento.preventDefault()
        const encontrados = validarProducto(datos, { conProveedor: !manual })
        setErrores(encontrados)
        if (Object.keys(encontrados).length) return
        setReventa((r) => ({ ...r, palabraClave: r.palabraClave || palabrasClave(datos.nombre) }))
        ir(2)
    }

    function alternarSitio(sitio) {
        setReventa((r) => ({
            ...r,
            marketplaces: r.marketplaces.includes(sitio) ? r.marketplaces.filter((m) => m !== sitio) : [...r.marketplaces, sitio],
        }))
        setErrores((e) => ({ ...e, marketplaces: '' }))
    }

    async function crear(evento) {
        evento.preventDefault()
        const encontrados = validarReventa(reventa)
        setErrores(encontrados)
        if (Object.keys(encontrados).length) return
        setEnviando(true)
        setErrorApi('')
        try {
            const creado = await crearProducto({
                nombre: datos.nombre.trim(),
                sku: datos.sku.trim(),
                precioVenta: Number(datos.precioVenta),
                margenObjetivo: Number(datos.margenObjetivo),
                costosExtra: extra,
                ...(manual ? { costo: Number(datos.costo) } : { proveedor: { idPublicacion: proveedor.idPublicacion, url: proveedor.url } }),
                reventa: { palabraClave: reventa.palabraClave.trim(), marketplaces: reventa.marketplaces, topN: Number(reventa.topN) },
            })
            setHecho(true)
            setTimeout(() => navigate('/productos', { state: { creado } }), 480)
        } catch (fallo) {
            setErrorApi(mensajeDeError(fallo))
            setEnviando(false)
        }
    }

    const numero = { type: 'number', inputMode: 'decimal', min: 0, step: 'any', onChange: cambiar }
    const sitios = reventa.marketplaces.map((m) => MARKETPLACES[m].nombre)

    return (
        <section className="nuevo" ref={ref} aria-labelledby="nuevo-titulo">
            <nav aria-label="Ruta" className="mini migas">
                <Link to="/productos">Productos</Link>
                <span aria-hidden="true">›</span>
                <span aria-current="page">Nuevo producto</span>
            </nav>
            <div className="nuevo-cabeza">
                <div>
                    <h1 id="nuevo-titulo">Nuevo producto</h1>
                    <p>Empieza por el proveedor al que le vas a comprar. Después Trendly compara tu precio con la reventa.</p>
                </div>
                <Pasos actual={paso} />
            </div>

            {errorApi && <Mensaje tipo="error">{errorApi}</Mensaje>}

            {paso === 0 && (
                <div className="paso-actual">
                    <BuscarProveedor
                        busquedaInicial={busqueda.consulta}
                        resultadoInicial={busqueda.ofertas}
                        onResultado={(consulta, ofertas) => setBusqueda({ consulta, ofertas })}
                        onElegir={elegir}
                        onManual={sinProveedor}
                    />
                </div>
            )}

            {paso === 1 && tendencia && !proveedor && (
                <div className="hoja elegido elegido-manual">
                    <div className="elegido-texto">
                        <strong>{buscandoProveedorTendencia ? 'Buscando proveedor en AliExpress…' : 'No pudimos seleccionar un proveedor'}</strong>
                        {!buscandoProveedorTendencia && <span className="mini">Puedes buscar y elegir una oferta para continuar con el alta.</span>}
                    </div>
                    {!buscandoProveedorTendencia && (
                        <button type="button" className="app-boton app-boton-claro app-boton-chico" onClick={() => ir(0)}>
                            Buscar proveedor
                        </button>
                    )}
                </div>
            )}

            {paso === 1 && (!tendencia || proveedor) && (
                <form className="paso-actual paso-datos" onSubmit={siguienteDeDatos} noValidate>
                    {manual ? (
                        <div className="hoja elegido elegido-manual">
                            <div className="elegido-texto">
                                <strong>Sin proveedor en AliExpress</strong>
                                <span className="mini">
                                    Escribe tu costo a mano. Podrás vigilar la reventa igual.
                                </span>
                            </div>
                            {!tendencia && (
                                <button type="button" className="app-boton app-boton-claro app-boton-chico" onClick={() => ir(0)}>
                                    Buscar proveedor
                                </button>
                            )}
                        </div>
                    ) : (
                        <ProveedorElegido oferta={proveedor} onCambiar={() => ir(0)} />
                    )}

                    <div className="hoja datos-venta">
                        <div className="datos-columnas">
                            <div className="datos-campos">
                                <CampoTexto etiqueta="Nombre" name="nombre" value={datos.nombre} onChange={cambiar} error={errores.nombre} />
                                <CampoTexto etiqueta="SKU" name="sku" value={datos.sku} onChange={cambiar} error={errores.sku} />
                                {manual && <CampoTexto etiqueta="Costo" name="costo" value={datos.costo} error={errores.costo} prefijo="$" {...numero} />}
                                <div>
                                    <CampoTexto etiqueta="Costos extra" name="costosExtra" value={datos.costosExtra} error={errores.costosExtra} prefijo="$" {...numero} />
                                    {!errores.costosExtra && <p className="campo-ayuda">Envío local, comisión de pago, empaque. Opcional.</p>}
                                </div>
                                <CampoTexto etiqueta="Precio de venta" name="precioVenta" value={datos.precioVenta} error={errores.precioVenta} prefijo="$" {...numero} />
                                <CampoTexto etiqueta="Margen objetivo" name="margenObjetivo" value={datos.margenObjetivo} error={errores.margenObjetivo} prefijo="%" {...numero} max={100} />
                            </div>
                            <div className="datos-lectura">
                                <p className="mini datos-rotulo">Tu costo por unidad</p>
                                {costo > 0 ? (
                                    <Paletas key={costo} texto={pesosEnPaletas(costo)} className="datos-paletas" escalon={18} />
                                ) : (
                                    <Paletas texto="$--" className="datos-paletas" />
                                )}
                                {!manual && (
                                    <DesgloseCosto oferta={proveedor} extra={extra} costoReferencia={tendencia?.costo} />
                                )}
                                <dl className="form-producto-lectura datos-cifras">
                                    <div>
                                        <dt>Margen actual</dt>
                                        <dd aria-hidden="true">
                                            {margen === null ? <Paletas texto="--%" /> : <Paletas texto={margenCorto(margen)} className={bajo ? 'paletas-rojo' : 'paletas-verde'} escalon={20} />}
                                        </dd>
                                        <p className={`form-producto-margen-texto${bajo ? ' margen-bajo' : ''}`} aria-live="polite">
                                            {margen === null
                                                ? 'Escribe el precio de venta para ver el margen.'
                                                : `Margen con este precio: ${formatearPorcentaje(margen)}${bajo ? ', por debajo del objetivo' : ''}`}
                                        </p>
                                    </div>
                                    <div>
                                        <dt>Precio mínimo para tu objetivo</dt>
                                        <dd>{minimo === null || !(costo > 0) ? '—' : formatearPesos(minimo)}</dd>
                                        {minimo !== null && costo > 0 && Number(datos.precioVenta) !== minimo && (
                                            <button type="button" className="enlace-boton" onClick={() => setDatos((d) => ({ ...d, precioVenta: String(minimo) }))}>
                                                Usar este precio
                                            </button>
                                        )}
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <div className="nuevo-acciones">
                        <button type="button" className="app-boton app-boton-claro" onClick={() => ir(0)}>
                            Atrás
                        </button>
                        <button type="submit" className="app-boton">
                            Siguiente
                        </button>
                    </div>
                </form>
            )}

            {paso === 2 && (
                <form className="paso-actual paso-reventa" onSubmit={crear} noValidate>
                    <div className="hoja reventa">
                        <h2>¿Dónde comparar tu precio de reventa?</h2>
                        <p className="mini">Trendly vigila los primeros resultados de la búsqueda en cada sitio, cada 6 horas.</p>
                        <fieldset className="sitios" aria-describedby={errores.marketplaces ? 'sitios-error' : undefined}>
                            <legend className="sr-only">Sitios de reventa</legend>
                            {SITIOS_SOPORTADOS.map((sitio) => {
                                const on = reventa.marketplaces.includes(sitio)
                                return (
                                    <label key={sitio} className={`sitio${on ? ' on' : ''}`}>
                                        <input type="checkbox" checked={on} onChange={() => alternarSitio(sitio)} />
                                        <span className={`mk ${MARKETPLACES[sitio].clase}`}>{MARKETPLACES[sitio].nombre}</span>
                                        <span className="sitio-check" aria-hidden="true">
                                            ✓
                                        </span>
                                    </label>
                                )
                            })}
                        </fieldset>
                        {errores.marketplaces && (
                            <p id="sitios-error" className="err" role="alert">
                                {errores.marketplaces}.
                            </p>
                        )}
                        <div className="reventa-fila">
                            <CampoTexto
                                etiqueta="Palabra clave"
                                name="palabraClave"
                                value={reventa.palabraClave}
                                maxLength={80}
                                error={errores.palabraClave}
                                onChange={(e) => {
                                    setReventa((r) => ({ ...r, palabraClave: e.target.value }))
                                    setErrores((x) => ({ ...x, palabraClave: '' }))
                                }}
                            />
                            <div className="campo">
                                <label htmlFor="reventa-top">Primeros</label>
                                <select id="reventa-top" value={reventa.topN} onChange={(e) => setReventa((r) => ({ ...r, topN: e.target.value }))}>
                                    {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {sitios.length > 0 && reventa.palabraClave.trim().length >= 3 && (
                            <p className="reventa-resumen" aria-live="polite">
                                Trendly vigilará los primeros <strong>{reventa.topN}</strong> resultados de <strong>"{reventa.palabraClave.trim()}"</strong> en{' '}
                                <strong>{sitios.join(', ').replace(/, ([^,]*)$/, ' y $1')}</strong>. La primera captura llega en máximo 6 horas.
                            </p>
                        )}
                        <p className="mini">Después podrás sumar publicaciones puntuales por URL desde el detalle del producto.</p>
                    </div>

                    <div className="nuevo-acciones">
                        <button type="button" className="app-boton app-boton-claro" onClick={() => ir(1)}>
                            Atrás
                        </button>
                        <button type="submit" className={`app-boton boton-guardar${hecho ? ' hecho' : ''}`} disabled={enviando}>
                            {hecho ? (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path className="boton-guardar-check" d="M5 12.5l4.5 4.5L19 7.5" />
                                    </svg>
                                    Creado
                                </>
                            ) : enviando ? (
                                'Creando…'
                            ) : (
                                'Crear producto'
                            )}
                        </button>
                    </div>
                </form>
            )}
        </section>
    )
}
