import { useState } from 'react'
import { mensajeDeError } from '@core/api/errores'
import { descargarReporte } from '@core/services/reportes.service'
import Mensaje from '@shared/components/Mensaje'
import { DIA } from './tablero'

const FORMATOS = [
    { valor: 'xlsx', nombre: 'Excel' },
    { valor: 'pdf', nombre: 'PDF' },
]

function guardarArchivo(archivo, nombre) {
    const url = URL.createObjectURL(archivo)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombre
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
}

// SCRUM-50: descarga el reporte del producto y del rango elegidos en el tablero
export default function DescargarReporte({ productoId, dias }) {
    const [formato, setFormato] = useState('xlsx')
    const [descargando, setDescargando] = useState(false)
    const [error, setError] = useState('')
    // Confirmación visible de la descarga: en el piloto SUS nadie sabía si el archivo ya se había generado
    const [descargado, setDescargado] = useState('')

    async function descargar() {
        setDescargando(true)
        setError('')
        setDescargado('')
        try {
            const hasta = new Date()
            const desde = new Date(hasta.getTime() - dias * DIA)
            const archivo = await descargarReporte({ formato, productoId, desde: desde.toISOString(), hasta: hasta.toISOString() })
            // en-CA escribe AAAA-MM-DD, con la fecha local y no la de UTC (de noche en Colombia, ya es mañana en UTC)
            const nombre = `reporte-trendly-${productoId}-${hasta.toLocaleDateString('en-CA')}.${formato}`
            guardarArchivo(archivo, nombre)
            setDescargado(nombre)
        } catch (fallo) {
            setError(mensajeDeError(fallo))
        } finally {
            setDescargando(false)
        }
    }

    return (
        <div className="tablero-reporte">
            <div className="tablero-campo">
                <label className="tablero-etiqueta" htmlFor="tablero-formato">
                    Formato
                </label>
                <select
                    id="tablero-formato"
                    value={formato}
                    onChange={(e) => {
                        setFormato(e.target.value)
                        setDescargado('')
                    }}
                >
                    {FORMATOS.map((f) => (
                        <option key={f.valor} value={f.valor}>
                            {f.nombre}
                        </option>
                    ))}
                </select>
            </div>
            <button type="button" className="app-boton" disabled={productoId === null || descargando} onClick={descargar}>
                {descargando ? 'Generando…' : 'Descargar reporte'}
            </button>
            {error && (
                <div className="tablero-reporte-error">
                    <Mensaje tipo="error">{error}</Mensaje>
                </div>
            )}
            {descargado && (
                <div className="tablero-reporte-error">
                    <Mensaje tipo="exito">
                        Reporte descargado: <strong>{descargado}</strong>. Lo encuentras en tu carpeta de descargas.
                    </Mensaje>
                </div>
            )}
        </div>
    )
}
