import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@core/auth/AuthProvider'
import { guardarSesion, guardarToken } from '@core/auth/token'
import MainLayout from '@core/layout/MainLayout'
import { sembrarAlerta, sembrarProductos } from '@core/mocks/mockAdapter'
import { iniciarSesion, obtenerPerfil } from '@core/services/auth.service'
import { obtenerReglasAlerta } from '@core/services/alertas.service'
import { obtenerProducto } from '@core/services/productos.service'
import Alertas from './Alertas'

const EMAIL = 'vendedor@trendly.co'
let conSugerido
let sinSugerido

beforeEach(async () => {
    const { token } = await iniciarSesion({ email: EMAIL, password: 'Trendly123' })
    guardarToken(token)
    guardarSesion(token, await obtenerPerfil())
    sembrarProductos(EMAIL, [{ nombre: 'Smartwatch AMOLED', sku: 'SW-1', costo: 112000, precioVenta: 159900, margenObjetivo: 20 }])
    conSugerido = sembrarAlerta(EMAIL, {
        competidor: 'Tienda Sonido',
        precioAnterior: 165000,
        precioNuevo: 151400,
        variacionPct: -8.24,
        precioSugerido: 149900,
        creadoEn: '2026-11-01T15:00:00Z',
    })
    sinSugerido = sembrarAlerta(EMAIL, {
        competidor: 'Gadgets Col',
        relevancia: 'ALTA',
        tipo: 'SUBIDA_PRECIO',
        precioAnterior: 150000,
        precioNuevo: 180000,
        variacionPct: 20,
        creadoEn: '2026-11-03T15:00:00Z',
    })
})

async function renderizar(url = '/alertas') {
    render(
        <MemoryRouter initialEntries={[url]}>
            <AuthProvider>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/alertas" element={<Alertas />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </MemoryRouter>,
    )
    await waitForElementToBeRemoved(() => screen.queryByText('Cargando alertas…'))
}

const filas = () => within(screen.getByRole('list', { name: 'Alertas' })).getAllByRole('button')

async function abrirAlerta(user, competidor) {
    await user.click(filas().find((fila) => fila.textContent.includes(competidor)))
    return screen.getByRole('article')
}

