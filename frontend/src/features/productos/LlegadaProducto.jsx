import { useState } from 'react'
import Paletas from '@shared/components/Paletas'
import { formatearPorcentaje, pesosEnPaletas } from './formato'
import './LlegadaProducto.css'

const CHISPAS = 14

// Cuelga del borde de la barra si se ve; si ya se desplazó, del borde de la ventana
const bordeDeLaBarra = () => Math.max(0, document.querySelector('.app-barra')?.getBoundingClientRect().bottom ?? 0)

// El producto nuevo llega como una etiqueta de precio colgada en el puesto:
// cae, se balancea, sigue al puntero y se cierra sola si no la tocas
export default function LlegadaProducto({ producto, onVerEnLista, onAgregarOtro, onCerrar }) {
    const [inclinacion, setInclinacion] = useState(0)
    const [tirones, setTirones] = useState(0)
    const [arriba] = useState(bordeDeLaBarra)
    const bajo = producto.margenActual < producto.margenObjetivo

    function seguir(evento) {
        if (evento.pointerType !== 'mouse') return
        const caja = evento.currentTarget.getBoundingClientRect()
        const x = (evento.clientX - (caja.left + caja.width / 2)) / (caja.width / 2)
        setInclinacion(Math.max(-1, Math.min(1, x)) * -9)
    }

    // Un toque en la etiqueta (fuera de los botones) la hace balancearse otra vez
    function tirar(evento) {
        if (evento.target.closest('button')) return
        setTirones((n) => n + 1)
    }

    return (
        <div
            className="llegada"
            style={{ top: arriba }}
            onKeyDown={(evento) => evento.key === 'Escape' && onCerrar()}
        >
            <span className="llegada-cuerda" aria-hidden="true" />
            <div key={tirones} className={`llegada-vaiven${tirones ? ' llegada-tiron' : ''}`}>
                <div
                    className="llegada-etiqueta"
                    style={{ '--inclinacion': `${inclinacion}deg` }}
                    onPointerMove={seguir}
                    onPointerLeave={() => setInclinacion(0)}
                    onClick={tirar}
                >
                    <span className="llegada-ojal" aria-hidden="true" />
                    <span className="llegada-chispas" aria-hidden="true">
                        {Array.from({ length: CHISPAS }, (_, n) => (
                            <i key={n} style={{ '--n': n, '--lejos': `${110 + (n % 4) * 28}px` }} />
                        ))}
                    </span>

                    <button type="button" className="llegada-cerrar" aria-label="Cerrar aviso" onClick={onCerrar}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                    </button>

                    <p className="llegada-antetitulo" role="status">
                        Producto creado
                    </p>
                    <p className="llegada-nombre">{producto.nombre}</p>
                    <Paletas texto={pesosEnPaletas(producto.precioVenta)} className="llegada-precio" retraso={520} escalon={45} ms={60} />
                    <p className={`llegada-margen${bajo ? ' es-bajo' : ''}`}>
                        Margen {formatearPorcentaje(producto.margenActual)}
                        <span> · objetivo {formatearPorcentaje(producto.margenObjetivo)}</span>
                    </p>
                    <p className="llegada-sku">SKU {producto.sku}</p>

                    <div className="llegada-acciones">
                        <button type="button" className="llegada-boton" onClick={onVerEnLista}>
                            Ver en la lista
                        </button>
                        <button type="button" className="llegada-boton llegada-boton-claro" onClick={onAgregarOtro}>
                            Agregar otro
                        </button>
                    </div>

                    <span className="llegada-tiempo" aria-hidden="true" onAnimationEnd={onCerrar} />
                </div>
            </div>
        </div>
    )
}
