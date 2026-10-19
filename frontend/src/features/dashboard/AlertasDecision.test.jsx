import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AlertasDecision from './AlertasDecision'

const ALERTAS = [
    {
        id: 'alerta-1',
        productoId: 1,
        nombre: 'Audífonos inalámbricos',
        imagen: 'https://img.example/audifonos.jpg',
        motivo: 'SUPERADO',
        competidor: 'Prime Gadgets',
        precioCompetidor: 155800,
        cambioPct: -3,
        miPrecio: 159900,
        diferenciaPct: 2.6,
    },
    {
        id: 'alerta-2',
        productoId: 2,
        nombre: 'Parlante bluetooth',
        motivo: 'MARGEN',
        competidor: 'SonidoMax',
        precioCompetidor: 181000,
        cambioPct: -9.5,
        miPrecio: 199900,
        diferenciaPct: 10.4,
    },
    {
        id: 'alerta-3',
        productoId: 3,
        nombre: 'Reloj inteligente',
        motivo: 'SIN_STOCK',
        competidor: 'Proveedor',
    },
    {
        id: 'alerta-4',
        productoId: 4,
        nombre: 'Teclado mecánico',
        motivo: 'SUPERADO',
        competidor: 'TecnoShop',
        precioCompetidor: 99000,
        cambioPct: -4,
        miPrecio: 105000,
        diferenciaPct: 6.1,
    },
]

function Ubicacion() {
    const location = useLocation()
    return <output aria-label="Ruta actual">{location.pathname}</output>
}

function renderizar(props = {}) {
    return render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <AlertasDecision {...props} />
            <Ubicacion />
        </MemoryRouter>,
    )
}

describe('AlertasDecision', () => {
    it('muestra alertas compactas con el cambio y las cifras formateadas', () => {
        renderizar({ alertas: ALERTAS })

        expect(screen.getByRole('heading', { name: 'Necesitan tu decisión' })).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
        expect(screen.getByText('4 productos requieren atención')).toBeInTheDocument()
        expect(screen.getByText('Te superaron en precio')).toBeInTheDocument()
        expect(screen.getByText('Margen bajo el objetivo')).toBeInTheDocument()
        expect(screen.getByText('Sin stock del proveedor')).toBeInTheDocument()
        expect(screen.getByText(/Prime Gadgets bajó a/)).toBeInTheDocument()
        expect(screen.getByText('$155.800')).toBeInTheDocument()
        expect(screen.getByText('−3 %')).toBeInTheDocument()
        expect(screen.getByText('+2,6 %')).toBeInTheDocument()
        expect(screen.queryByText('Teclado mecánico')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Ver las 4 alertas' })).toBeInTheDocument()
    })

    it('abre el producto al activar Revisar precio', async () => {
        const user = userEvent.setup()
        renderizar({ alertas: ALERTAS })

        await user.click(screen.getByRole('button', { name: 'Revisar precio de Audífonos inalámbricos' }))

        expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/productos/1')
    })

    it('muestra el estado vacío sin acción', () => {
        renderizar({ alertas: [] })

        expect(screen.getByText('Todo en orden')).toBeInTheDocument()
        expect(screen.getByText('Te avisaremos cuando un competidor cambie algo importante')).toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('muestra esqueletos mientras carga y ofrece reintento al fallar', async () => {
        const onReintentar = vi.fn()
        const user = userEvent.setup()
        const { rerender } = render(
            <MemoryRouter>
                <AlertasDecision cargando />
            </MemoryRouter>,
        )
        expect(screen.getAllByLabelText('Cargando alertas')).toHaveLength(1)

        rerender(
            <MemoryRouter>
                <AlertasDecision error onReintentar={onReintentar} />
            </MemoryRouter>,
        )
        expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar las alertas')
        await user.click(screen.getByRole('button', { name: 'Reintentar' }))
        expect(onReintentar).toHaveBeenCalledOnce()
    })
})
