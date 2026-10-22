import { app } from '@azure/functions'
import { dispararRecoleccion } from '../disparar.js'

// SCRUM-39: cada 6 horas (00:00, 06:00, 12:00 y 18:00 UTC) se le pide al backend que capture los monitoreos
// vencidos. El backend responde de inmediato y procesa en segundo plano; si ya hay un ciclo en curso, lo ignora.
app.timer('recoleccion', {
    schedule: '0 0 */6 * * *',
    handler: async (timer, context) => {
        if (timer.isPastDue) {
            context.warn('La ejecución llegó tarde (la Function estuvo detenida); se dispara de todas formas')
        }
        const { status, cuerpo } = await dispararRecoleccion({
            backendUrl: process.env.BACKEND_URL,
            apiKey: process.env.RECOLECCION_API_KEY,
        })
        context.log(`Recolección disparada: HTTP ${status} ${cuerpo}`)
    },
})
