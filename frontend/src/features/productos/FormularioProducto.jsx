import { useState } from 'react'
import { mensajeDeError } from '@core/api/errores'
import CampoTexto from '@shared/components/CampoTexto'
import Dialogo from '@shared/components/Dialogo'
import Mensaje from '@shared/components/Mensaje'
import Paletas from '@shared/components/Paletas'
import { validarProducto } from '@shared/utils/validaciones'
import { calcularMargen, formatearPesos, formatearPorcentaje, precioMinimo } from './formato'

// Con proveedor, el costo base es su precio en pesos y aquí solo se editan los costos extra
const aValores = (producto) => ({
    nombre: producto.nombre,
    sku: producto.sku,
    costo: String(producto.proveedor ? producto.costo - (producto.costosExtra ?? 0) : producto.costo),
    costosExtra: producto.costosExtra ? String(producto.costosExtra) : '',
    precioVenta: String(producto.precioVenta),
    margenObjetivo: String(producto.margenObjetivo),
})

// "56,2%" para las paletas: una cifra decimal basta para leer el margen de un vistazo
const margenCorto = (valor) => `${valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`

// Edita un producto existente (crear es la pantalla /productos/nuevo, que parte del proveedor).
// Tras guardar, el botón muestra el check un instante y luego avisa con onTerminar
const PAUSA_DEL_CHECK = 480

