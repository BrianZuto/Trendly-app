import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { mensajeDeError } from '@core/api/errores'
import Mensaje from '@shared/components/Mensaje'
import { marketplaceDeUrl, validarCompetidorUrl, validarPalabraClave } from '@shared/utils/validaciones'
import { MARKETPLACES, SITIOS_REVENTA } from './util'

gsap.registerPlugin(useGSAP)

const PALABRA_VACIA = { valor: '', marketplace: 'MERCADOLIBRE', topN: '5' }

// 409 y 400 llegan con el mensaje del API; el 422 (cupo) se explica sin hablar de planes
const MENSAJE_CUPO = 'Llegaste al máximo de competidores para este producto. Elimina uno para agregar otro'

const animar = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches

// Lo que Trendly "hace" con lo que pegaste, contado en tres pasos mientras se ve el escaneo
function pasosDe(monitoreo) {
    const mk = MARKETPLACES[monitoreo.marketplace].nombre
    if (monitoreo.tipo === 'URL') {
        return [`Reconocí una publicación de ${mk}`, `Identificador ${monitoreo.idPublicacion}`, 'Primera captura en camino']
    }
    return [`Búsqueda "${monitoreo.valor}" en ${mk}`, `Guardaré los primeros ${monitoreo.topN} resultados`, 'Primera captura en camino']
}

