import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { Miniaturas, NotaGaleria } from './GaleriaPartes'
import { etiquetaFoto } from './util'

const ANCHO = 1.7
const GROSOR = 0.05
const PAPEL = 0xfffdf8

// Sombra suave bajo el carrusel, pintada una vez en un canvas
function texturaSombra() {
    const lienzo = document.createElement('canvas')
    lienzo.width = lienzo.height = 128
    const ctx = lienzo.getContext('2d')
    const degradado = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
    degradado.addColorStop(0, 'rgba(15,36,27,0.32)')
    degradado.addColorStop(1, 'rgba(15,36,27,0)')
    ctx.fillStyle = degradado
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(lienzo)
}

// Las fotos de la competencia giran en un carrusel 3D: se arrastra con inercia,
// un clic trae la foto al frente y, si nadie lo toca, sigue girando despacio
export default function Galeria3D({ fotos, elegida, onElegir, ocupado }) {
    const lienzoRef = useRef(null)
    const control = useRef(null)
    // Arranca mostrando la foto en uso; leerla en un ref evita rehacer la escena al elegir otra
    const inicial = Math.max(0, fotos.findIndex((f) => f.imagen === elegida))
    const inicialRef = useRef(inicial)
    const [frente, setFrente] = useState(inicial)

    useEffect(() => {
        inicialRef.current = inicial
    })

    useEffect(() => {
        const host = lienzoRef.current
        const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        host.appendChild(renderer.domElement)

        const escena = new THREE.Scene()
        const camara = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
        escena.add(new THREE.HemisphereLight(0xfffdf8, 0xd6ccb7, 1.6))
        const luz = new THREE.DirectionalLight(0xffffff, 1.4)
        luz.position.set(3, 4, 6)
        escena.add(luz)

        const n = fotos.length
        const paso = (Math.PI * 2) / n
        const radio = n === 1 ? 0 : n === 2 ? 1.25 : Math.min(3.2, 0.9 + n * 0.34)
        const anillo = new THREE.Group()
        escena.add(anillo)

        const cargador = new THREE.TextureLoader()
        const geometria = new THREE.BoxGeometry(ANCHO, ANCHO, GROSOR)
        const papel = new THREE.MeshStandardMaterial({ color: PAPEL, roughness: 0.9 })
        const desechables = [geometria, papel]
        const tarjetas = fotos.map((foto, i) => {
            const textura = cargador.load(foto.imagen)
            textura.colorSpace = THREE.SRGBColorSpace
            textura.anisotropy = renderer.capabilities.getMaxAnisotropy()
            const frente = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.55 })
            desechables.push(textura, frente)
            const tarjeta = new THREE.Mesh(geometria, [papel, papel, papel, papel, frente, papel])
            const angulo = i * paso
            tarjeta.position.set(Math.sin(angulo) * radio, 0, Math.cos(angulo) * radio)
            tarjeta.rotation.y = angulo
            tarjeta.userData.indice = i
            anillo.add(tarjeta)
            return tarjeta
        })

        const sombra = new THREE.Mesh(
            new THREE.PlaneGeometry(radio * 2 + 2.6, radio * 2 + 2.6),
            new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }),
        )
        sombra.rotation.x = -Math.PI / 2
        sombra.position.y = -ANCHO / 2 - 0.12
        escena.add(sombra)
        desechables.push(sombra.geometry, sombra.material, sombra.material.map)

        camara.position.set(0, 0.55, radio + 4.1)
        camara.lookAt(0, -0.05, 0)

        function ajustar() {
            const { clientWidth: w, clientHeight: h } = host
            renderer.setSize(w, h, false)
            camara.aspect = w / h
            camara.updateProjectionMatrix()
        }
        ajustar()
        const observador = new ResizeObserver(ajustar)
        observador.observe(host)

        // estado del giro: rot es el ángulo del anillo; la foto i queda al frente cuando rot = -i·paso
        const reposo = -inicialRef.current * paso
        const giro = { rot: reposo, vel: 0, arrastrando: false, inclinar: 0, encima: false, tween: null }
        let ultimoFrente = inicialRef.current

        const llevarA = (indice) => {
            const objetivo = -indice * paso
            // por el camino más corto
            const actual = giro.rot
            const vueltas = Math.round((actual - objetivo) / (Math.PI * 2))
            giro.tween?.kill()
            giro.vel = 0
            giro.tween = gsap.to(giro, {
                rot: objetivo + vueltas * Math.PI * 2,
                duration: quieto ? 0 : 0.9,
                ease: 'power3.inOut',
                onComplete: () => (giro.tween = null),
            })
        }
        control.current = {
            llevarA,
            mover: (d) => llevarA(((Math.round(-giro.rot / paso) + d) % n + n) % n),
        }

        const raycaster = new THREE.Raycaster()
        const puntero = new THREE.Vector2()
        let inicioX = 0
        let ultimoX = 0
        let movido = 0

        function abajo(e) {
            giro.arrastrando = true
            giro.tween?.kill()
            giro.tween = null
            inicioX = ultimoX = e.clientX
            movido = 0
            renderer.domElement.setPointerCapture(e.pointerId)
        }
        function mover(e) {
            const caja = renderer.domElement.getBoundingClientRect()
            giro.inclinar = ((e.clientY - caja.top) / caja.height - 0.5) * 0.12
            if (!giro.arrastrando) return
            const dx = e.clientX - ultimoX
            ultimoX = e.clientX
            movido = Math.max(movido, Math.abs(e.clientX - inicioX))
            giro.rot += dx * 0.009
            giro.vel = dx * 0.009
        }
        function arriba(e) {
            if (!giro.arrastrando) return
            giro.arrastrando = false
            if (movido < 5) {
                const caja = renderer.domElement.getBoundingClientRect()
                puntero.set(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1)
                raycaster.setFromCamera(puntero, camara)
                const golpe = raycaster.intersectObjects(tarjetas)[0]
                if (golpe) llevarA(golpe.object.userData.indice)
            } else if (quieto) {
                llevarA(((Math.round(-giro.rot / paso) % n) + n) % n)
            }
        }
        const entrar = () => (giro.encima = true)
        const salir = () => {
            giro.encima = false
            giro.inclinar = 0
        }
        const lienzo = renderer.domElement
        lienzo.addEventListener('pointerdown', abajo)
        lienzo.addEventListener('pointermove', mover)
        lienzo.addEventListener('pointerup', arriba)
        lienzo.addEventListener('pointercancel', arriba)
        lienzo.addEventListener('pointerenter', entrar)
        lienzo.addEventListener('pointerleave', salir)

        // Entrada: el anillo llega girando y se asienta
        if (!quieto && n > 1) {
            giro.rot = reposo - Math.PI * 1.2
            giro.tween = gsap.to(giro, { rot: reposo, duration: 1.6, ease: 'expo.out', onComplete: () => (giro.tween = null) })
        }

        const reloj = new THREE.Clock()
        renderer.setAnimationLoop(() => {
            const dt = Math.min(reloj.getDelta(), 0.05)
            if (!giro.arrastrando && !giro.tween && n > 1) {
                if (Math.abs(giro.vel) > 0.0004) {
                    giro.rot += giro.vel
                    giro.vel *= 0.94
                } else if (!giro.encima && !quieto) {
                    giro.rot -= dt * 0.22
                }
            }
            // Con una sola foto no hay carrusel: la tarjeta se mece sola
            anillo.rotation.y = n > 1 || quieto ? giro.rot : giro.rot + Math.sin(performance.now() / 1400) * 0.32
            anillo.rotation.x += (giro.inclinar - anillo.rotation.x) * 0.08
            const actual = ((Math.round(-giro.rot / paso) % n) + n) % n
            tarjetas.forEach((t, i) => {
                const meta = i === actual ? 1.06 : 0.94
                t.scale.setScalar(t.scale.x + (meta - t.scale.x) * 0.12)
                t.position.y = Math.sin(performance.now() / 900 + i) * (quieto ? 0 : 0.035)
            })
            if (actual !== ultimoFrente) {
                ultimoFrente = actual
                setFrente(actual)
            }
            renderer.render(escena, camara)
        })

        return () => {
            renderer.setAnimationLoop(null)
            giro.tween?.kill()
            observador.disconnect()
            lienzo.removeEventListener('pointerdown', abajo)
            lienzo.removeEventListener('pointermove', mover)
            lienzo.removeEventListener('pointerup', arriba)
            lienzo.removeEventListener('pointercancel', arriba)
            lienzo.removeEventListener('pointerenter', entrar)
            lienzo.removeEventListener('pointerleave', salir)
            desechables.forEach((d) => d.dispose())
            renderer.dispose()
            lienzo.remove()
        }
    }, [fotos])

    const foto = fotos[Math.min(frente, fotos.length - 1)]
    const enUso = foto.imagen === elegida

    return (
        <section className="galeria" aria-label="Fotos" aria-roledescription="carrusel">
            <div className="hoja galeria-marco galeria-3d">
                <div className="galeria-lienzo" ref={lienzoRef} />
                <span className="galeria-etiqueta" aria-live="polite">
                    {etiquetaFoto(foto, enUso)}
                </span>
                {!enUso && (
                    <button type="button" className="galeria-usar" disabled={ocupado} onClick={() => onElegir(foto.imagen)}>
                        Usar esta foto
                    </button>
                )}
                {fotos.length > 1 && (
                    <>
                        <button type="button" className="galeria-flecha izq" aria-label="Foto anterior" onClick={() => control.current?.mover(-1)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                        </button>
                        <button type="button" className="galeria-flecha der" aria-label="Foto siguiente" onClick={() => control.current?.mover(1)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                        </button>
                    </>
                )}
            </div>
            <Miniaturas fotos={fotos} activa={frente} onElegir={(i) => control.current?.llevarA(i)} />
            <NotaGaleria giratoria={fotos.length > 1} />
        </section>
    )
}
