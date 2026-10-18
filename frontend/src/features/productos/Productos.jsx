import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { mensajeDeError } from '@core/api/errores'
import { actualizarProducto, eliminarProducto, listarProductos } from '@core/services/productos.service'
import Dialogo from '@shared/components/Dialogo'
import Mensaje from '@shared/components/Mensaje'
import Paletas from '@shared/components/Paletas'
import { MARKETPLACES as MARKETPLACE } from '@shared/utils/marketplaces'
import FormularioProducto from './FormularioProducto'
import LlegadaProducto from './LlegadaProducto'
import { formatearDolares, formatearPesos, formatearPorcentaje, pesosEnPaletas } from './formato'
import './Productos.css'

const bajoObjetivo = (p) => p.margenActual < p.margenObjetivo

// Resumen de la competencia que trae la lista (propuesta para el backend; sin él, "Sin datos")
const minimoDe = (p) => p.competencia?.minimo ?? null
const diferencia = (p) => {
    const minimo = minimoDe(p)
    return minimo ? Math.round(((p.precioVenta - minimo.precio) / minimo.precio) * 1000) / 10 : null
}

const FILTROS = [
    ['todos', 'Todos', () => true],
    ['bajo', 'Bajo el objetivo', bajoObjetivo],
    ['caro', 'Más caros que el mínimo', (p) => diferencia(p) > 0],
    ['barato', 'Los más baratos', (p) => diferencia(p) !== null && diferencia(p) < 0],
    ['sin', 'Sin competidores', (p) => !p.competencia?.monitoreos],
]

const ORDENES = {
    recientes: { etiqueta: 'Más recientes', comparar: (a, b) => b.id - a.id },
    margen: { etiqueta: 'Margen actual', comparar: (a, b) => a.margenActual - b.margenActual },
    nombre: { etiqueta: 'Nombre', comparar: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
}

function Icono({ d }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    )
}

const ICONO_MAS = 'M12 5v14M5 12h14'
const ICONO_FOTO = 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01'

function Foto({ producto, grande = false }) {
    if (producto.imagen) {
        return <img className={grande ? 'foto foto-grande' : 'foto'} src={producto.imagen} alt={grande ? producto.nombre : ''} />
    }
    // La foto se toma de la publicación vigilada; hasta la primera captura queda el marco
    return (
        <span className={grande ? 'foto foto-grande foto-vacia' : 'foto foto-vacia'} title="La foto llega con la primera captura">
            <Icono d={ICONO_FOTO} />
            {grande && <span>Llega con la primera captura</span>}
        </span>
    )
}

function BarraMargen({ producto }) {
    const bajo = bajoObjetivo(producto)
    const ancho = Math.min(100, Math.max(0, producto.margenActual))
    const marca = Math.min(100, Math.max(0, producto.margenObjetivo))
    return (
        <span
            className="barra"
            role="img"
            aria-label={`Margen actual ${formatearPorcentaje(producto.margenActual)}, objetivo ${formatearPorcentaje(producto.margenObjetivo)}${bajo ? ', por debajo del objetivo' : ''}`}
        >
            <i style={{ width: `${ancho}%` }} className={bajo ? 'es-bajo' : undefined} />
            <s style={{ left: `${marca}%` }} />
        </span>
    )
}

// Tu precio frente al más barato de la competencia
function Posicion({ producto }) {
    const dif = diferencia(producto)
    if (dif === null) return <span className="pos pos-neu">Sin datos</span>
    if (dif > 0) return <span className="pos pos-mal">{dif.toLocaleString('es-CO')}% más caro</span>
    if (dif < 0) return <span className="pos pos-ok">El más barato</span>
    return <span className="pos pos-neu">Igual al mínimo</span>
}

function publicacionesDe(p) {
    const n = p.competencia?.publicaciones ?? 0
    if (!p.competencia?.monitoreos) return 'Sin competidores'
    return n === 1 ? '1 publicación' : `${n} publicaciones`
}

