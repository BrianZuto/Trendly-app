import * as Haptics from 'expo-haptics'
import * as SecureStore from 'expo-secure-store'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { ALERTA, PRODUCTO, USUARIO, simularApi, tokenQueVenceEn } from '../test/apiFalso'

const UNA_HORA = 3600000
const hoy = new Date()
const haceDias = (n) => new Date(hoy.getTime() - n * 86400000).toISOString()

const RUTAS = {
    'POST /auth/login': ({ data }) =>
        JSON.parse(data).password === 'Trendly123'
            ? { data: { token: tokenQueVenceEn(UNA_HORA) } }
            : { status: 401, data: { message: 'Credenciales inválidas' } },
    'GET /auth/me': { data: USUARIO },
    'GET /productos': { data: [PRODUCTO] },
    'GET /productos/7': { data: PRODUCTO },
    'GET /productos/7/sugerencia': {
        data: {
            productoId: 7,
            estado: 'CALCULADA',
            precioSugerido: 149900,
            margenResultante: 25.28,
            posicion: 'MAS_CARO',
            competitivo: true,
            minimoCompetencia: 151400,
            promedioCompetencia: 158000,
        },
    },
    'GET /productos/7/monitoreos': { data: [{ id: 11 }] },
    'GET /monitoreos/11/historico': {
        data: [
            { fechaCaptura: haceDias(2), precioCop: 165000, disponible: true },
            { fechaCaptura: haceDias(1), precioCop: 158000, disponible: true },
            { fechaCaptura: haceDias(0), precioCop: 151400, disponible: true },
        ],
    },
    'GET /alertas': ({ params }) => ({ data: params.estado === 'CERRADA' ? [] : [ALERTA] }),
    'POST /usuarios/me/dispositivos': { status: 204 },
    'DELETE /usuarios/me/dispositivos': { status: 204 },
    'GET /usuarios/me/reglas-alerta': { data: { umbralPct: 5, avisarDisponibilidad: true, recibirCorreos: true, recibirPush: true } },
}

async function abrirApp() {
    await renderRouter('./src/app', { initialUrl: '/' })
}

async function sesionGuardada(token) {
    await SecureStore.setItemAsync('trendly.token', token)
    await SecureStore.setItemAsync('trendly.usuario', JSON.stringify(USUARIO))
}

beforeEach(() => {
    SecureStore.__almacen.clear()
})

describe('inicio de sesión', () => {
    it('sin sesión muestra el login y entra con la misma cuenta de la web', async () => {
        const llamadas = simularApi(RUTAS)
        await abrirApp()

        expect(await screen.findByText('Entra con la misma cuenta de la web')).toBeOnTheScreen()
        await fireEvent.changeText(screen.getByLabelText('Correo'), 'vendedor@trendly.co')
        await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'Trendly123')
        await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }))

        expect(await screen.findByText('Smartwatch AMOLED')).toBeOnTheScreen()
        expect(screen).toHavePathname('/')
        // El token queda en SecureStore y viaja como Bearer en las rutas protegidas
        const token = await SecureStore.getItemAsync('trendly.token')
        expect(token).toBeTruthy()
        const productos = llamadas.find((l) => l.clave === 'GET /productos')
        expect(productos.config.headers.Authorization).toBe(`Bearer ${token}`)
        expect(llamadas.find((l) => l.clave === 'POST /auth/login').config.headers.Authorization).toBeUndefined()
    })

    it('muestra el error si la contraseña no es correcta y valida los campos', async () => {
        simularApi(RUTAS)
        await abrirApp()

        await fireEvent.press(await screen.findByRole('button', { name: 'Iniciar sesión' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Escribe un correo válido')
        // El error se acompaña de la vibración de error del sistema
        expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')

        await fireEvent.changeText(screen.getByLabelText('Correo'), 'vendedor@trendly.co')
        await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu contraseña')

        await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'otra')
        await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }))
        expect(await screen.findByText('Correo o contraseña incorrectos')).toBeOnTheScreen()
        expect(await SecureStore.getItemAsync('trendly.token')).toBeNull()
    })

    it('sin conexión con el servidor lo dice', async () => {
        simularApi({ 'POST /auth/login': () => Promise.reject(new Error('Network Error')) })
        await abrirApp()

        await fireEvent.changeText(await screen.findByLabelText('Correo'), 'vendedor@trendly.co')
        await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'Trendly123')
        await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }))

        expect(await screen.findByText('No se pudo conectar con el servidor. Revisa tu conexión.')).toBeOnTheScreen()
    })
})

