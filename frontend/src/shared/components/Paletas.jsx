import { useEffect, useRef, useState } from 'react'
import './Paletas.css'

// Orden de un tablero Solari: cada paleta pasa por los caracteres intermedios
const ORDEN = ' ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789$.,%+-'
const MAX_PASOS = 7

const movimientoReducido = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function caminoHasta(desde, hasta) {
  let i = ORDEN.indexOf(desde)
  const fin = ORDEN.indexOf(hasta)
  if (i < 0 || fin < 0) return [hasta]
  // unos pocos pasos intermedios: se lee como tablero, no como espera
  const total = (fin - i + ORDEN.length) % ORDEN.length
  i = (i + Math.max(0, total - MAX_PASOS)) % ORDEN.length
  const camino = []
  while (ORDEN[i] !== hasta) {
    i = (i + 1) % ORDEN.length
    camino.push(ORDEN[i])
  }
  return camino
}

function Paleta({ destino, retraso, ms }) {
  const [estado, setEstado] = useState({ actual: ' ', siguiente: ' ', vuelta: 0 })
  const actualRef = useRef(' ')

  const quieto = movimientoReducido()

  useEffect(() => {
    if (quieto) return undefined
    let cancelado = false
    const timers = []
    const esperar = (t) => new Promise((ok) => timers.push(setTimeout(ok, t)))

    async function girar() {
      await esperar(retraso)
      for (const ch of caminoHasta(actualRef.current, destino)) {
        if (cancelado) return
        const previo = actualRef.current
        setEstado((e) => ({ actual: previo, siguiente: ch, vuelta: e.vuelta + 1 }))
        await esperar(ms * 2)
        if (cancelado) return
        actualRef.current = ch
        setEstado((e) => ({ actual: ch, siguiente: ch, vuelta: e.vuelta }))
      }
    }
    girar()
    return () => {
      cancelado = true
      timers.forEach(clearTimeout)
    }
  }, [destino, retraso, ms, quieto])

  // Con movimiento reducido la paleta muestra el destino de una vez
  const { actual, siguiente, vuelta } = quieto ? { actual: destino, siguiente: destino, vuelta: 0 } : estado
  const gira = actual !== siguiente
  return (
    <span className={`paleta${gira ? ' gira' : ''}`} style={{ '--giro': `${ms}ms` }} aria-hidden="true">
      <span className="p-arriba"><i>{siguiente}</i></span>
      <span className="p-abajo"><i>{actual}</i></span>
      {gira && (
        <>
          <span key={`a${vuelta}`} className="h-arriba"><i>{actual}</i></span>
          <span key={`b${vuelta}`} className="h-abajo"><i>{siguiente}</i></span>
        </>
      )}
    </span>
  )
}

/**
 * Texto escrito en paletas giratorias.
 * `largo` fija cuántas paletas hay; `alinear="der"` rellena por la izquierda (cifras).
 */
export default function Paletas({ texto, largo = texto.length, alinear = 'izq', acento = false, retraso = 0, escalon = 28, ms = 55, className = '' }) {
  const limpio = texto.toUpperCase().slice(0, largo)
  const relleno = alinear === 'der' ? limpio.padStart(largo) : limpio.padEnd(largo)
  return (
    <span className={`paletas${acento ? ' paletas-acento' : ''} ${className}`.trim()} role="img" aria-label={texto.trim()}>
      {[...relleno].map((ch, n) => (
        <Paleta key={n} destino={ch} retraso={retraso + n * escalon} ms={ms} />
      ))}
    </span>
  )
}
