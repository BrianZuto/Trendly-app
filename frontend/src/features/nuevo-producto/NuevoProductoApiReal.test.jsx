import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import client from '@core/api/client'
import { AuthProvider } from '@core/auth/AuthProvider'
import { mockAdapter } from '@core/mocks/mockAdapter'
import { filasDe } from '@features/producto-detalle/util'
import NuevoProducto from './NuevoProducto'

// Con el backend real no existe la búsqueda de proveedor: se simula quitando el adaptador del API simulado
describe('con el backend real', () => {
    beforeEach(() => {
        client.defaults.adapter = async () => {
            throw new Error('No debía llamar al API')
        }
    })
    afterEach(() => {
        client.defaults.adapter = mockAdapter
    })

    it('el producto nuevo empieza en los datos, con el costo a mano y sin buscar proveedor', () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <NuevoProducto />
                </AuthProvider>
            </MemoryRouter>,
        )

        expect(screen.getByLabelText('Costo')).toBeInTheDocument()
        expect(screen.getByText(/Registra tu producto con su costo/)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Buscar proveedor' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Atrás' })).not.toBeInTheDocument()
    })

    it('un monitoreo sin publicaciones (recién creado) se muestra como pendiente sin romper el detalle', () => {
        const monitoreos = [
            { id: 1, tipo: 'URL', marketplace: 'MERCADOLIBRE' },
            { id: 2, tipo: 'PALABRA_CLAVE', marketplace: 'MERCADOLIBRE', publicaciones: [] },
            { id: 3, tipo: 'URL', marketplace: 'ALIEXPRESS', publicaciones: [{ idPublicacion: '9', precio: 7612 }] },
        ]

        expect(filasDe(monitoreos).map((f) => [f.clave, f.pub?.precio ?? null])).toEqual([
            ['m1', null],
            ['m2', null],
            ['m3-9', 7612],
        ])
    })
})