// Una ficha sale del formulario y vuela en arco hasta la fila nueva de la tabla
function volar(desde, fila, texto, clase) {
    const inicio = desde.getBoundingClientRect()
    const fin = fila.getBoundingClientRect()
    const ficha = document.createElement('span')
    ficha.className = `ficha-vuelo mk ${clase}`
    ficha.textContent = texto
    document.body.appendChild(ficha)
    const x0 = Math.min(Math.max(inicio.left, 8), window.innerWidth - 120)
    const y0 = Math.min(Math.max(inicio.top, 8), window.innerHeight - 40)
    gsap.set(ficha, { left: x0, top: y0 })
    const dx = fin.left + 28 - x0
    const dy = fin.top + fin.height / 2 - 11 - y0
    return gsap
        .timeline({ onComplete: () => ficha.remove() })
        .to(ficha, { x: dx, duration: 0.85, ease: 'power1.inOut' }, 0)
        .to(ficha, { y: dy, duration: 0.85, ease: 'back.in(1.6)' }, 0)
        .to(ficha, { scale: 1.25, duration: 0.2, ease: 'power2.out' }, 0)
        .to(ficha, { scale: 0.6, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0.7)
}

const AgregarCompetidor = forwardRef(function AgregarCompetidor({ onAgregar }, refExterno) {
    const ref = useRef(null)
    const urlRef = useRef(null)
    const palabraRef = useRef(null)
    const [modo, setModo] = useState('url')
    const [url, setUrl] = useState('')
    const [palabra, setPalabra] = useState(PALABRA_VACIA)
    const [errores, setErrores] = useState({})
    const [errorApi, setErrorApi] = useState('')
    const [enviando, setEnviando] = useState(false)
    // El monitoreo recién creado mientras se ve su escaneo
    const [escaneo, setEscaneo] = useState(null)
    const { contextSafe } = useGSAP({ scope: ref })

    useImperativeHandle(refExterno, () => ({
        enfocar() {
            ref.current.scrollIntoView?.({ behavior: animar() ? 'smooth' : 'auto', block: 'center' })
            ;(modo === 'url' ? urlRef : palabraRef).current?.focus({ preventScroll: true })
        },
    }))

    const detectado = modo === 'url' ? marketplaceDeUrl(url) : null

    function cambiarModo(siguiente) {
        setModo(siguiente)
        setErrores({})
        setErrorApi('')
    }

    const escanear = contextSafe((monitoreo) => {
        const fila = () => document.querySelector(`[data-monitoreo="${monitoreo.id}"]`)
        if (!animar()) {
            setEscaneo(null)
            return
        }
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('.escaneo', { autoAlpha: 0, y: 8, duration: 0.25 })
            .from('.escaneo-sello', { scale: 0, rotation: -12, duration: 0.5, ease: 'back.out(2.4)' }, 0.05)
            .fromTo('.escaneo-haz', { xPercent: -100 }, { xPercent: 260, duration: 0.9, ease: 'power2.inOut' }, 0.15)
            .from('.escaneo-paso', { autoAlpha: 0, x: -10, duration: 0.3, stagger: 0.32 }, 0.3)
            .from('.escaneo-paso i', { scale: 0, duration: 0.3, ease: 'back.out(3)', stagger: 0.32 }, 0.42)
            .add(() => {
                const destino = fila()
                destino?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
            }, '+=0.25')
            .add(() => {
                const destino = fila()
                const sello = ref.current?.querySelector('.escaneo-sello')
                if (destino && sello) {
                    const mk = MARKETPLACES[monitoreo.marketplace]
                    volar(sello, destino, mk.nombre, mk.clase).add(() => destino.classList.add('fila-aterriza'))
                }
            }, '+=0.45')
            .to('.escaneo', { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, '+=0.5')
            .add(() => setEscaneo(null))
    })

    async function enviar(evento) {
        evento.preventDefault()
        setErrorApi('')
        const datos =
            modo === 'url'
                ? { tipo: 'URL', valor: url.trim() }
                : { tipo: 'PALABRA_CLAVE', valor: palabra.valor.trim(), marketplace: palabra.marketplace, topN: Number(palabra.topN) }
        const encontrados = modo === 'url' ? (validarCompetidorUrl(url) ? { url: validarCompetidorUrl(url) } : {}) : validarPalabraClave(palabra)
        setErrores(encontrados)
        if (Object.keys(encontrados).length > 0) {
            ;(modo === 'url' ? urlRef : palabraRef).current?.focus()
            return
        }
        setEnviando(true)
        try {
            const creado = await onAgregar(datos)
            setUrl('')
            setPalabra(PALABRA_VACIA)
            setEscaneo(creado)
            requestAnimationFrame(() => escanear(creado))
        } catch (fallo) {
            setErrorApi(mensajeDeError(fallo, { 422: MENSAJE_CUPO }))
        } finally {
            setEnviando(false)
        }
    }

    return (
        <section id="agregar" className="hoja agregar" aria-labelledby="agregar-titulo" ref={ref}>
            <div>
                <h2 id="agregar-titulo">Agregar competidor</h2>
                <p className="mini">Vigila una publicación de reventa puntual o los primeros resultados de una búsqueda. Trendly lo revisa cada 6 horas.</p>
            </div>
            <div className="pestanas" role="tablist" aria-label="Tipo de monitoreo">
                <button type="button" role="tab" className={modo === 'url' ? 'on' : ''} aria-selected={modo === 'url'} onClick={() => cambiarModo('url')}>
                    Por URL
                </button>
                <button type="button" role="tab" className={modo === 'palabra' ? 'on' : ''} aria-selected={modo === 'palabra'} onClick={() => cambiarModo('palabra')}>
                    Por palabra clave
                </button>
            </div>

            <form className="agregar-form" onSubmit={enviar} noValidate>
                {errorApi && <Mensaje tipo="error">{errorApi}</Mensaje>}
                {modo === 'url' ? (
                    <>
                        <div className="agregar-fila">
                            <div className="campo campo-url">
                                <label htmlFor="url-competidor">URL de la publicación</label>
                                <span className="campo-con-sello">
                                    <input
                                        id="url-competidor"
                                        ref={urlRef}
                                        type="url"
                                        inputMode="url"
                                        autoComplete="off"
                                        placeholder="https://articulo.mercadolibre.com.co/MCO-…"
                                        value={url}
                                        aria-invalid={Boolean(errores.url)}
                                        aria-describedby={errores.url ? 'url-error' : undefined}
                                        onChange={(e) => {
                                            setUrl(e.target.value)
                                            if (errores.url) setErrores({})
                                        }}
                                    />
                                    {detectado && (
                                        <span key={detectado} className={`mk ${MARKETPLACES[detectado].clase} sello-detectado`}>
                                            {MARKETPLACES[detectado].nombre}
                                        </span>
                                    )}
                                </span>
                                {errores.url && (
                                    <p id="url-error" className="err" role="alert">
                                        {errores.url}.
                                    </p>
                                )}
                            </div>
                            <button type="submit" className="app-boton" disabled={enviando}>
                                {enviando ? 'Agregando…' : 'Agregar'}
                            </button>
                        </div>
                        <p className="mini">Ejemplos válidos: articulo.mercadolibre.com.co/MCO-… · falabella.com.co/falabella-co/product/… · amazon.com/dp/…</p>
                    </>
                ) : (
                    <>
                        <div className="agregar-fila">
                            <div className="campo campo-palabra">
                                <label htmlFor="palabra-clave">Palabra clave</label>
                                <input
                                    id="palabra-clave"
                                    ref={palabraRef}
                                    maxLength={80}
                                    autoComplete="off"
                                    placeholder="smartwatch amoled"
                                    value={palabra.valor}
                                    aria-invalid={Boolean(errores.valor)}
                                    aria-describedby={errores.valor ? 'palabra-error' : undefined}
                                    onChange={(e) => setPalabra((p) => ({ ...p, valor: e.target.value }))}
                                />
                                {errores.valor && (
                                    <p id="palabra-error" className="err" role="alert">
                                        {errores.valor}.
                                    </p>
                                )}
                            </div>
                            <div className="campo campo-mk">
                                <label htmlFor="palabra-mk">Marketplace</label>
                                <select id="palabra-mk" value={palabra.marketplace} onChange={(e) => setPalabra((p) => ({ ...p, marketplace: e.target.value }))}>
                                    {SITIOS_REVENTA.map((sitio) => (
                                        <option key={sitio} value={sitio}>
                                            {MARKETPLACES[sitio].nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="campo campo-top">
                                <label htmlFor="palabra-top">Primeros</label>
                                <select id="palabra-top" value={palabra.topN} onChange={(e) => setPalabra((p) => ({ ...p, topN: e.target.value }))}>
                                    {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="app-boton" disabled={enviando}>
                                {enviando ? 'Agregando…' : 'Agregar'}
                            </button>
                        </div>
                        <p className="mini">
                            De 3 a 80 caracteres. Se guardan los primeros resultados con su posición, para comparar la misma publicación entre
                            capturas.
                        </p>
                    </>
                )}

                {escaneo && (
                    <div className="escaneo" role="status">
                        <span className={`escaneo-sello mk ${MARKETPLACES[escaneo.marketplace].clase}`}>{MARKETPLACES[escaneo.marketplace].nombre}</span>
                        <span className="escaneo-valor">
                            <span className="escaneo-texto">{escaneo.valor}</span>
                            <span className="escaneo-haz" aria-hidden="true" />
                        </span>
                        <ol className="escaneo-pasos">
                            {pasosDe(escaneo).map((paso) => (
                                <li key={paso} className="escaneo-paso">
                                    <i aria-hidden="true">✓</i>
                                    {paso}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </form>
        </section>
    )
})

export default AgregarCompetidor