function MenuAcciones({ producto, onEditar, onEliminar }) {
    const [abierto, setAbierto] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!abierto) return undefined
        const fuera = (evento) => !ref.current?.contains(evento.target) && setAbierto(false)
        const tecla = (evento) => evento.key === 'Escape' && setAbierto(false)
        document.addEventListener('mousedown', fuera)
        document.addEventListener('keydown', tecla)
        return () => {
            document.removeEventListener('mousedown', fuera)
            document.removeEventListener('keydown', tecla)
        }
    }, [abierto])

    function elegir(accion) {
        setAbierto(false)
        accion(producto)
    }

    return (
        <span className="menu" ref={ref}>
            <button
                type="button"
                className="icono"
                aria-label={`Más acciones para ${producto.nombre}`}
                aria-expanded={abierto}
                onClick={() => setAbierto((a) => !a)}
            >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                </svg>
            </button>
            {abierto && (
                <span className="menu-lista">
                    <button type="button" onClick={() => elegir(onEditar)}>
                        Editar
                    </button>
                    <button type="button" className="menu-peligro" aria-label={`Eliminar ${producto.nombre}`} onClick={() => elegir(onEliminar)}>
                        Eliminar
                    </button>
                </span>
            )}
        </span>
    )
}

export default function Productos() {
    const [estado, setEstado] = useState({ cargando: true, error: '', productos: [] })
    const [intento, setIntento] = useState(0)
    // null: cerrado · { producto }: editar (crear es la pantalla /productos/nuevo)
    const [formulario, setFormulario] = useState(null)
    const [porEliminar, setPorEliminar] = useState(null)
    const [eliminando, setEliminando] = useState(false)
    const [errorEliminar, setErrorEliminar] = useState('')
    const [aviso, setAviso] = useState('')
    // El producto recién creado llega desde /productos/nuevo: su etiqueta de llegada y el resalte de su fila
    const location = useLocation()
    const navigate = useNavigate()
    const [llegada, setLlegada] = useState(() => location.state?.creado ?? null)
    const [resalte, setResalte] = useState(() => (location.state?.creado ? { id: location.state.creado.id, vez: 1 } : null))
    const [filtro, setFiltro] = useState('todos')
    const [marketplace, setMarketplace] = useState('todos')
    const [orden, setOrden] = useState('recientes')
    const [vista, setVista] = useState('tabla')
    const [parametros, setParametros] = useSearchParams()
    const consulta = parametros.get('q') ?? ''
    const busqueda = consulta.trim().toLowerCase()

    useEffect(() => {
        let vigente = true
        listarProductos()
            .then((lista) => vigente && setEstado({ cargando: false, error: '', productos: lista }))
            .catch((error) => vigente && setEstado({ cargando: false, error: mensajeDeError(error), productos: [] }))
        return () => {
            vigente = false
        }
    }, [intento])

    const { cargando, error, productos } = estado

    // La llegada se muestra una vez; volver atrás o recargar no la repite
    useEffect(() => {
        if (location.state?.creado) navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    }, [location, navigate])

    function reintentar() {
        setEstado((anterior) => ({ ...anterior, cargando: true, error: '' }))
        setIntento((n) => n + 1)
    }

    function abrirNuevo() {
        navigate('/productos/nuevo')
    }

    function abrirEdicion(producto) {
        setAviso('')
        setFormulario({ producto })
    }

    async function guardar(datos) {
        const actualizado = await actualizarProducto(formulario.producto.id, datos)
        setEstado((anterior) => ({
            ...anterior,
            productos: anterior.productos.map((p) => (p.id === actualizado.id ? actualizado : p)),
        }))
        setAviso('Producto actualizado')
    }

    function verEnLista() {
        const { id } = llegada
        setLlegada(null)
        setFiltro('todos')
        setMarketplace('todos')
        if (parametros.get('q')) setParametros({}, { replace: true })
        setResalte((anterior) => ({ id, vez: (anterior?.vez ?? 0) + 1 }))
        requestAnimationFrame(() => {
            const fila = document.querySelector(`[data-producto="${id}"]`)
            fila?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
            fila?.querySelector('button')?.focus({ preventScroll: true })
        })
    }

    const claseResalte = (p) => (resalte?.id === p.id ? ` fila-nueva fila-nueva-${resalte.vez % 2}` : '')

    function pedirEliminar(producto) {
        setAviso('')
        setErrorEliminar('')
        setPorEliminar(producto)
    }

    async function confirmarEliminar() {
        setEliminando(true)
        setErrorEliminar('')
        try {
            await eliminarProducto(porEliminar.id)
            setEstado((anterior) => ({ ...anterior, productos: anterior.productos.filter((p) => p.id !== porEliminar.id) }))
            setAviso('Producto eliminado')
            setPorEliminar(null)
        } catch (fallo) {
            setErrorEliminar(mensajeDeError(fallo))
        } finally {
            setEliminando(false)
        }
    }

    const listo = !cargando && !error
    const buscados = busqueda
        ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda) || p.sku.toLowerCase().includes(busqueda))
        : productos
    const deMarketplace =
        marketplace === 'todos' ? buscados : buscados.filter((p) => p.competencia?.marketplaces?.includes(marketplace))
    const elegido = FILTROS.find(([id]) => id === filtro)
    const visibles = deMarketplace.filter(elegido[2]).sort(ORDENES[orden].comparar)

    return (
        <section className="productos" aria-labelledby="productos-titulo">
            <div className="productos-cabecera">
                <div>
                    <h1 id="productos-titulo">Productos</h1>
                    <p>
                        Cada producto parte de su proveedor en AliExpress. Aquí ves tu costo, tu margen y cómo está tu precio frente
                        a la reventa en MercadoLibre, Falabella y Amazon.
                    </p>
                </div>
                <button type="button" className="app-boton" onClick={abrirNuevo} disabled={!listo}>
                    <Icono d={ICONO_MAS} />
                    Nuevo producto
                </button>
            </div>

            {listo && productos.length > 0 && (
                <div className="productos-controles">
                    <div className="productos-filtros" role="group" aria-label="Filtrar productos">
                        {FILTROS.map(([id, etiqueta, cumple]) => (
                            <button
                                key={id}
                                type="button"
                                className={`chip${filtro === id ? ' on' : ''}`}
                                aria-pressed={filtro === id}
                                onClick={() => setFiltro(id)}
                            >
                                {etiqueta} <span className="c">{deMarketplace.filter(cumple).length}</span>
                            </button>
                        ))}
                    </div>
                    <div className="productos-opciones">
                        <label className="mini">
                            Marketplace
                            <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
                                <option value="todos">Todos</option>
                                <option value="MERCADOLIBRE">MercadoLibre</option>
                                <option value="ALIEXPRESS">AliExpress</option>
                            </select>
                        </label>
                        <label className="mini">
                            Ordenar
                            <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                                {Object.entries(ORDENES).map(([id, { etiqueta }]) => (
                                    <option key={id} value={id}>
                                        {etiqueta}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="seg" role="group" aria-label="Vista">
                            <button type="button" className={vista === 'tabla' ? 'on' : ''} aria-pressed={vista === 'tabla'} onClick={() => setVista('tabla')}>
                                <Icono d="M3 6h18M3 12h18M3 18h18" />
                                Tabla
                            </button>
                            <button
                                type="button"
                                className={vista === 'tarjetas' ? 'on' : ''}
                                aria-pressed={vista === 'tarjetas'}
                                onClick={() => setVista('tarjetas')}
                            >
                                <Icono d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
                                Tarjetas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {aviso && <Mensaje tipo="exito">{aviso}</Mensaje>}

            {cargando && (
                <div className="hoja productos-esqueleto">
                    <p className="sr-only" role="status">
                        Cargando productos…
                    </p>
                    {[0, 1, 2, 3].map((n) => (
                        <span key={n} className="productos-esqueleto-fila" style={{ '--n': n }} aria-hidden="true">
                            <i />
                            <b />
                        </span>
                    ))}
                </div>
            )}

            {!cargando && error && (
                <div className="hoja productos-error">
                    <Mensaje tipo="error">{error}</Mensaje>
                    <button type="button" className="app-boton app-boton-claro" onClick={reintentar}>
                        Reintentar
                    </button>
                </div>
            )}

            {listo && productos.length === 0 && (
                <div className="hoja productos-vacio">
                    <span className="foto foto-vacia productos-vacio-foto" aria-hidden="true">
                        <Icono d={ICONO_FOTO} />
                    </span>
                    <p className="productos-vacio-titulo">Aún no tienes productos, agrega el primero</p>
                    <p className="mini">
                        Búscalo en AliExpress y elige el proveedor que más te convenga. Trendly calcula tu costo con el envío y la TRM, y
                        compara tu precio con la reventa en MercadoLibre, Falabella y Amazon.
                    </p>
                    <button type="button" className="app-boton" onClick={abrirNuevo}>
                        <Icono d={ICONO_MAS} />
                        Agregar el primero
                    </button>
                </div>
            )}

            {listo && productos.length > 0 && visibles.length === 0 && (
                <p className="hoja productos-sin-resultados">
                    {busqueda ? `Ningún producto coincide con "${consulta}".` : 'Ningún producto cumple este filtro todavía.'}
                </p>
            )}

            {listo && visibles.length > 0 && vista === 'tabla' && (
                <div className="hoja productos-tabla-marco">
                    <table className="productos-tabla">
                        <caption className="sr-only">Tus productos monitoreados</caption>
                        <thead>
                            <tr>
                                <th scope="col">Producto</th>
                                <th scope="col" className="r">Costo</th>
                                <th scope="col" className="r">Tu precio</th>
                                <th scope="col">Margen actual / objetivo</th>
                                <th scope="col" className="r">Mínimo de la reventa</th>
                                <th scope="col">Tu posición</th>
                                <th scope="col">Competidores</th>
                                <th scope="col"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((p) => {
                                const bajo = bajoObjetivo(p)
                                const minimo = minimoDe(p)
                                return (
                                    <tr key={p.id} data-producto={p.id} className={claseResalte(p).trim() || undefined}>
                                        <th scope="row">
                                            <Link className="producto" to={`/productos/${p.id}`}>
                                                <Foto producto={p} />
                                                <span className="producto-texto">
                                                    <strong>{p.nombre}</strong>
                                                    <span className="mini num">SKU {p.sku}</span>
                                                </span>
                                            </Link>
                                        </th>
                                        <td className="r costo">
                                            <span className="num">{formatearPesos(p.costo)}</span>
                                            {p.proveedor ? (
                                                <span className="mini num costo-proveedor">
                                                    <span className="mk mk-ae">AE</span> {formatearDolares(p.proveedor.precioUsd + p.proveedor.envioUsd)}
                                                </span>
                                            ) : (
                                                <span className="mini">Costo a mano</span>
                                            )}
                                        </td>
                                        <td className="r num precio">{formatearPesos(p.precioVenta)}</td>
                                        <td className={`margen${bajo ? ' margen-bajo' : ''}`}>
                                            <span className="margen-linea">
                                                <BarraMargen producto={p} />
                                                <span className="num margen-valor">{formatearPorcentaje(p.margenActual)}</span>
                                                {bajo && <span className="margen-chip">Bajo el objetivo</span>}
                                            </span>
                                            <span className="mini num margen-objetivo">Objetivo {formatearPorcentaje(p.margenObjetivo)}</span>
                                        </td>
                                        <td className="r">
                                            {minimo ? (
                                                <>
                                                    <span className="num minimo">{formatearPesos(minimo.precio)}</span>
                                                    <span className="minimo-mk">
                                                        <span className={`mk ${MARKETPLACE[minimo.marketplace].clase}`}>{MARKETPLACE[minimo.marketplace].nombre}</span>
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="num minimo">—</span>
                                                    <span className="mini">Agrega uno</span>
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <Posicion producto={p} />
                                        </td>
                                        <td className="mini num">{publicacionesDe(p)}</td>
                                        <td className="r acciones">
                                            <Link
                                                className="app-boton app-boton-claro app-boton-chico"
                                                aria-label={`Ver detalle de ${p.nombre}`}
                                                to={`/productos/${p.id}`}
                                            >
                                                Ver detalle
                                            </Link>
                                            <MenuAcciones producto={p} onEditar={abrirEdicion} onEliminar={pedirEliminar} />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {listo && visibles.length > 0 && vista === 'tarjetas' && (
                <ul className="productos-tarjetas">
                    {visibles.map((p) => {
                        const bajo = bajoObjetivo(p)
                        return (
                            <li key={p.id} data-producto={p.id} className={`hoja tarjeta-producto${claseResalte(p)}`}>
                                <div className="tarjeta-producto-foto">
                                    <Foto producto={p} grande />
                                    <span className="tarjeta-producto-pos">
                                        <Posicion producto={p} />
                                    </span>
                                    <span className="tarjeta-producto-menu">
                                        <MenuAcciones producto={p} onEditar={abrirEdicion} onEliminar={pedirEliminar} />
                                    </span>
                                </div>
                                <div className="tarjeta-producto-cuerpo">
                                    <Link className="tarjeta-producto-nombre" to={`/productos/${p.id}`}>
                                        {p.nombre}
                                    </Link>
                                    <Paletas texto={pesosEnPaletas(p.precioVenta)} className="tarjeta-producto-precio" escalon={18} />
                                    {minimoDe(p) ? (
                                        <span className="mini num">
                                            Mínimo {formatearPesos(minimoDe(p).precio)} en{' '}
                                            <span className={`mk ${MARKETPLACE[minimoDe(p).marketplace].clase}`}>{MARKETPLACE[minimoDe(p).marketplace].nombre}</span>
                                        </span>
                                    ) : (
                                        <span className="mini">Sin competidores todavía · SKU {p.sku}</span>
                                    )}
                                    <span className={`margen-linea${bajo ? ' margen-bajo' : ''}`}>
                                        <BarraMargen producto={p} />
                                        <span className="num margen-valor">{formatearPorcentaje(p.margenActual)}</span>
                                    </span>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            {listo && productos.length > 0 && (
                <p className="mini productos-nota">
                    La posición compara tu precio con la publicación más barata de la reventa. El costo de AliExpress incluye el envío y
                    se convierte a pesos con la TRM del día.
                </p>
            )}

            {formulario && (
                <FormularioProducto
                    producto={formulario.producto}
                    onGuardar={guardar}
                    onTerminar={() => setFormulario(null)}
                    onCerrar={() => setFormulario(null)}
                />
            )}

            {llegada && (
                <LlegadaProducto
                    key={llegada.id}
                    producto={llegada}
                    onVerEnLista={verEnLista}
                    onAgregarOtro={abrirNuevo}
                    onCerrar={() => setLlegada(null)}
                />
            )}

            {porEliminar && (
                <Dialogo titulo="¿Eliminar producto?" rol="alertdialog" onCerrar={() => setPorEliminar(null)}>
                    {errorEliminar && <Mensaje tipo="error">{errorEliminar}</Mensaje>}
                    <p className="dialogo-texto">
                        Se eliminará <strong>{porEliminar.nombre}</strong> y dejará de monitorearse. Esta acción no se puede deshacer.
                    </p>
                    <div className="dialogo-acciones">
                        <button type="button" className="app-boton app-boton-claro" onClick={() => setPorEliminar(null)}>
                            Cancelar
                        </button>
                        <button type="button" className="app-boton app-boton-peligro" disabled={eliminando} onClick={confirmarEliminar}>
                            {eliminando ? 'Eliminando…' : 'Eliminar'}
                        </button>
                    </div>
                </Dialogo>
            )}
        </section>
    )
}
