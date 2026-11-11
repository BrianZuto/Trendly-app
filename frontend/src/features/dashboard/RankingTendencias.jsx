import { useEffect, useState } from 'react'
import { mensajeDeError } from '@core/api/errores'
import { listarTendencias } from '@core/services/tendencias.service'
import Mensaje from '@shared/components/Mensaje'
import { pesos } from './tablero'
import './RankingTendencias.css'

const TOP = 20
const puntos = (valor) => Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Ranking de productos en tendencia (SCRUM-53): el puntaje y las tres variables de cada producto
export default function RankingTendencias() {
    const [estado, setEstado] = useState({ filas: null, error: '' })

    useEffect(() => {
        let vigente = true
        listarTendencias(TOP)
            .then((filas) => vigente && setEstado({ filas, error: '' }))
            .catch((fallo) => vigente && setEstado({ filas: [], error: mensajeDeError(fallo) }))
        return () => {
            vigente = false
        }
    }, [])

    const { filas, error } = estado

    return (
        <section id="ranking-tendencias" className="tablero-panel ranking-tendencias" aria-labelledby="ranking-tendencias-titulo" aria-busy={!filas}>
            <div>
                <h2 id="ranking-tendencias-titulo">Tendencias</h2>
                <p className="descripcion-seccion ranking-tendencias-descripcion">
                    Los productos mejor ubicados en tus búsquedas de MercadoLibre, ordenados por puntaje. Cada variable va de 0 a 100:
                    puntaje = 0,4 × demanda + 0,3 × margen + 0,3 × (100 − competencia).
                </p>
            </div>

            {error && <Mensaje tipo="error">{error}</Mensaje>}

            {!filas ? (
                <div className="tablero-esqueleto ranking-tendencias-esqueleto" role="status" aria-label="Cargando el ranking" />
            ) : filas.length === 0 ? (
                !error && (
                    <p className="ranking-tendencias-vacio">
                        Aún no hay productos en el ranking. Se arma con las búsquedas por palabra clave de tus productos en MercadoLibre; la
                        primera captura llega en máximo 6 horas.
                    </p>
                )
            ) : (
                <div className="tablero-tabla-contenedor ranking-tendencias-contenedor">
                    <table className="tablero-tabla ranking-tendencias-tabla">
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Producto</th>
                                <th scope="col" className="es-numero">Precio en MercadoLibre</th>
                                <th scope="col" className="es-numero">Costo</th>
                                <th scope="col" className="es-numero">Demanda</th>
                                <th scope="col" className="es-numero">Margen</th>
                                <th scope="col" className="es-numero">Competencia</th>
                                <th scope="col" className="es-numero">Puntaje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((fila) => (
                                <tr key={fila.publicacionId ?? fila.titulo}>
                                    <td>{fila.posicion}</td>
                                    <th scope="row">
                                        {fila.titulo}
                                        <span className="ranking-tendencias-detalle">Búsqueda: {fila.palabraClave}</span>
                                    </th>
                                    <td className="es-numero">{pesos(fila.precioVenta)}</td>
                                    <td className="es-numero">{pesos(fila.costo)}</td>
                                    <td className="es-numero">
                                        {puntos(fila.demanda)}
                                        <span className="ranking-tendencias-detalle">Puesto {puntos(fila.posicionBusqueda)}</span>
                                    </td>
                                    <td className="es-numero">{puntos(fila.margen)}</td>
                                    <td className="es-numero">
                                        {puntos(fila.competencia)}
                                        <span className="ranking-tendencias-detalle">
                                            {fila.vendedores} {fila.vendedores === 1 ? 'vendedor' : 'vendedores'}
                                        </span>
                                    </td>
                                    <td className="es-numero ranking-tendencias-puntaje">{puntos(fila.puntaje)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}