describe('sesión guardada', () => {
    it('con un token vigente abre directo en Mis productos y Cerrar sesión (en Perfil) vuelve al login', async () => {
        simularApi(RUTAS)
        await sesionGuardada(tokenQueVenceEn(UNA_HORA))
        await abrirApp()

        expect(await screen.findByText('Smartwatch AMOLED')).toBeOnTheScreen()
        expect(screen.getByText('Hola, Juan')).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: /^Perfil/ }))
        // El plan llega como objeto desde /auth/me: se muestra su nombre
        expect(await screen.findByText(/Plan Gratuito/)).toBeOnTheScreen()
        await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar sesión' }))
        expect(await screen.findByText('Entra con la misma cuenta de la web')).toBeOnTheScreen()
        expect(await SecureStore.getItemAsync('trendly.token')).toBeNull()
    })

    it('con un token vencido vuelve al login y avisa', async () => {
        simularApi(RUTAS)
        await sesionGuardada(tokenQueVenceEn(-1000))
        await abrirApp()

        expect(await screen.findByText('Tu sesión venció. Vuelve a iniciar sesión.')).toBeOnTheScreen()
        expect(await SecureStore.getItemAsync('trendly.token')).toBeNull()
    })

    it('si el API responde 401 (token vencido en el servidor) vuelve al login', async () => {
        simularApi({ ...RUTAS, 'GET /productos': { status: 401 } })
        await sesionGuardada(tokenQueVenceEn(UNA_HORA))
        await abrirApp()

        expect(await screen.findByText('Tu sesión venció. Vuelve a iniciar sesión.')).toBeOnTheScreen()
        expect(await SecureStore.getItemAsync('trendly.token')).toBeNull()
    })

    it('cuando llega la hora de vencimiento del token cierra la sesión sola', async () => {
        jest.useFakeTimers()
        try {
            simularApi(RUTAS)
            await sesionGuardada(tokenQueVenceEn(5000))
            await abrirApp()
            expect(await screen.findByText('Smartwatch AMOLED')).toBeOnTheScreen()

            await act(async () => {
                jest.advanceTimersByTime(6000)
            })
            expect(await screen.findByText('Tu sesión venció. Vuelve a iniciar sesión.')).toBeOnTheScreen()
        } finally {
            jest.useRealTimers()
        }
    })
})

describe('productos, detalle y alertas', () => {
    beforeEach(async () => {
        await sesionGuardada(tokenQueVenceEn(UNA_HORA))
    })

    it('el detalle muestra la gráfica del histórico y el precio sugerido', async () => {
        simularApi(RUTAS)
        await abrirApp()

        await fireEvent.press(await screen.findByRole('button', { name: /Smartwatch AMOLED/ }))

        expect(await screen.findByText('$149.900')).toBeOnTheScreen()
        expect(screen).toHavePathname('/producto/7')
        expect(screen.getByText(/Margen resultante 25,28%/)).toHaveTextContent('Margen resultante 25,28% · Estás por encima de la competencia')
        expect(
            screen.getByLabelText('Precio más bajo de la competencia en los últimos 30 días: entre $151.400 y $165.000. Tu precio: $159.900.'),
        ).toBeOnTheScreen()
    })

    it('el detalle avisa cuando la sugerencia está pendiente o no hay competidores', async () => {
        simularApi({
            ...RUTAS,
            'GET /productos/7/sugerencia': { data: { productoId: 7, estado: 'PENDIENTE' } },
            'GET /productos/7/monitoreos': { data: [] },
        })
        await abrirApp()

        await fireEvent.press(await screen.findByRole('button', { name: /Smartwatch AMOLED/ }))

        expect(await screen.findByText(/Hacen falta al menos 2 capturas/)).toBeOnTheScreen()
        expect(screen.getByText(/no tiene competidores vigilados/)).toBeOnTheScreen()
    })

    it('la pestaña Alertas lista las alertas y se puede filtrar por estado', async () => {
        const llamadas = simularApi(RUTAS)
        await abrirApp()
        await screen.findByText('Smartwatch AMOLED')

        // La pestaña muestra cuántas alertas nuevas hay, como el menú de la web
        const pestana = await screen.findByLabelText(/^Alertas, 1 nuevas/)
        await fireEvent.press(pestana)

        expect(await screen.findByText('Bajó de precio')).toBeOnTheScreen()
        expect(screen.getByText('Alta')).toBeOnTheScreen()
        expect(screen.getByText('$165.000 → $151.400  (-8,24%)')).toBeOnTheScreen()
        expect(screen.getByText('Sugerido $149.900')).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: 'Cerradas' }))
        expect(Haptics.selectionAsync).toHaveBeenCalled()
        expect(await screen.findByText('No hay alertas con este filtro.')).toBeOnTheScreen()
        expect(llamadas.filter((l) => l.clave === 'GET /alertas').at(-1).config.params).toEqual({ estado: 'CERRADA' })
    })

    it('un error al cargar se puede reintentar', async () => {
        let intentos = 0
        simularApi({ ...RUTAS, 'GET /productos': () => (++intentos === 1 ? { status: 500 } : { data: [PRODUCTO] }) })
        await abrirApp()

        expect(await screen.findByText('Ocurrió un error en el servidor. Inténtalo más tarde.')).toBeOnTheScreen()
        await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
        expect(await screen.findByText('Smartwatch AMOLED')).toBeOnTheScreen()
    })
})
