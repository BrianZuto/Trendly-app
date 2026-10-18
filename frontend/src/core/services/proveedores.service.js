import client from '@core/api/client'

// Propuesta para el backend. GET /proveedores/ofertas?q=texto|url de AliExpress → 200 [{ idPublicacion, url,
//   titulo, tienda, precioUsd, envioUsd, diasMin, diasMax, calificacion, ventas, resenas, imagen, posicion }]
// 400 consulta corta, URL de otro sitio o sin identificador
export async function buscarOfertas(consulta) {
    const { data } = await client.get('/proveedores/ofertas', { params: { q: consulta.trim() } })
    return data
}
