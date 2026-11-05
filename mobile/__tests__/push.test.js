import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library'
import { ALERTA, PRODUCTO, USUARIO, simularApi, tokenQueVenceEn } from '../test/apiFalso'

const UNA_HORA = 3600000
const TOKEN_PUSH = 'ExponentPushToken[prueba]'
const REGLAS = { umbralPct: 5, avisarDisponibilidad: true, recibirCorreos: true, recibirPush: true }

const RUTAS = {
    'POST /auth/login': { data: { token: tokenQueVenceEn(UNA_HORA) } },
    'GET /auth/me': { data: USUARIO },
    'GET /productos': { data: [PRODUCTO] },
    'GET /alertas': { data: [ALERTA] },
    'GET /alertas/3': { data: { ...ALERTA, precioVentaActual: 159900, margenActual: 29.96, margenObjetivo: 20, margenSugerido: 25.28 } },
    'PATCH /alertas/3/leida': { data: { ...ALERTA, estado: 'LEIDA', precioVentaActual: 159900, margenActual: 29.96, margenObjetivo: 20, margenSugerido: 25.28 } },
    'POST /usuarios/me/dispositivos': { status: 204 },
    'DELETE /usuarios/me/dispositivos': { status: 204 },
    'GET /usuarios/me/reglas-alerta': { data: REGLAS },
    'PUT /usuarios/me/reglas-alerta': ({ data }) => ({ data: JSON.parse(data) }),
}

const llamadasA = (llamadas, clave) => llamadas.filter((l) => l.clave === clave)

async function conSesion() {
    await SecureStore.setItemAsync('trendly.token', tokenQueVenceEn(UNA_HORA))
    await SecureStore.setItemAsync('trendly.usuario', JSON.stringify(USUARIO))
}

async function iniciarSesion() {
    await fireEvent.changeText(await screen.findByLabelText('Correo'), 'vendedor@trendly.co')
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'Trendly123')
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

beforeEach(() => {
    SecureStore.__almacen.clear()
    jest.clearAllMocks()
})

describe('registro del celular', () => {
    it('al iniciar sesión pide permiso y registra el celular con su token de Expo Push', async () => {
        const llamadas = simularApi(RUTAS)
        Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' })
        await renderRouter('./src/app', { initialUrl: '/' })

        await iniciarSesion()

        await waitFor(() => expect(llamadasA(llamadas, 'POST /usuarios/me/dispositivos')).toHaveLength(1))
        expect(Notifications.requestPermissionsAsync).toHaveBeenCalled()
        // En la app el projectId sale de app.json (extra.eas.projectId); Jest no carga app.json
        expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: undefined })
        expect(JSON.parse(llamadasA(llamadas, 'POST /usuarios/me/dispositivos')[0].config.data)).toEqual({
            token: TOKEN_PUSH,
            plataforma: 'IOS',
        })
    })

    it('si el vendedor niega el permiso no se registra nada y la app sigue funcionando', async () => {
        const llamadas = simularApi(RUTAS)
        Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' })
        Notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' })
        await renderRouter('./src/app', { initialUrl: '/' })

        await iniciarSesion()

        expect(await screen.findByText('Smartwatch AMOLED')).toBeOnTheScreen()
        expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled()
        expect(llamadasA(llamadas, 'POST /usuarios/me/dispositivos')).toHaveLength(0)
    })

    it('cerrar sesión quita el celular del servidor para que no le lleguen las alertas de esa cuenta', async () => {
        const llamadas = simularApi(RUTAS)
        await conSesion()
        await renderRouter('./src/app', { initialUrl: '/' })
        await waitFor(() => expect(llamadasA(llamadas, 'POST /usuarios/me/dispositivos')).toHaveLength(1))

        await fireEvent.press(await screen.findByRole('button', { name: /^Perfil/ }))
        await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar sesión' }))

        expect(await screen.findByText('Entra con la misma cuenta de la web')).toBeOnTheScreen()
        const quitar = llamadasA(llamadas, 'DELETE /usuarios/me/dispositivos')
        expect(quitar).toHaveLength(1)
        expect(quitar[0].config.params).toEqual({ token: TOKEN_PUSH })
        expect(quitar[0].config.headers.Authorization).toMatch(/^Bearer /)
    })
})

