import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { mensajeDeError } from '@core/api/errores'
import { actualizarProducto, elegirImagen, obtenerProducto } from '@core/services/productos.service'
import { cambiarEstadoMonitoreo, crearMonitoreo, eliminarMonitoreo, listarMonitoreos } from '@core/services/monitoreos.service'
import Dialogo from '@shared/components/Dialogo'
import Mensaje from '@shared/components/Mensaje'
import Paletas from '@shared/components/Paletas'
import FormularioProducto from '@features/productos/FormularioProducto'
import { formatearPesos, formatearPorcentaje, pesosEnPaletas, precioMinimo } from '@features/productos/formato'
import AgregarCompetidor from './AgregarCompetidor'
import Competidores from './Competidores'
import EscalaPrecio from './EscalaPrecio'
import EscenariosPrecio from './EscenariosPrecio'
import EquivalenciasProducto from './EquivalenciasProducto'
import AlertasAccionables from './AlertasAccionables.jsx'
import AsistenteNegocio from './AsistenteNegocio.jsx'
import Galeria from './Galeria'
import TarjetaProveedor from './TarjetaProveedor'
import { cuando, filasDe, MARKETPLACES } from './util'
import '@features/productos/Productos.css'
import './ProductoDetalle.css'

gsap.registerPlugin(useGSAP)

// Mientras se espera la primera captura se pregunta seguido; después, al ritmo del mercado
const RAPIDO = 2000
const NORMAL = 15000

const preciosDe = (monitoreos) => new Map(filasDe(monitoreos).filter((f) => f.pub).map((f) => [f.clave, f.pub.precio]))

// Las fotos posibles: primero la del proveedor, luego una por publicación vigilada, sin repetir
function fotosDe(monitoreos, proveedor) {
    const vistas = new Map()
    if (proveedor) vistas.set(proveedor.imagen, { imagen: proveedor.imagen, vendedor: proveedor.tienda, marketplace: 'ALIEXPRESS' })
    monitoreos.forEach((m) =>
        m.publicaciones.forEach((p) => {
            if (!vistas.has(p.imagen)) vistas.set(p.imagen, { imagen: p.imagen, vendedor: p.vendedor, marketplace: m.marketplace })
        }),
    )
    return [...vistas.values()].slice(0, 8)
}

