import client from '@core/api/client'

// GET /tendencias?top=20 → 200 [{ posicion, titulo, publicacionId, productoId, palabraClave, precioVenta, costo,
//   vendedores, posicionBusqueda, demanda, margen, competencia, puntaje }], del puntaje más alto al más bajo (SCRUM-53).
// demanda, margen y competencia van de 0 a 100; puntaje = 0,4 × demanda + 0,3 × margen + 0,3 × (100 − competencia)
export async function listarTendencias(top = 20) {
    const { data } = await client.get('/tendencias', { params: { top } })
    return data
}