export default function FormularioProducto({ producto, onGuardar, onTerminar, onCerrar }) {
    const [valores, setValores] = useState(() => aValores(producto))
    const [errores, setErrores] = useState({})
    const [errorApi, setErrorApi] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [hecho, setHecho] = useState(false)

    const conProveedor = Boolean(producto.proveedor)
    const costo = Number(valores.costo) + (Number(valores.costosExtra) || 0)
    const margen = calcularMargen(costo, valores.precioVenta)
    const hayObjetivo = valores.margenObjetivo !== ''
    const objetivo = Number(valores.margenObjetivo)
    const bajoObjetivo = margen !== null && hayObjetivo && margen < objetivo
    const minimo = hayObjetivo ? precioMinimo(costo, objetivo) : null
    const ganancia = margen !== null ? Number(valores.precioVenta) - costo : null

    function cambiar(evento) {
        const { name, value } = evento.target
        setValores((anterior) => ({ ...anterior, [name]: value }))
        setErrores((anterior) => ({ ...anterior, [name]: '' }))
    }

    async function enviar(evento) {
        evento.preventDefault()
        const encontrados = validarProducto(valores, { conProveedor })
        setErrores(encontrados)
        if (Object.keys(encontrados).length > 0) return

        setEnviando(true)
        setErrorApi('')
        try {
            await onGuardar({
                nombre: valores.nombre.trim(),
                sku: valores.sku.trim(),
                ...(conProveedor ? {} : { costo: Number(valores.costo) }),
                costosExtra: Number(valores.costosExtra) || 0,
                precioVenta: Number(valores.precioVenta),
                margenObjetivo: Number(valores.margenObjetivo),
            })
            setHecho(true)
            setTimeout(onTerminar, PAUSA_DEL_CHECK)
        } catch (error) {
            setErrorApi(mensajeDeError(error))
            setEnviando(false)
        }
    }

    const numero = { type: 'number', inputMode: 'decimal', min: 0, step: 'any', onChange: cambiar }

    return (
        <Dialogo
            titulo="Editar producto"
            subtitulo={conProveedor ? `Proveedor: ${producto.proveedor.tienda} en AliExpress` : 'Tus datos de venta'}
            className="dialogo-ancho"
            onCerrar={onCerrar}
        >
            {errorApi && <Mensaje tipo="error">{errorApi}</Mensaje>}
            <form className="form-producto" onSubmit={enviar} noValidate>
                <div className="form-producto-arriba">
                    <div>
                        <p className="form-producto-foto-titulo" aria-hidden="true">
                            Foto
                        </p>
                        {producto.imagen ? (
                            <img className="form-producto-foto form-producto-foto-img" src={producto.imagen} alt="" />
                        ) : (
                            <div className="form-producto-foto">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="4" width="18" height="16" rx="3" />
                                    <circle cx="9" cy="10" r="1.6" />
                                    <path d="m21 16-5-5-9 9" />
                                </svg>
                                Sin foto
                            </div>
                        )}
                        <p className="form-producto-foto-nota">{conProveedor ? 'Viene del proveedor. Cámbiala en el detalle.' : 'Llega con la primera captura.'}</p>
                    </div>
                    <div className="form-producto-datos-basicos">
                        <CampoTexto etiqueta="Nombre" name="nombre" value={valores.nombre} onChange={cambiar} error={errores.nombre} />
                        <div>
                            <CampoTexto etiqueta="SKU" name="sku" value={valores.sku} onChange={cambiar} error={errores.sku} />
                            {!errores.sku && <p className="campo-ayuda">Único entre tus productos.</p>}
                        </div>
                    </div>
                </div>

                <div className="form-producto-cifras">
                    {conProveedor ? (
                        <div className="campo">
                            <span className="campo-etiqueta-fija">Costo del proveedor</span>
                            <span className="campo-fijo num">{formatearPesos(Number(valores.costo))}</span>
                        </div>
                    ) : (
                        <CampoTexto etiqueta="Costo" name="costo" value={valores.costo} error={errores.costo} prefijo="$" {...numero} />
                    )}
                    <CampoTexto etiqueta="Costos extra" name="costosExtra" value={valores.costosExtra} error={errores.costosExtra} prefijo="$" {...numero} />
                    <CampoTexto
                        etiqueta="Precio de venta"
                        name="precioVenta"
                        value={valores.precioVenta}
                        error={errores.precioVenta}
                        prefijo="$"
                        {...numero}
                    />
                    <CampoTexto
                        etiqueta="Margen objetivo"
                        name="margenObjetivo"
                        value={valores.margenObjetivo}
                        error={errores.margenObjetivo}
                        prefijo="%"
                        {...numero}
                        max={100}
                    />
                </div>

                <dl className="form-producto-lectura">
                    <div>
                        <dt>Margen actual</dt>
                        <dd aria-hidden="true">
                            {margen === null ? (
                                <Paletas texto="--%" />
                            ) : (
                                <Paletas texto={margenCorto(margen)} className={bajoObjetivo ? 'paletas-rojo' : 'paletas-verde'} escalon={20} />
                            )}
                        </dd>
                        <p className={`form-producto-margen-texto${bajoObjetivo ? ' margen-bajo' : ''}`} aria-live="polite">
                            {margen === null
                                ? 'Escribe el costo y el precio para ver el margen.'
                                : `Margen con este precio: ${formatearPorcentaje(margen)}${bajoObjetivo ? ', por debajo del objetivo' : ''}`}
                        </p>
                    </div>
                    <div>
                        <dt>Precio mínimo para tu objetivo</dt>
                        <dd>{minimo === null ? '—' : formatearPesos(minimo)}</dd>
                    </div>
                    <div>
                        <dt>Ganancia por unidad</dt>
                        <dd className={ganancia !== null && ganancia < 0 ? 'negativo' : undefined}>
                            {ganancia === null ? '—' : formatearPesos(ganancia)}
                        </dd>
                    </div>
                </dl>

                <div className="dialogo-acciones">
                    <button type="button" className="app-boton app-boton-claro" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className={`app-boton boton-guardar${hecho ? ' hecho' : ''}`} disabled={enviando}>
                        {hecho ? (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path className="boton-guardar-check" d="M5 12.5l4.5 4.5L19 7.5" />
                                </svg>
                                Guardado
                            </>
                        ) : enviando ? (
                            'Guardando…'
                        ) : (
                            'Guardar cambios'
                        )}
                    </button>
                </div>
            </form>
        </Dialogo>
    )
}
