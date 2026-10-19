import { useEffect, useState } from 'react'
import { mensajeDeError } from '@core/api/errores'
import { listarMonitoreos } from '@core/services/monitoreos.service'
import { generarAlertasAccionables } from '@features/producto-detalle/alertasAccionables'
import AlertasDecision from './AlertasDecision'

function adaptarAlertas(productos, monitoreosPorProducto) {
    return productos.flatMap((producto) => {
        const monitoreos = monitoreosPorProducto.get(producto.id) ?? []
        const publicaciones = monitoreos.flatMap((monitoreo) => monitoreo.publicaciones ?? [])
        const disponibles = publicaciones.filter((publicacion) => publicacion.disponible && Number(publicacion.precio) > 0)
        const { alertas } = generarAlertasAccionables(producto, monitoreos)
        const cambiosDePrecio = alertas
            .filter((alerta) => alerta.tipo === 'DESPLAZAMIENTO' || alerta.tipo === 'BAJADA_COMPETIDOR')
            .sort((a, b) => {
                const prioridad = (alerta) => (alerta.accion?.viable ? 0 : 1)
                return prioridad(a) - prioridad(b) || Math.abs(b.porcentajeCambio) - Math.abs(a.porcentajeCambio)
            })

        const alerta = cambiosDePrecio[0]
        if (alerta) {
            const idPublicacion = alerta.id.replace(/^(desplazamiento|bajada)-/, '')
            const publicacion = publicaciones.find((item) => String(item.idPublicacion) === idPublicacion)
            const precioMasBajo = Math.min(...disponibles.map((item) => Number(item.precio)))
            const diferenciaPct = precioMasBajo > 0
                ? ((Number(producto.precioVenta) - precioMasBajo) / precioMasBajo) * 100
                : 0

            return [{
                id: `${producto.id}-${alerta.id}`,
                productoId: producto.id,
                nombre: producto.nombre,
                imagen: producto.imagen ?? producto.proveedor?.imagen ?? publicacion?.imagen,
                motivo: alerta.accion?.viable ? 'SUPERADO' : 'MARGEN',
                competidor: alerta.competidor,
                precioCompetidor: alerta.precioActual,
                cambioPct: alerta.porcentajeCambio,
                miPrecio: producto.precioVenta,
                diferenciaPct,
            }]
        }

        if (publicaciones.length > 0 && disponibles.length === 0) {
            const sinStock = publicaciones[0]
            return [{
                id: `${producto.id}-sin-stock`,
                productoId: producto.id,
                nombre: producto.nombre,
                imagen: producto.imagen ?? producto.proveedor?.imagen ?? sinStock.imagen,
                motivo: 'SIN_STOCK',
                competidor: sinStock.vendedor || 'El proveedor',
            }]
        }

        return []
    })
}

export default function DecisionesPendientes({ productos }) {
    const [resultado, setResultado] = useState({ productos: null, alertas: [], error: '' })
    const [intento, setIntento] = useState(0)

    useEffect(() => {
        let vigente = true
        Promise.all(productos.map(async (producto) => [producto.id, await listarMonitoreos(producto.id)]))
            .then((entradas) => {
                if (vigente) {
                    setResultado({
                        productos,
                        alertas: adaptarAlertas(productos, new Map(entradas)),
                        error: '',
                    })
                }
            })
            .catch((fallo) => {
                if (vigente) setResultado({ productos, alertas: [], error: mensajeDeError(fallo) })
            })

        return () => {
            vigente = false
        }
    }, [intento, productos])

    const cargando = resultado.productos !== productos
    const error = !cargando && Boolean(resultado.error)

    return (
        <AlertasDecision
            alertas={cargando || error ? [] : resultado.alertas}
            cargando={cargando}
            error={error}
            onReintentar={() => setIntento((actual) => actual + 1)}
        />
    )
}
