import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { descargarReporte } from '@core/services/reportes.service'
import DescargarReporte from './DescargarReporte'

vi.mock('@core/services/reportes.service', () => ({ descargarReporte: vi.fn() }))

const AHORA = new Date('2026-11-04T15:00:00.000Z')

describe('botón Descargar reporte', () => {
    let clics

    beforeEach(() => {
        vi.useFakeTimers({ now: AHORA, toFake: ['Date'] })
        URL.createObjectURL = vi.fn(() => 'blob:reporte')
        URL.revokeObjectURL = vi.fn()
        clics = []
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function guardar() {
            clics.push(this.download)
        })
        vi.mocked(descargarReporte).mockReset()
        vi.mocked(descargarReporte).mockResolvedValue(new Blob(['reporte']))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('descarga en Excel por defecto, con el producto y el rango del tablero', async () => {
        render(<DescargarReporte productoId={7} dias={30} />)

        await userEvent.click(screen.getByRole('button', { name: 'Descargar reporte' }))

        await waitFor(() => expect(clics).toEqual(['reporte-trendly-7-2026-11-04.xlsx']))
        expect(descargarReporte).toHaveBeenCalledWith({
            formato: 'xlsx',
            productoId: 7,
            desde: '2026-10-05T15:00:00.000Z',
            hasta: '2026-11-04T15:00:00.000Z',
        })
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte')
    })

    it('se puede elegir PDF', async () => {
        render(<DescargarReporte productoId={7} dias={90} />)

        await userEvent.selectOptions(screen.getByLabelText('Formato'), 'PDF')
        await userEvent.click(screen.getByRole('button', { name: 'Descargar reporte' }))

        await waitFor(() => expect(clics).toEqual(['reporte-trendly-7-2026-11-04.pdf']))
        expect(descargarReporte).toHaveBeenCalledWith(expect.objectContaining({ formato: 'pdf', desde: '2026-08-06T15:00:00.000Z' }))
    })

    it('confirma la descarga con el nombre del archivo y la quita al cambiar de formato', async () => {
        render(<DescargarReporte productoId={7} dias={30} />)

        await userEvent.click(screen.getByRole('button', { name: 'Descargar reporte' }))

        expect(await screen.findByRole('status')).toHaveTextContent('Reporte descargado: reporte-trendly-7-2026-11-04.xlsx')
        await userEvent.selectOptions(screen.getByLabelText('Formato'), 'PDF')
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('muestra el error del API y deja volver a intentar', async () => {
        vi.mocked(descargarReporte).mockRejectedValueOnce({ response: { status: 404, data: { message: 'Producto no encontrado' } } })
        render(<DescargarReporte productoId={7} dias={30} />)

        await userEvent.click(screen.getByRole('button', { name: 'Descargar reporte' }))

        expect(await screen.findByText('Producto no encontrado')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Descargar reporte' })).toBeEnabled()
        expect(clics).toEqual([])
    })

    it('sin producto no se puede descargar', () => {
        render(<DescargarReporte productoId={null} dias={30} />)

        expect(screen.getByRole('button', { name: 'Descargar reporte' })).toBeDisabled()
    })
})
