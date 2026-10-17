import { useState } from 'react'
import { mensajeDeError } from '@core/api/errores'
import CampoTexto from '@shared/components/CampoTexto'
import Dialogo from '@shared/components/Dialogo'
import Mensaje from '@shared/components/Mensaje'
import Paletas from '@shared/components/Paletas'
import { validarProducto } from '@shared/utils/validaciones'
import { calcularMargen, formatearPesos, formatearPorcentaje, precioMinimo } from './formato'

const VACIO = { nombre: '', sku: '', costo: '', precioVenta: '', margenObjetivo: '' }

const aValores = (producto) =>
    producto
        ? {
              nombre: producto.nombre,
              sku: producto.sku,
              costo: String(producto.costo),
              precioVenta: String(producto.precioVenta),
              margenObjetivo: String(producto.margenObjetivo),
          }
        : VACIO

// "56,2%" para las paletas: una cifra decimal basta para leer el margen de un vistazo
const margenCorto = (valor) => `${valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`

// El mismo formulario sirve para crear (producto = null) y para editar
export default function FormularioProducto({ producto, onGuardar, onCerrar }) {
    const [valores, setValores] = useState(() => aValores(producto))
    const [errores, setErrores] = useState({})
    const [errorApi, setErrorApi] = useState('')
    const [enviando, setEnviando] = useState(false)

    const margen = calcularMargen(valores.costo, valores.precioVenta)
    const hayObjetivo = valores.margenObjetivo !== ''
    const objetivo = Number(valores.margenObjetivo)
    const bajoObjetivo = margen !== null && hayObjetivo && margen < objetivo
    const minimo = hayObjetivo ? precioMinimo(valores.costo, objetivo) : null
    const ganancia = margen !== null ? Number(valores.precioVenta) - Number(valores.costo) : null

    function cambiar(evento) {
        const { name, value } = evento.target
        setValores((anterior) => ({ ...anterior, [name]: value }))
        setErrores((anterior) => ({ ...anterior, [name]: '' }))
    }

    async function enviar(evento) {
        evento.preventDefault()
        const encontrados = validarProducto(valores)
        setErrores(encontrados)
        if (Object.keys(encontrados).length > 0) return

        setEnviando(true)
        setErrorApi('')
        try {
            await onGuardar({
                nombre: valores.nombre.trim(),
                sku: valores.sku.trim(),
                costo: Number(valores.costo),
                precioVenta: Number(valores.precioVenta),
                margenObjetivo: Number(valores.margenObjetivo),
            })
        } catch (error) {
            setErrorApi(mensajeDeError(error))
            setEnviando(false)
        }
    }

    const numero = { type: 'number', inputMode: 'decimal', min: 0, step: 'any', onChange: cambiar }

    return (
        <Dialogo
            titulo={producto ? 'Editar producto' : 'Nuevo producto'}
            subtitulo={producto ? 'Tus datos de venta' : 'Paso 1 de 2 · tus datos de venta'}
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
                        <div className="form-producto-foto">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="16" rx="3" />
                                <circle cx="9" cy="10" r="1.6" />
                                <path d="m21 16-5-5-9 9" />
                            </svg>
                            Llega con la primera captura
                        </div>
                        <p className="form-producto-foto-nota">La tomamos de la publicación que vigiles en el paso 2.</p>
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
                    <CampoTexto etiqueta="Costo" name="costo" value={valores.costo} error={errores.costo} prefijo="$" {...numero} />
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

                <div className="form-producto-paso2">
                    <div className="form-producto-paso2-cabeza">
                        <strong>Paso 2 · competidores</strong>
                        <span>Próximamente</span>
                    </div>
                    <CampoTexto
                        etiqueta="URL de MercadoLibre o AliExpress"
                        name="urlCompetidor"
                        placeholder="https://articulo.mercadolibre.com.co/MCO-..."
                        disabled
                    />
                    <p className="campo-ayuda">Cuando esté lista esta parte, la primera captura llegará en máximo 6 horas.</p>
                </div>

                <div className="dialogo-acciones">
                    <button type="button" className="app-boton app-boton-claro" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className="app-boton" disabled={enviando}>
                        {enviando ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
                    </button>
                </div>
            </form>
        </Dialogo>
    )
}
