import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rankingSimulado } from '@core/mocks/tendenciasSimuladas'
import { listarTendencias } from '@core/services/tendencias.service'
import RankingTendencias from './RankingTendencias'

vi.mock('@core/services/tendencias.service', () => ({ listarTendencias: vi.fn() }))

const TERMO = {
    posicion: 1,
    titulo: 'Termo de acero 1 L',
    publicacionId: 'MCO-1',
    productoId: 7,
    palabraClave: 'termo acero',
    precioVenta: 64900,
    costo: 28400,
    vendedores: 8,
    posicionBusqueda: 2.5,
    demanda: 85,
    margen: 56.2,
    competencia: 40,
    puntaje: 68.9,
}
const MOUSE = { ...TERMO, posicion: 2, titulo: 'Mouse inalámbrico', publicacionId: 'MCO-2', vendedores: 1, competencia: 5, puntaje: 60 }

beforeEach(() => {
    vi.mocked(listarTendencias).mockReset()
})

describe('ranking de tendencias', () => {
    it('muestra cada producto con sus tres variables y el puntaje, en el orden del ranking', async () => {
        vi.mocked(listarTendencias).mockResolvedValue([TERMO, MOUSE])
        render(<RankingTendencias />)

        const fila = await screen.findByRole('row', { name: /Termo de acero 1 L/ })
        expect(listarTendencias).toHaveBeenCalledWith(20)
        const celdas = within(fila).getAllByRole('cell').map((celda) => celda.textContent.replace(/\s/g, ''))
        expect(celdas).toEqual(['1', '$64.900', '$28.400', '85,0Puesto2,5', '56,2', '40,08vendedores', '68,9'])
        expect(within(fila).getByText('Búsqueda: termo acero')).toBeInTheDocument()

        const filas = screen.getAllByRole('row').slice(1)
        expect(filas.map((f) => within(f).getByRole('rowheader').firstChild.textContent)).toEqual(['Termo de acero 1 L', 'Mouse inalámbrico'])
        expect(within(filas[1]).getByText('1 vendedor')).toBeInTheDocument()
    })

    it('sin productos explica de dónde sale el ranking', async () => {
        vi.mocked(listarTendencias).mockResolvedValue([])
        render(<RankingTendencias />)

        expect(await screen.findByText(/Aún no hay productos en el ranking/)).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('muestra el error del servidor', async () => {
        vi.mocked(listarTendencias).mockRejectedValue({ response: { status: 500, data: { message: 'No se pudo armar el ranking' } } })
        render(<RankingTendencias />)

        expect(await screen.findByText('No se pudo armar el ranking')).toBeInTheDocument()
        expect(screen.queryByText(/Aún no hay productos/)).not.toBeInTheDocument()
    })
})

describe('ranking simulado', () => {
    it('trae al menos 20 productos ordenados por puntaje, con la fórmula del backend', () => {
        const ranking = rankingSimulado(20)

        expect(ranking).toHaveLength(20)
        expect(ranking.map((f) => f.posicion)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
        ranking.slice(1).forEach((fila, i) => expect(fila.puntaje).toBeLessThanOrEqual(ranking[i].puntaje))
        ranking.forEach((f) => expect(f.puntaje).toBeCloseTo(0.4 * f.demanda + 0.3 * f.margen + 0.3 * (100 - f.competencia), 1))
        expect(rankingSimulado(3)).toHaveLength(3)
    })
})
