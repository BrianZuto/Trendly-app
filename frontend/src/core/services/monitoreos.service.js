import client from '@core/api/client'

// GET /productos/:id/monitoreos → 200 [{ id, tipo, valor, marketplace, topN, frecuenciaHoras, estado,
//   ultimaCaptura, proximaEjecucion, publicaciones: [{ idPublicacion, titulo, vendedor, posicion,
//   precio, precioUsd, disponible, imagen, historial: [{ fecha, precio }] }] }]
export async function listarMonitoreos(productoId) {
    const { data } = await client.get(`/productos/${productoId}/monitoreos`)
    return data
}

// POST /productos/:id/monitoreos → 201 | 400 marketplace no soportado | 409 repetido | 422 cupo del plan
// Por URL: { tipo: 'URL', valor }. Por palabra clave: { tipo: 'PALABRA_CLAVE', valor, marketplace, topN }
export async function crearMonitoreo(productoId, monitoreo) {
    const { data } = await client.post(`/productos/${productoId}/monitoreos`, { frecuenciaHoras: 6, ...monitoreo })
    return data
}

// PATCH /monitoreos/:id { estado: 'ACTIVO' | 'PAUSADO' } → 200
export async function cambiarEstadoMonitoreo(id, estado) {
    const { data } = await client.patch(`/monitoreos/${id}`, { estado })
    return data
}

// DELETE /monitoreos/:id → 204
export async function eliminarMonitoreo(id) {
    await client.delete(`/monitoreos/${id}`)
}

// GET /monitoreos/:id/historico?desde=&hasta= → 200 [{ fechaCaptura, idPublicacion, vendedor, precio,
//   moneda, precioCop, disponible, fuente }] ordenado por fecha (SCRUM-42)
export async function obtenerHistorico(id, { desde, hasta } = {}) {
    const { data } = await client.get(`/monitoreos/${id}/historico`, { params: { desde, hasta } })
    return data
}
