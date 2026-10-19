import { lazy, Suspense, useState } from 'react'
import { Miniaturas, NotaGaleria } from './GaleriaPartes'
import { etiquetaFoto } from './util'

// three.js pesa: solo se descarga cuando hay fotos y el navegador puede dibujar en 3D
const Galeria3D = lazy(() => import('./Galeria3D'))

function puede3D() {
    if (typeof window === 'undefined' || navigator.userAgent.includes('jsdom')) return false
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    try {
        const lienzo = document.createElement('canvas')
        return Boolean(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'))
    } catch {
        return false
    }
}

// La misma galería del tablero, sin 3D: foto grande y miniaturas
function GaleriaPlana({ fotos, elegida, onElegir, ocupado }) {
    const [vista, setVista] = useState(() => Math.max(0, fotos.findIndex((f) => f.imagen === elegida)))
    const foto = fotos[Math.min(vista, fotos.length - 1)]
    const enUso = foto.imagen === elegida
    return (
        <section className="galeria" aria-label="Fotos">
            <div className="hoja galeria-marco">
                <img className="galeria-foto" src={foto.imagen} alt={`Foto de la publicación de ${foto.vendedor}`} />
                <span className="galeria-etiqueta">{etiquetaFoto(foto, enUso)}</span>
                {!enUso && (
                    <button type="button" className="galeria-usar" disabled={ocupado} onClick={() => onElegir(foto.imagen)}>
                        Usar esta foto
                    </button>
                )}
            </div>
            <Miniaturas fotos={fotos} activa={vista} onElegir={setVista} />
            <NotaGaleria />
        </section>
    )
}

export default function Galeria(props) {
    const [en3D] = useState(puede3D)
    if (props.fotos.length === 0) {
        return (
            <section className="galeria" aria-label="Fotos">
                <div className="hoja galeria-marco galeria-vacia">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01" />
                    </svg>
                    <strong>La foto llega con la primera captura</strong>
                    <span className="mini">Agrega un competidor y Trendly tomará la foto de su publicación.</span>
                </div>
            </section>
        )
    }
    if (!en3D) return <GaleriaPlana {...props} />
    return (
        <Suspense fallback={<GaleriaPlana {...props} />}>
            <Galeria3D {...props} />
        </Suspense>
    )
}