export default function ProductoDetalle() {
    const { id } = useParams()
    const ref = useRef(null)
    const agregarRef = useRef(null)
    const [estado, setEstado] = useState({ cargando: true, error: '', producto: null, monitoreos: [] })
    // Lo que acaba de cambiar en la última consulta: precios que se movieron y filas que llegaron
    const [cambios, setCambios] = useState({})
    const [llegadas, setLlegadas] = useState(() => new Set())
    const [movimiento, setMovimiento] = useState(null)
    const [ocupado, setOcupado] = useState(null)
    const [eligiendoFoto, setEligiendoFoto] = useState(false)
    const [errorAccion, setErrorAccion] = useState('')
    const [editando, setEditando] = useState(false)
    const [porEliminar, setPorEliminar] = useState(null)
    const [eliminando, setEliminando] = useState(false)
    const anteriores = useRef(null)
    // El costo con el que abrió la página: si el proveedor lo mueve, la cifra destella
    const [costoInicial, setCostoInicial] = useState(null)
    const vez = useRef(0)

    // Compara con la consulta anterior para animar solo lo que cambió
    const recibir = useCallback((producto, monitoreos) => {
        const previos = anteriores.current
        const actuales = preciosDe(monitoreos)
        if (previos) {
            const nuevos = {}
            const llegaron = new Set()
            let ultimo = null
            filasDe(monitoreos).forEach(({ clave, pub }) => {
                if (!pub) return
                if (!previos.has(clave)) llegaron.add(clave)
                else if (previos.get(clave) !== pub.precio) {
                    vez.current += 1
                    nuevos[clave] = { antes: previos.get(clave), ahora: pub.precio, vez: vez.current }
                    ultimo = { vendedor: pub.vendedor, antes: previos.get(clave), ahora: pub.precio, vez: vez.current }
                }
            })
            if (Object.keys(nuevos).length) setCambios((c) => ({ ...c, ...nuevos }))
            if (llegaron.size) setLlegadas(llegaron)
            if (ultimo) setMovimiento(ultimo)
        }
        anteriores.current = actuales
        setCostoInicial((c) => c ?? producto.costo)
        setEstado({ cargando: false, error: '', producto, monitoreos })
    }, [])

    useEffect(() => {
        let vigente = true
        let reloj = null
        anteriores.current = null
        async function consultar() {
            try {
                const [producto, monitoreos] = await Promise.all([obtenerProducto(id), listarMonitoreos(id)])
                if (!vigente) return
                recibir(producto, monitoreos)
                const esperando = monitoreos.some((m) => m.estado === 'ACTIVO' && !m.ultimaCaptura)
                reloj = setTimeout(consultar, esperando ? RAPIDO : NORMAL)
            } catch (fallo) {
                if (!vigente) return
                setEstado((e) => (e.producto ? e : { ...e, cargando: false, error: mensajeDeError(fallo, { 404: 'Este producto no existe o ya fue eliminado.' }) }))
                if (anteriores.current) reloj = setTimeout(consultar, NORMAL)
            }
        }
        consultar()
        return () => {
            vigente = false
            clearTimeout(reloj)
        }
    }, [id, recibir])

    const { cargando, error, producto, monitoreos } = estado
    const claveFotos = [producto?.proveedor?.imagen, ...monitoreos.flatMap((m) => m.publicaciones.map((p) => p.imagen))].join('|')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la lista de fotos cambia solo si cambian sus imágenes
    const fotos = useMemo(() => fotosDe(monitoreos, producto?.proveedor), [claveFotos])

    // La página entra por capas: primero la foto y el precio, después la tabla
    useGSAP(
        () => {
            if (!producto) return
            const mm = gsap.matchMedia()
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.from('.detalle-entra', { y: 16, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08 })
            })
        },
        { scope: ref, dependencies: [Boolean(producto)] },
    )

    async function agregar(datos) {
        const creado = await crearMonitoreo(Number(id), datos)
        setEstado((e) => ({ ...e, monitoreos: [...e.monitoreos, creado] }))
        if (creado.publicaciones.length) {
            setLlegadas(new Set(filasDe([creado]).map((f) => f.clave)))
            anteriores.current = preciosDe([...monitoreos, creado])
            // La primera captura pudo darle foto al producto
            obtenerProducto(id)
                .then((actual) => setEstado((e) => ({ ...e, producto: actual })))
                .catch(() => {})
        }
        return creado
    }

    async function alternar(m) {
        setErrorAccion('')
        setOcupado(m.id)
        try {
            const actualizado = await cambiarEstadoMonitoreo(m.id, m.estado === 'PAUSADO' ? 'ACTIVO' : 'PAUSADO')
            setEstado((e) => ({ ...e, monitoreos: e.monitoreos.map((x) => (x.id === m.id ? actualizado : x)) }))
        } catch (fallo) {
            setErrorAccion(mensajeDeError(fallo))
        } finally {
            setOcupado(null)
        }
    }

    async function confirmarEliminar() {
        setEliminando(true)
        setErrorAccion('')
        try {
            await eliminarMonitoreo(porEliminar.monitoreo.id)
            setEstado((e) => ({ ...e, monitoreos: e.monitoreos.filter((x) => x.id !== porEliminar.monitoreo.id) }))
            setPorEliminar(null)
        } catch (fallo) {
            setErrorAccion(mensajeDeError(fallo))
            setPorEliminar(null)
        } finally {
            setEliminando(false)
        }
    }

    async function usarFoto(imagen) {
        setEligiendoFoto(true)
        setErrorAccion('')
        try {
            const actualizado = await elegirImagen(producto.id, imagen)
            setEstado((e) => ({ ...e, producto: actualizado }))
        } catch (fallo) {
            setErrorAccion(mensajeDeError(fallo))
        } finally {
            setEligiendoFoto(false)
        }
    }

    async function guardar(datos) {
        const actualizado = await actualizarProducto(producto.id, datos)
        setEstado((e) => ({ ...e, producto: actualizado }))
    }

    if (cargando) {
        return (
            <section className="detalle" aria-busy="true">
                <p className="sr-only" role="status">
                    Cargando producto…
                </p>
                <div className="detalle-esqueleto" aria-hidden="true">
                    <i />
                    <b />
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="detalle">
                <nav aria-label="Ruta" className="mini migas">
                    <Link to="/productos">Productos</Link>
                </nav>
                <div className="hoja detalle-error">
                    <Mensaje tipo="error">{error}</Mensaje>
                    <Link className="app-boton app-boton-claro" to="/productos">
                        Volver a productos
                    </Link>
                </div>
            </section>
        )
    }

    const bajo = producto.margenActual < producto.margenObjetivo
    const filas = filasDe(monitoreos)
    const publicaciones = filas.filter((f) => f.pub)
    const ultima = monitoreos.map((m) => m.ultimaCaptura).filter(Boolean).sort().pop()
    const activas = monitoreos.filter((m) => m.estado !== 'PAUSADO')
    // La escala compara con todas las publicaciones de reventa disponibles (Amazon ya viene en pesos)
    const reventa = activas.flatMap((m) => m.publicaciones.filter((p) => p.disponible).map((p) => ({ ...p, marketplace: m.marketplace })))
    const sitios = [...new Set(reventa.map((p) => p.marketplace))]
    const tituloEscala = sitios.length === 1 ? `Dónde está tu precio en ${MARKETPLACES[sitios[0]].nombre}` : 'Dónde está tu precio en la reventa'

    return (
        <section className="detalle" ref={ref} aria-labelledby="detalle-titulo">
            <nav aria-label="Ruta" className="mini migas detalle-entra">
                <Link to="/productos">Productos</Link>
                <span aria-hidden="true">›</span>
                <span aria-current="page">{producto.nombre}</span>
            </nav>

            {errorAccion && <Mensaje tipo="error">{errorAccion}</Mensaje>}

            <div className="detalle-arriba">
                <div className="detalle-entra detalle-fotos">
                    <Galeria fotos={fotos} elegida={producto.imagen} onElegir={usarFoto} ocupado={eligiendoFoto} />
                </div>

                <div className="detalle-info">
                    <div className="detalle-entra">
                        <div className="detalle-chips">
                            <span className={`estado ${activas.length ? 'estado-activo' : 'estado-pausado'}`}>
                                {activas.length ? 'Monitoreado cada 6 h' : 'Sin monitoreo activo'}
                            </span>
                            <span className="mini num">
                                {publicaciones.length === 1 ? '1 publicación' : `${publicaciones.length} publicaciones`}
                                {ultima && ` · última captura ${cuando(ultima)}`}
                            </span>
                        </div>
                        <h1 id="detalle-titulo">{producto.nombre}</h1>
                        <div className="mini num">SKU {producto.sku}</div>
                    </div>

                    <div className="hoja detalle-precio detalle-entra">
                        <div className="detalle-cifras">
                            <div>
                                <div className="mini detalle-rotulo">Tu precio</div>
                                <Paletas key={producto.precioVenta} texto={pesosEnPaletas(producto.precioVenta)} className="paletas-verde detalle-paletas" escalon={22} />
                            </div>
                            <div>
                                <div className="mini detalle-rotulo">Costo</div>
                                <div key={producto.costo} className={`num detalle-cifra${producto.costo !== costoInicial ? ' cifra-viva' : ''}`}>{formatearPesos(producto.costo)}</div>
                            </div>
                            <div>
                                <div className="mini detalle-rotulo">Margen actual</div>
                                <div key={producto.margenActual} className={`num detalle-cifra fuerte${producto.costo !== costoInicial ? ' cifra-viva' : ''}${bajo ? ' sube' : ' baja'}`}>
                                    {formatearPorcentaje(producto.margenActual)}
                                </div>
                            </div>
                            <div>
                                <div className="mini detalle-rotulo">Margen objetivo</div>
                                <div className="num detalle-cifra">{formatearPorcentaje(producto.margenObjetivo)}</div>
                            </div>
                            <button type="button" className="app-boton app-boton-claro app-boton-chico detalle-editar" onClick={() => setEditando(true)}>
                                Editar
                            </button>
                        </div>

                        {reventa.length > 0 ? (
                            <EscalaPrecio
                                key={reventa.map((p) => p.idPublicacion).join()}
                                precio={producto.precioVenta}
                                minimoObjetivo={precioMinimo(producto.costo, producto.margenObjetivo)}
                                margenObjetivo={producto.margenObjetivo}
                                publicaciones={reventa}
                                titulo={tituloEscala}
                            />
                        ) : (
                            <p className="mini detalle-sin-escala">
                                Cuando llegue la primera captura de la reventa verás aquí dónde queda tu precio frente a ella.
                            </p>
                        )}
                    </div>

                    <div className="detalle-entra">
                        <TarjetaProveedor producto={producto} />
                    </div>
                </div>
            </div>

            <div className="detalle-entra">
                <EscenariosPrecio
                    costo={producto.costo}
                    margenObjetivo={producto.margenObjetivo}
                    precioActual={producto.precioVenta}
                    publicaciones={reventa}
                    onAplicarPrecio={(nuevoPrecio) => guardar({ ...producto, precioVenta: nuevoPrecio })}
                />
            </div>

            <div className="detalle-entra">
                <EquivalenciasProducto
                    nombreProducto={producto.nombre}
                    publicaciones={reventa}
                    productoId={producto.id}
                />
            </div>

            <div className="detalle-entra">
                <AlertasAccionables
                    producto={producto}
                    monitoreos={monitoreos}
                    onAplicarPrecio={(nuevoPrecio) => guardar({ ...producto, precioVenta: nuevoPrecio })}
                />
            </div>

            <div className="detalle-entra">
                <AsistenteNegocio
                    producto={producto}
                    publicaciones={reventa}
                    onAplicarPrecio={(nuevoPrecio) => guardar({ ...producto, precioVenta: nuevoPrecio })}
                />
            </div>

            <div className="detalle-entra">
                <Competidores
                    monitoreos={monitoreos}
                    precioPropio={producto.precioVenta}
                    cambios={cambios}
                    llegadas={llegadas}
                    movimiento={movimiento}
                    ocupado={ocupado}
                    onAgregar={() => agregarRef.current?.enfocar()}
                    onAlternar={alternar}
                    onEliminar={(monitoreo, quien) => setPorEliminar({ monitoreo, quien })}
                />
            </div>

            <div className="detalle-entra">
                <AgregarCompetidor ref={agregarRef} onAgregar={agregar} />
            </div>

            {editando && <FormularioProducto producto={producto} onGuardar={guardar} onTerminar={() => setEditando(false)} onCerrar={() => setEditando(false)} />}

            {porEliminar && (
                <Dialogo titulo="¿Dejar de vigilar?" rol="alertdialog" onCerrar={() => setPorEliminar(null)}>
                    <p className="dialogo-texto">
                        {porEliminar.monitoreo.tipo === 'URL' ? (
                            <>
                                Trendly dejará de vigilar la publicación de <strong>{porEliminar.quien}</strong> y se borrará su histórico.
                            </>
                        ) : (
                            <>
                                Trendly dejará de vigilar la búsqueda <strong>"{porEliminar.monitoreo.valor}"</strong>. Sus{' '}
                                {porEliminar.monitoreo.publicaciones.length} publicaciones salen de la tabla.
                            </>
                        )}
                    </p>
                    <div className="dialogo-acciones">
                        <button type="button" className="app-boton app-boton-claro" onClick={() => setPorEliminar(null)}>
                            Cancelar
                        </button>
                        <button type="button" className="app-boton app-boton-peligro" disabled={eliminando} onClick={confirmarEliminar}>
                            {eliminando ? 'Eliminando…' : 'Dejar de vigilar'}
                        </button>
                    </div>
                </Dialogo>
            )}
        </section>
    )
}
