import client from '@core/api/client'

// GET /reportes?formato=xlsx|pdf&productoId=&desde=&hasta= → 200 archivo | 400 datos inválidos | 404 producto ajeno (SCRUM-50)
export async function descargarReporte({ formato, productoId, desde, hasta }) {
    try {
        const { data } = await client.get('/reportes', { params: { formato, productoId, desde, hasta }, responseType: 'blob' })
        return data
    } catch (error) {
        // Con responseType blob, el JSON del error también llega como archivo: se lee para poder mostrar su mensaje
        if (error.response?.data instanceof Blob) error.response.data = await leerError(error.response.data)
        throw error
    }
}

async function leerError(archivo) {
    try {
        return JSON.parse(await archivo.text())
    } catch {
        return null
    }
}
