import client from '@/core/api/client'

// POST /auth/login → 200 { token }
export async function iniciarSesion({ email, password }) {
    const { data } = await client.post('/auth/login', { email, password })
    return data
}

// GET /auth/me → 200 { id, nombre, email, rol, plan }
export async function obtenerPerfil() {
    const { data } = await client.get('/auth/me')
    return data
}

// GET /productos → 200 [{ id, nombre, sku, costo, precioVenta, margenObjetivo, margenActual, imagen? }]
export async function listarProductos() {
    const { data } = await client.get('/productos')
    return data
}

// GET /productos/:id → 200 producto
export async function obtenerProducto(id) {
    const { data } = await client.get(`/productos/${id}`)
    return data
}

// GET /productos/:id/sugerencia → 200 { estado: CALCULADA | PENDIENTE, precioSugerido, margenResultante, posicion,
//   competitivo, minimoCompetencia, promedioCompetencia, ... } (SCRUM-46)
export async function obtenerSugerencia(id) {
    const { data } = await client.get(`/productos/${id}/sugerencia`)
    return data
}

// GET /productos/:id/monitoreos → 200 [{ id, tipo, valor, marketplace, estado, ... }]
export async function listarMonitoreos(productoId) {
    const { data } = await client.get(`/productos/${productoId}/monitoreos`)
    return data
}

// GET /monitoreos/:id/historico?desde= → 200 [{ fechaCaptura, idPublicacion, vendedor, precioCop, disponible }] (SCRUM-42)
export async function obtenerHistorico(id, { desde } = {}) {
    const { data } = await client.get(`/monitoreos/${id}/historico`, { params: { desde } })
    return data
}

// GET /alertas?estado=NUEVA|LEIDA|CERRADA → 200 [{ id, tipo, relevancia, estado, creadoEn, productoId,
//   productoNombre, competidor, precioAnterior, precioNuevo, variacionPct, precioSugerido, decision }] (SCRUM-49)
export async function listarAlertas({ estado } = {}) {
    const { data } = await client.get('/alertas', { params: { estado: estado || undefined } })
    return data
}