describe('tocar la notificación', () => {
    it('abre la alerta correcta y la marca como leída', async () => {
        const llamadas = simularApi(RUTAS)
        await conSesion()
        await renderRouter('./src/app', { initialUrl: '/' })
        await screen.findByText('Smartwatch AMOLED')

        await act(async () => {
            Notifications.__tocar('/alerta/3')
        })

        expect(await screen.findByText('Bajó de precio')).toBeOnTheScreen()
        expect(screen).toHavePathname('/alerta/3')
        expect(screen.getByText('Tienda Sonido')).toBeOnTheScreen()
        expect(screen.getByText('$149.900')).toBeOnTheScreen()
        expect(screen.getByText('Margen 25,28% · objetivo 20%')).toBeOnTheScreen()
        expect(llamadasA(llamadas, 'PATCH /alertas/3/leida')).toHaveLength(1)
        expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled()

        await fireEvent.press(screen.getByRole('button', { name: 'Ver producto' }))
        expect(screen).toHavePathname('/producto/7')
    })

    it('si la notificación abrió la app sin sesión, la alerta se abre después de iniciar sesión', async () => {
        simularApi(RUTAS)
        Notifications.getLastNotificationResponseAsync.mockResolvedValueOnce(Notifications.__respuesta('/alerta/3'))
        await renderRouter('./src/app', { initialUrl: '/' })

        await iniciarSesion()

        expect(await screen.findByText('Bajó de precio')).toBeOnTheScreen()
        expect(screen).toHavePathname('/alerta/3')
    })

    it('ignora notificaciones que no son de alertas', async () => {
        simularApi(RUTAS)
        await conSesion()
        await renderRouter('./src/app', { initialUrl: '/' })
        await screen.findByText('Smartwatch AMOLED')

        await act(async () => {
            Notifications.__tocar('https://sitio-externo.co')
        })

        expect(screen).toHavePathname('/')
    })

    it('en la pestaña Alertas, tocar una alerta también abre su detalle', async () => {
        simularApi(RUTAS)
        await conSesion()
        await renderRouter('./src/app', { initialUrl: '/alertas' })

        await fireEvent.press(await screen.findByRole('button', { name: /Bajó de precio/ }))

        expect(await screen.findByText('Tienda Sonido')).toBeOnTheScreen()
        expect(screen).toHavePathname('/alerta/3')
    })
})

describe('preferencia en el perfil', () => {
    it('el vendedor puede desactivar las notificaciones push', async () => {
        const llamadas = simularApi(RUTAS)
        await conSesion()
        await renderRouter('./src/app', { initialUrl: '/perfil' })

        const interruptor = await screen.findByLabelText('Notificaciones push')
        expect(interruptor).toHaveProp('value', true)
        await fireEvent(interruptor, 'valueChange', false)

        await waitFor(() => expect(llamadasA(llamadas, 'PUT /usuarios/me/reglas-alerta')).toHaveLength(1))
        expect(JSON.parse(llamadasA(llamadas, 'PUT /usuarios/me/reglas-alerta')[0].config.data)).toEqual({ ...REGLAS, recibirPush: false })
        await waitFor(() => expect(screen.getByLabelText('Notificaciones push')).toHaveProp('value', false))
    })

    it('si no se pudo guardar, el interruptor vuelve a como estaba y lo dice', async () => {
        simularApi({ ...RUTAS, 'PUT /usuarios/me/reglas-alerta': { status: 500 } })
        await conSesion()
        await renderRouter('./src/app', { initialUrl: '/perfil' })

        await fireEvent(await screen.findByLabelText('Notificaciones push'), 'valueChange', false)

        expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error en el servidor. Inténtalo más tarde.')
        expect(screen.getByLabelText('Notificaciones push')).toHaveProp('value', true)
    })

    it('si el celular no tiene permiso, ofrece abrir los Ajustes', async () => {
        simularApi(RUTAS)
        Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' })
        Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' })
        await conSesion()
        await renderRouter('./src/app', { initialUrl: '/perfil' })

        expect(await screen.findByRole('button', { name: 'Abrir Ajustes' })).toBeOnTheScreen()
        Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' })
        Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' })
    })
})
