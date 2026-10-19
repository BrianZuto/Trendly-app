import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Vitrina from './Vitrina'
import { ANUNCIOS_EJEMPLO } from './vitrina.mock'

function renderizar(anuncios = ANUNCIOS_EJEMPLO) {
    return render(
        <MemoryRouter>
            <Vitrina anuncios={anuncios} />
        </MemoryRouter>,
    )
}

describe('Vitrina del Panel', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('navega con las flechas, los indicadores y las teclas del slider', () => {
        renderizar()
        const vitrina = screen.getByRole('region', { name: 'Vitrina' })

        fireEvent.keyDown(vitrina, { key: 'ArrowRight' })
        expect(screen.getByRole('group', { name: '2 de 3' })).toBeInTheDocument()
        fireEvent.keyDown(vitrina, { key: 'ArrowLeft' })
        expect(screen.getByRole('group', { name: '1 de 3' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar diapositiva 3 de 3' }))
        expect(screen.getByRole('group', { name: '3 de 3' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Anuncio anterior' }))
        expect(screen.getByRole('group', { name: '2 de 3' })).toBeInTheDocument()
    })

    it('pausa la rotación mientras se interactúa y la reanuda al salir', () => {
        vi.useFakeTimers()
        renderizar()
        const vitrina = screen.getByRole('region', { name: 'Vitrina' })

        act(() => {
            vi.advanceTimersByTime(6000)
        })
        expect(screen.getByRole('group', { name: '2 de 3' })).toBeInTheDocument()

        fireEvent.mouseEnter(vitrina)

        act(() => {
            vi.advanceTimersByTime(12000)
        })
        expect(screen.getByRole('group', { name: '2 de 3' })).toBeInTheDocument()

        fireEvent.mouseLeave(vitrina)
        act(() => {
            vi.advanceTimersByTime(6000)
        })
        expect(screen.getByRole('group', { name: '3 de 3' })).toBeInTheDocument()
    })

    it('identifica los anuncios pagados como patrocinados', () => {
        renderizar()
        const diapositiva = screen.getByRole('group', { name: '1 de 3' })

        expect(within(diapositiva).getByText('Patrocinado')).toBeInTheDocument()
        expect(within(diapositiva).getByRole('link', { name: 'Ver proveedor' })).toHaveAttribute('rel', 'sponsored noopener')
        expect(within(diapositiva).getByRole('link', { name: 'Ver proveedor' })).toHaveAttribute('target', '_blank')
    })

    it('no se renderiza cuando no hay anuncios', () => {
        const { container } = renderizar([])
        expect(container).toBeEmptyDOMElement()
    })

    it('oculta los controles cuando hay una sola diapositiva', () => {
        renderizar([ANUNCIOS_EJEMPLO[0]])

        expect(screen.getByRole('group', { name: '1 de 1' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Anuncio anterior' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Anuncio siguiente' })).not.toBeInTheDocument()
        expect(screen.queryByRole('group', { name: 'Seleccionar anuncio' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /pausar|reanudar/i })).not.toBeInTheDocument()
    })

    it('desactiva la rotación automática cuando se prefiere movimiento reducido', () => {
        vi.useFakeTimers()
        vi.spyOn(window, 'matchMedia').mockImplementation((consulta) => ({
            matches: consulta.includes('prefers-reduced-motion: reduce'),
            media: consulta,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }))
        renderizar()

        expect(screen.queryByRole('button', { name: /pausar|reanudar/i })).not.toBeInTheDocument()
        act(() => {
            vi.advanceTimersByTime(12000)
        })
        expect(screen.getByRole('group', { name: '1 de 3' })).toBeInTheDocument()
    })

    it('mantiene las diapositivas inactivas fuera del árbol accesible y del foco', () => {
        renderizar()
        const segunda = screen.getByLabelText('2 de 3', { selector: '[role="group"]' })

        expect(segunda).toHaveAttribute('aria-hidden', 'true')
        expect(segunda).toHaveAttribute('inert')
        expect(segunda).toHaveAttribute('tabindex', '-1')
    })
})