describe('bandeja de alertas', () => {
    it('muestra las alertas, la más reciente primero, y el contador de nuevas en el menú', async () => {
        await renderizar()

        expect(filas()).toHaveLength(2)
        expect(filas()[0]).toHaveTextContent('Subió de precio')
        expect(filas()[0]).toHaveTextContent('Alta')
        expect(filas()[1]).toHaveTextContent('Bajó de precio')
        expect(await screen.findByRole('link', { name: 'Alertas, 2 nuevas' })).toBeInTheDocument()
    })

    it('filtra por estado y por relevancia', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.selectOptions(screen.getByLabelText('Relevancia'), 'ALTA')
        await waitFor(() => expect(filas()).toHaveLength(1))
        expect(filas()[0]).toHaveTextContent('Gadgets Col')

        await user.selectOptions(screen.getByLabelText('Relevancia'), '')
        await user.click(screen.getByRole('button', { name: 'Cerradas' }))
        expect(await screen.findByText('No hay alertas con estos filtros.')).toBeInTheDocument()
    })

    it('abrir una alerta nueva la marca como leída y baja el contador', async () => {
        const user = userEvent.setup()
        await renderizar()
        await screen.findByRole('link', { name: 'Alertas, 2 nuevas' })

        const detalle = await abrirAlerta(user, 'Tienda Sonido')

        expect(within(detalle).getByRole('heading', { name: 'Smartwatch AMOLED' })).toBeInTheDocument()
        expect(within(detalle).getByText(/149\.900/)).toBeInTheDocument()
        expect(within(detalle).getByText(/Margen 25,28%/)).toBeInTheDocument()
        // Explica por qué sugiere bajar si el margen ya supera el objetivo (hallazgo del piloto SUS)
        expect(within(detalle).getByText(/Bajar es opcional: con este precio tu margen seguiría en 25,28%, por encima de tu objetivo/)).toBeInTheDocument()
        expect(await screen.findByRole('link', { name: 'Alertas, 1 nuevas' })).toBeInTheDocument()
    })

    it('aceptar el sugerido cambia el precio del producto y cierra la alerta', async () => {
        const user = userEvent.setup()
        await renderizar()
        const detalle = await abrirAlerta(user, 'Tienda Sonido')

        await user.click(within(detalle).getByRole('button', { name: 'Aceptar sugerido' }))

        const decision = await within(detalle).findByRole('status')
        expect(decision).toHaveTextContent('Aceptaste el precio sugerido')
        expect(decision).toHaveTextContent(/159\.900.*149\.900/)
        expect((await obtenerProducto(1)).precioVenta).toBe(149900)
        expect(filas()[1]).toHaveTextContent('Cerrada')
    })

    it('sin precio sugerido no se puede aceptar, pero sí ajustar a mano', async () => {
        const user = userEvent.setup()
        await renderizar()
        const detalle = await abrirAlerta(user, 'Gadgets Col')

        expect(within(detalle).getByRole('button', { name: 'Aceptar sugerido' })).toBeDisabled()
        await user.click(within(detalle).getByRole('button', { name: 'Ajustar precio' }))
        const campo = within(detalle).getByLabelText('Precio final')
        await user.clear(campo)
        await user.type(campo, '174900')
        expect(campo).toHaveValue('174.900')
        await user.click(within(detalle).getByRole('button', { name: 'Guardar precio' }))

        expect(await within(detalle).findByRole('status')).toHaveTextContent('Ajustaste el precio')
        expect((await obtenerProducto(1)).precioVenta).toBe(174900)
    })

    it('descartar pide un motivo y deja el precio igual', async () => {
        const user = userEvent.setup()
        await renderizar()
        const detalle = await abrirAlerta(user, 'Tienda Sonido')

        await user.click(within(detalle).getByRole('button', { name: 'Descartar' }))
        await user.click(within(detalle).getByRole('button', { name: 'Descartar alerta' }))
        expect(within(detalle).getByRole('alert')).toHaveTextContent('Escribe el motivo para descartar la alerta')

        await user.type(within(detalle).getByLabelText('Motivo'), 'Es una oferta relámpago')
        await user.click(within(detalle).getByRole('button', { name: 'Descartar alerta' }))

        const decision = await within(detalle).findByRole('status')
        expect(decision).toHaveTextContent('Descartaste la alerta')
        expect(decision).toHaveTextContent('Motivo: Es una oferta relámpago')
        expect((await obtenerProducto(1)).precioVenta).toBe(159900)
        expect(conSugerido).not.toBe(sinSugerido)
    })
})

describe('preferencias de aviso', () => {
    it('el vendedor desactiva los correos de alertas y queda guardado', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Preferencias de aviso' }))
        const dialogo = await screen.findByRole('dialog', { name: 'Preferencias de aviso' })
        const correos = await within(dialogo).findByRole('switch', { name: 'Alertas por correo' })
        expect(correos).toBeChecked()
        await user.click(correos)
        await user.click(within(dialogo).getByRole('button', { name: 'Guardar preferencias' }))

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect(screen.getByRole('status')).toHaveTextContent('Ya no te enviaremos correos de alertas')
        expect(await obtenerReglasAlerta()).toMatchObject({ recibirCorreos: false, umbralPct: 5, avisarDisponibilidad: true })
    })

    it('cambia el umbral y rechaza uno fuera de rango sin guardar', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Preferencias de aviso' }))
        const umbral = await screen.findByLabelText('Umbral de cambio')
        await user.clear(umbral)
        await user.type(umbral, '150')
        await user.click(screen.getByRole('button', { name: 'Guardar preferencias' }))
        expect(screen.getByRole('alert')).toHaveTextContent('El umbral debe estar entre 0,01 y 100')
        expect((await obtenerReglasAlerta()).umbralPct).toBe(5)

        await user.clear(umbral)
        await user.type(umbral, '7,5')
        await user.click(screen.getByRole('button', { name: 'Guardar preferencias' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect((await obtenerReglasAlerta()).umbralPct).toBe(7.5)
    })

    it('el enlace del correo abre las preferencias y Cancelar las cierra sin cambiar nada', async () => {
        const user = userEvent.setup()
        await renderizar('/alertas?preferencias=1')

        const dialogo = await screen.findByRole('dialog', { name: 'Preferencias de aviso' })
        await user.click(await within(dialogo).findByRole('switch', { name: 'Avisos de disponibilidad' }))
        await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect((await obtenerReglasAlerta()).avisarDisponibilidad).toBe(true)
    })
})
