import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

  it('muestra los planes documentados sin afirmar funciones o historial no definidos', () => {
    renderizarLanding()

    expect(screen.getByRole('heading', { name: 'Gratuito' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
    expect(screen.getByText('Hasta 10 productos registrados')).toBeInTheDocument()
    expect(screen.getByText('Hasta 100 productos registrados')).toBeInTheDocument()
    expect(screen.getByText(/COP\s*\/\s*mes/i)).toBeInTheDocument()
    expect(screen.queryByText(/inteligencia artificial|tiempo real|historial de 15 días|historial de 6 meses/i)).not.toBeInTheDocument()
  })

  it('muestra una comparación de precios ilustrativa y calcula sugerencia desde costo y margen objetivo', () => {
    renderizarLanding()

    expect(screen.getByRole('article', { name: 'Vista de ejemplo de comparación de precios' })).toBeInTheDocument()
    expect(screen.queryByText('Vista de ejemplo')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /audífonos de diadema sobre fondo claro/i })).toHaveAttribute('src', expect.stringContaining('images.unsplash.com'))
    expect(screen.getByText('Audífonos Bluetooth')).toBeInTheDocument()
    expect(screen.getByText(/121[.,]429/)).toBeInTheDocument()
    expect(screen.getByText(/119[.,]900/)).toBeInTheDocument()
    expect(document.querySelector('.position-mark')).toBeNull()
    expect(screen.getByText(/20[.,]000 menos/)).toBeInTheDocument()
    expect(document.querySelector('.preview-position').textContent).toMatch(/menos que el precio observado/)
    expect(screen.getByText('Para alcanzar tu objetivo')).toBeInTheDocument()
    expect(screen.getByText(/29[.,]1%/)).toBeInTheDocument()
    expect(screen.getAllByRole('meter')).toHaveLength(3)
    expect(screen.queryByText(/producto y cifras ilustrativos/i)).not.toBeInTheDocument()
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
