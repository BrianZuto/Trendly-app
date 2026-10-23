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
  it('explica cómo funciona el monitoreo programado en tres pasos', () => {
    renderizarLanding()

    const recorrido = screen.getByRole('region', { name: 'Muchos precios, una decisión' })
    expect(within(recorrido).getByRole('button', { name: /registra/i })).toHaveAttribute('aria-current', 'step')
    expect(within(recorrido).getByText('Los precios y la disponibilidad de tus competidores, cada 6 horas.')).toBeInTheDocument()
    expect(within(recorrido).getByText('Con el precio sugerido y las alertas de cada recolección.')).toBeInTheDocument()
  })

  it('al elegir un paso lo marca como actual', async () => {
    // Con movimiento reducido el recorrido no anima con requestAnimationFrame: en jsdom no hay scroll real y la
    // animación podía pisar el paso elegido según el tiempo (la prueba fallaba a veces)
    const original = window.matchMedia
    window.matchMedia = (query) => ({ ...original(query), matches: query.includes('prefers-reduced-motion') })
    const desplazar = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = () => {}
    const user = userEvent.setup()
    renderizarLanding()

    await user.click(screen.getByRole('button', { name: /decides/i }))

    expect(screen.getByRole('button', { name: /decides/i })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: /registra/i })).not.toHaveAttribute('aria-current')
    window.matchMedia = original
    Element.prototype.scrollIntoView = desplazar
  })

  it('no muestra planes ni precios de suscripción', () => {
    renderizarLanding()

    expect(screen.queryByRole('heading', { name: /gratuito|plan(?:es)?\b/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/precio por anunciar|hasta 10 productos|hasta 100 productos/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Planes' })).not.toBeInTheDocument()
  })

  it('calcula el precio sugerido desde el costo y el margen objetivo que escribe el vendedor', async () => {
    const user = userEvent.setup()
    renderizarLanding()

    const tablero = screen.getByRole('region', { name: 'Tablero de productos' })
    expect(within(tablero).getByText('Monitoreo activo')).toBeInTheDocument()
    expect(await within(tablero).findByRole('img', { name: '$121.429' })).toBeInTheDocument()

    const costo = screen.getByLabelText('Costo en COP')
    await user.clear(costo)
    await user.type(costo, '100000')
    const margen = screen.getByLabelText('Margen objetivo %')
    await user.clear(margen)
    await user.type(margen, '20')

    expect(await within(tablero).findByRole('img', { name: '$125.000' })).toBeInTheDocument()
    expect(within(tablero).getByText('Margen 20%')).toBeInTheDocument()
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

  it('usa enlaces funcionales en el encabezado y en el cierre', () => {
    renderizarLanding()

    const barra = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(barra).getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '#recorrido')
    expect(within(barra).queryByRole('link', { name: 'Política de datos' })).not.toBeInTheDocument()
    expect(within(barra).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(within(barra).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')

    const cierre = screen.getByRole('contentinfo')
    expect(within(cierre).getByRole('img', { name: 'Trendly' })).toBeInTheDocument()
    expect(within(cierre).queryByRole('navigation', { name: 'Pie de página' })).not.toBeInTheDocument()
    expect(within(cierre).queryByRole('link', { name: 'Cómo funciona' })).not.toBeInTheDocument()
    expect(within(cierre).queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(within(cierre).queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument()
    expect(within(cierre).queryByRole('link', { name: 'Política de tratamiento de datos' })).not.toBeInTheDocument()
    expect(cierre.querySelector('a[href="#"]')).toBeNull()
  })
})
