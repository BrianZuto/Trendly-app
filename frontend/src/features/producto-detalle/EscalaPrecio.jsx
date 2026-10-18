import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { MARKETPLACES, pesos } from './util'

gsap.registerPlugin(useGSAP)

// "Dónde está tu precio": cada publicación es un punto en una sola línea de precios,
// con la zona en la que no cumples tu margen objetivo pintada de rojo
export default function EscalaPrecio({ precio, minimoObjetivo, margenObjetivo, publicaciones, titulo }) {
    const ref = useRef(null)
    const precios = publicaciones.map((p) => p.precio)
    const menor = Math.min(...precios, precio)
    const mayor = Math.max(...precios, precio)
    const holgura = (mayor - menor) * 0.06 || mayor * 0.05
    const desde = menor - holgura
    const hasta = mayor + holgura
    const pos = (valor) => ((valor - desde) / (hasta - desde)) * 100

    const ordenadas = [...publicaciones].sort((a, b) => a.precio - b.precio)
    const barata = ordenadas[0]
    const cara = ordenadas[ordenadas.length - 1]
    const promedio = Math.round(precios.reduce((a, b) => a + b, 0) / precios.length / 100) * 100
    const puesto = ordenadas.filter((p) => p.precio < precio).length + 1
    const zona = minimoObjetivo ? Math.min(100, Math.max(0, pos(minimoObjetivo))) : 0

    // Los puntos salen del centro y se reparten; el marcador "Tú" cae y rebota al final
    useGSAP(
        () => {
            const mm = gsap.matchMedia()
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                // Al terminar la entrada, los puntos se deslizan cuando un precio cambia (transición CSS)
                gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => ref.current?.classList.add('escala-lista') })
                    .from('.escala-zona', { scaleX: 0, transformOrigin: 'left center', duration: 0.6 })
                    .from('.escala-punto', { left: '50%', scale: 0, duration: 0.7, stagger: 0.05 }, 0.1)
                    .from('.escala-tu', { y: -26, autoAlpha: 0, duration: 0.8, ease: 'bounce.out' }, 0.45)
            })
        },
        { scope: ref },
    )

    return (
        <div className="escala" ref={ref}>
            <p className="escala-titulo">{titulo}</p>
            <div className="escala-pista" role="img" aria-label={`Tu precio ${pesos(precio)}. Eres el ${puesto}.º más barato de ${publicaciones.length + 1}. Promedio ${pesos(promedio)}.`}>
                {zona > 0 && (
                    <span className="escala-zona" style={{ width: `${zona}%` }}>
                        <span>No cumples tu {margenObjetivo.toLocaleString('es-CO')}%</span>
                    </span>
                )}
                <span className="escala-linea" />
                <span className="escala-promedio" style={{ left: `${pos(promedio)}%` }} />
                {ordenadas.map((p) => (
                    <span
                        key={p.idPublicacion}
                        className={`escala-punto${p === barata ? ' es-barata' : ''}`}
                        style={{ left: `${pos(p.precio)}%` }}
                        title={`${p.vendedor} · ${MARKETPLACES[p.marketplace]?.nombre ?? ''} · ${pesos(p.precio)}`}
                    />
                ))}
                <span className="escala-tu" style={{ left: `${pos(precio)}%` }}>
                    <b>Tú {pesos(precio)}</b>
                    <i />
                </span>
            </div>
            <div className="escala-extremos">
                <span>
                    <strong className="num">{pesos(barata.precio)}</strong>
                    {barata.vendedor}
                </span>
                <span>
                    <strong className="num">{pesos(cara.precio)}</strong>
                    {cara.vendedor}
                </span>
            </div>
            <p className="escala-leyenda">
                <span className="escala-leyenda-punto" /> Una publicación
                <span className="escala-leyenda-promedio" /> Promedio <span className="num">{pesos(promedio)}</span>
                <span className="escala-leyenda-puesto">
                    Eres el {puesto}.º más barato de {publicaciones.length + 1}
                </span>
            </p>
        </div>
    )
}
