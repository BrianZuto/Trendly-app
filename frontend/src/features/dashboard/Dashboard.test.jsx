import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@core/auth/AuthProvider'
import { guardarSesion, guardarToken } from '@core/auth/token'
import { iniciarSesion, obtenerPerfil } from '@core/services/auth.service'
import { listarMonitoreos, obtenerHistorico } from '@core/services/monitoreos.service'
import { listarProductos } from '@core/services/productos.service'
import Dashboard from './Dashboard'

// Recharts necesita medidas reales; aquí basta saber qué datos le llegan
vi.mock('./GraficaPrecios', () => ({
    default: ({ filas, series }) => <div data-testid="grafica" data-filas={filas.length} data-series={series.map((s) => s.clave).join(',')} />,
}))
vi.mock('@core/services/productos.service', () => ({ listarProductos: vi.fn() }))
vi.mock('@core/services/monitoreos.service', () => ({ listarMonitoreos: vi.fn(), obtenerHistorico: vi.fn() }))

const AHORA = Date.now()
const captura = (fuente, idPublicacion, diasAtras, precio, disponible = true) => ({
    fechaCaptura: new Date(AHORA - diasAtras * 86400000 - 60000).toISOString(),
    idPublicacion,
    vendedor: `Tienda ${idPublicacion}`,
    precio,
    moneda: 'COP',
    precioCop: precio,
    disponible,
    fuente,
})

const AUDIFONOS = { id: 1, nombre: 'Audífonos', sku: 'AUD-01', precioVenta: 66000 }

beforeEach(async () => {
    const { token } = await iniciarSesion({ email: 'vendedor@trendly.co', password: 'Trendly123' })
    guardarToken(token)
    guardarSesion(token, await obtenerPerfil())
    vi.mocked(listarProductos).mockResolvedValue([AUDIFONOS])
    vi.mocked(listarMonitoreos).mockResolvedValue([{ id: 10 }])
    vi.mocked(obtenerHistorico).mockResolvedValue([
        captura('MERCADOLIBRE', 'MCO1', 20, 70000),
        captura('MERCADOLIBRE', 'MCO1', 0, 60000),
        captura('FALABELLA', 'F1', 3, 72000),
    ])
})

function renderizar() {
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <AuthProvider>
                <Dashboard />
            </AuthProvider>
        </MemoryRouter>,
    )
}

const valorDe = (titulo) => within(screen.getByRole('heading', { name: titulo }).closest('article')).getByText((_, el) => el.classList.contains('tablero-valor'))

describe('tablero de precios', () => {
    it('las tarjetas muestran el mínimo, el promedio, mi precio y la diferencia', async () => {
        renderizar()
        expect(await screen.findByTestId('grafica', {}, { timeout: 5000 })).toBeInTheDocument()

        const vitrina = screen.getByRole('region', { name: 'Vitrina' })
        const controles = document.querySelector('.tablero-controles')
        expect(vitrina.compareDocumentPosition(controles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        await userEvent.setup().click(screen.getByRole('button', { name: 'Mostrar diapositiva 2 de 3' }))
        expect(screen.getByRole('group', { name: '2 de 3' })).toHaveTextContent('Tu precio está 10 % sobre la oferta más baja')

        expect(valorDe('Mínimo de la competencia')).toHaveTextContent('$60.000')
        expect(valorDe('Promedio de la competencia')).toHaveTextContent('$66.000')
        expect(valorDe('Mi precio')).toHaveTextContent('$66.000')
        expect(valorDe('Diferencia')).toHaveTextContent('+10,0 %')
        expect(screen.getByText('Sobre el más barato')).toBeInTheDocument()
        expect(screen.getByText(/Hoy 1 publicación vende más barato que tú/)).toBeInTheDocument()
    })

    it('cambiar el rango no vuelve a pedir datos', async () => {
        const user = userEvent.setup()
        renderizar()
        const grafica = await screen.findByTestId('grafica')
        const filas30 = Number(grafica.dataset.filas)
        expect(obtenerHistorico).toHaveBeenCalledTimes(1)

        await user.click(screen.getByRole('radio', { name: '7 días' }))

        expect(screen.getByRole('radio', { name: '7 días' })).toHaveAttribute('aria-checked', 'true')
        expect(Number(screen.getByTestId('grafica').dataset.filas)).toBeLessThan(filas30)
        expect(obtenerHistorico).toHaveBeenCalledTimes(1)
    })

    it('la leyenda oculta y vuelve a mostrar una línea', async () => {
        const user = userEvent.setup()
        renderizar()
        await screen.findByTestId('grafica')
        const boton = screen.getByRole('button', { name: /Falabella/ })

        await user.click(boton)
        expect(boton).toHaveAttribute('aria-pressed', 'false')
        await user.click(boton)
        expect(boton).toHaveAttribute('aria-pressed', 'true')
    })

    it('sin capturas muestra el aviso y mi precio igual', async () => {
        vi.mocked(obtenerHistorico).mockResolvedValue([])
        renderizar()

        expect(await screen.findByText('Aún no hay capturas; la primera llega en máximo 6 horas')).toBeInTheDocument()
        expect(valorDe('Mi precio')).toHaveTextContent('$66.000')
        expect(screen.queryByTestId('grafica')).not.toBeInTheDocument()
    })

    it('sin productos invita a agregar el primero', async () => {
        vi.mocked(listarProductos).mockResolvedValue([])
        renderizar()

        expect(await screen.findByText('Aún no tienes productos')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Agregar un producto' })).toHaveAttribute('href', '/productos/nuevo')
    })
})
