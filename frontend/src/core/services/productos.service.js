import client from '@core/api/client'

// GET /productos → 200 [{ id, nombre, sku, costo, precioVenta, margenObjetivo, margenActual, imagen?, competencia? }]
// imagen y competencia son la propuesta para el backend; sin ellas la lista muestra "Sin datos"
export async function listarProductos() {
    const { data } = await client.get('/productos')
    return data
}

// POST /productos → 201 producto | 400 validación | 422 límite del plan
export async function crearProducto(producto) {
    const { data } = await client.post('/productos', producto)
    return data
}

// PUT /productos/:id → 200 producto
export async function actualizarProducto(id, producto) {
    const { data } = await client.put(`/productos/${id}`, producto)
    return data
}

// DELETE /productos/:id → 204
export async function eliminarProducto(id) {
    await client.delete(`/productos/${id}`)
}

// GET /productos/:id → 200 producto
export async function obtenerProducto(id) {
    const { data } = await client.get(`/productos/${id}`)
    return data
}

// PUT /productos/:id/imagen { imagen } → 200 producto (propuesta: la foto sale de una publicación vigilada)
export async function elegirImagen(id, imagen) {
    const { data } = await client.put(`/productos/${id}/imagen`, { imagen })
    return data
}
