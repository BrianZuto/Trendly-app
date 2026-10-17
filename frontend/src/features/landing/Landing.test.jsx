import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Landing from './Landing'

function renderizarLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  )
}

describe('landing', () => {
  it('explica cómo funciona el monitoreo programado', () => {
    renderizarLanding()

    expect(screen.getByRole('heading', { name: /registra tu producto/i })).toBeInTheDocument()
    expect(screen.getByText('La recolección programada consulta competidores cada 6 horas')).toBeInTheDocument()
    expect(screen.getByText(/Consulta el precio y margen sugeridos, y las alertas generadas tras cada recolección/)).toBeInTheDocument()
  })

  it('muestra los planes documentados sin inventar precios ni funciones', () => {
    renderizarLanding()

    expect(screen.getByRole('heading', { name: 'Gratuito' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
    expect(screen.getByText('Hasta 10 productos registrados')).toBeInTheDocument()
    expect(screen.getByText('Hasta 100 productos registrados')).toBeInTheDocument()
    expect(screen.getByText('Precio por anunciar')).toBeInTheDocument()
    expect(screen.queryByText(/COP\s*\/\s*mes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/inteligencia artificial|tiempo real|historial de 15 días|historial de 6 meses|más popular/i)).not.toBeInTheDocument()
  })

  it('muestra un producto de ejemplo y calcula la sugerencia desde costo y margen objetivo', () => {
    renderizarLanding()

    const tablero = screen.getByRole('article', { name: 'Vista de ejemplo de comparación de precios' })
    expect(within(tablero).getByText('Ejemplo')).toBeInTheDocument()
    expect(within(tablero).getByRole('heading', { name: 'Audífonos Bluetooth' })).toBeInTheDocument()
    expect(within(tablero).getByRole('rowheader', { name: /costo/i })).toBeInTheDocument()
    expect(within(tablero).getByText(/121[.,]429/)).toBeInTheDocument()
    expect(within(tablero).getByText(/119[.,]900/)).toBeInTheDocument()
    expect(within(tablero).getByText(/20[.,]000 menos/)).toBeInTheDocument()
    expect(within(tablero).getByText('Para alcanzar tu objetivo')).toBeInTheDocument()
    expect(within(tablero).getByText(/29[.,]1%/)).toBeInTheDocument()
    expect(document.querySelector('img[src*="unsplash"]')).toBeNull()
  })

  it('el registro rápido lleva el email al formulario de registro', async () => {
    const user = userEvent.setup()
    let estado
    function Registro() {
      estado = useLocation().state
      return <h1>Registro</h1>
    }
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/registro" element={<Registro />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Tu email'), '  ana@correo.com ')
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))

    expect(await screen.findByRole('heading', { name: 'Registro' })).toBeInTheDocument()
    expect(estado).toEqual({ email: 'ana@correo.com' })
  })

  it('usa enlaces funcionales y conserva navegación pública en el encabezado', () => {
    renderizarLanding()

    expect(screen.getByRole('link', { name: 'Planes' })).toHaveAttribute('href', '#planes')
    expect(screen.getByRole('link', { name: 'Política de datos' })).toHaveAttribute('href', '/politica-datos')
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveClass('btn-outline')
    expect(screen.getByRole('link', { name: 'Empezar gratis' })).toHaveAttribute('href', '/registro')
    expect(screen.getByRole('link', { name: 'Crear cuenta gratis' })).toHaveAttribute('href', '/registro')

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Política de tratamiento de datos' })).toHaveAttribute('href', '/politica-datos')
    expect(footer.querySelector('a[href="#"]')).toBeNull()
  })
})
