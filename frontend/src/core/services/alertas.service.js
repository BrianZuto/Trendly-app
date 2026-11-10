import client from '@core/api/client'

// Evento para que el contador del menú se actualice después de abrir o decidir una alerta
export const EVENTO_ALERTAS = 'trendly:alertas'
export const avisarCambioDeAlertas = () => window.dispatchEvent(new Event(EVENTO_ALERTAS))

// GET /alertas?estado=NUEVA|LEIDA|CERRADA&relevancia=NORMAL|ALTA → 200 [{ id, tipo, relevancia, estado, creadoEn,
//   monitoreoId, publicacionId, productoId, productoNombre, precioVentaActual, margenActual, margenObjetivo,
//   competidor, tituloPublicacion, precioAnterior, precioNuevo, variacionPct, precioSugerido, margenSugerido,
//   decision: null | { accion, precioAnterior, precioFinal, motivo, decididoEn } }] (SCRUM-49)
export async function listarAlertas({ estado, relevancia } = {}) {
    const { data } = await client.get('/alertas', { params: { estado: estado || undefined, relevancia: relevancia || undefined } })
    return data
}

// PATCH /alertas/:id/leida → 200 con la alerta (una NUEVA pasa a LEIDA)
export async function marcarAlertaLeida(id) {
    const { data } = await client.patch(`/alertas/${id}/leida`)
    return data
}

// PATCH /alertas/:id/decision { accion: 'ACEPTAR' | 'AJUSTAR' | 'DESCARTAR', precioFinal?, motivo? } → 200
//   | 400 sin sugerido, sin precio o sin motivo | 409 ya decidida
export async function decidirAlerta(id, decision) {
    const { data } = await client.patch(`/alertas/${id}/decision`, decision)
    return data
}

// GET /usuarios/me/reglas-alerta → 200 { umbralPct, avisarDisponibilidad, recibirCorreos, recibirPush } (SCRUM-47, SCRUM-48)
export async function obtenerReglasAlerta() {
    const { data } = await client.get('/usuarios/me/reglas-alerta')
    return data
}

// PUT /usuarios/me/reglas-alerta { umbralPct, avisarDisponibilidad, recibirCorreos } → 200 | 400 umbral fuera de 0,01–100.
// recibirPush no se manda: lo maneja la app móvil y el backend conserva su valor
export async function guardarReglasAlerta({ umbralPct, avisarDisponibilidad, recibirCorreos }) {
    const { data } = await client.put('/usuarios/me/reglas-alerta', { umbralPct, avisarDisponibilidad, recibirCorreos })
    return data
}
