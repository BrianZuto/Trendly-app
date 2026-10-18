import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@core/auth/AuthProvider'
import { guardarSesion, guardarToken } from '@core/auth/token'
import { sembrarProductos } from '@core/mocks/mockAdapter'
import { iniciarSesion, obtenerPerfil } from '@core/services/auth.service'
import { crearMonitoreo } from '@core/services/monitoreos.service'
import Productos from './Productos'

const EMAIL = 'vendedor@trendly.co'

const CAMISETA = { nombre: 'Camiseta básica', sku: 'CAM-001', costo: 20000, precioVenta: 40000, margenObjetivo: 30 }

beforeEach(async () => {
    const { token } = await iniciarSesion({ email: EMAIL, password: 'Trendly123' })
    guardarToken(token)
    guardarSesion(token, await obtenerPerfil())
})

async function renderizar(entradas = ['/productos']) {
    render(
        <MemoryRouter initialEntries={entradas}>
            <AuthProvider>
                <Routes>
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/productos/nuevo" element={<p>Pantalla nuevo producto</p>} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>,
    )
    await waitForElementToBeRemoved(() => screen.queryByText('Cargando productos…'))
}

async function llenar(user, dialogo, datos) {
    const campos = {
        nombre: 'Nombre',
        sku: 'SKU',
        costo: 'Costo',
        precioVenta: 'Precio de venta',
        margenObjetivo: 'Margen objetivo',
    }
    for (const [clave, etiqueta] of Object.entries(campos)) {
        if (datos[clave] === undefined) continue
        const campo = within(dialogo).getByLabelText(etiqueta)
        await user.clear(campo)
        if (datos[clave] !== '') await user.type(campo, String(datos[clave]))
    }
}

describe('productos', () => {
    it('sin productos muestra el estado vacío y no habla de planes', async () => {
        await renderizar()

        expect(screen.getByText('Aún no tienes productos, agrega el primero')).toBeInTheDocument()
        expect(screen.queryByText(/plan/i)).not.toBeInTheDocument()
    })

    it('Nuevo producto lleva a la pantalla que parte del proveedor', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
        expect(screen.getByText('Pantalla nuevo producto')).toBeInTheDocument()
    })

    it('el producto recién creado llega con su etiqueta y su fila resaltada', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        const user = userEvent.setup()
        const { obtenerProducto } = await import('@core/services/productos.service')
        const creado = await obtenerProducto(1)
        await renderizar([{ pathname: '/productos', state: { creado } }])

        const etiqueta = screen.getByText('Producto creado').closest('.llegada')
        expect(within(etiqueta).getByText('Camiseta básica')).toBeInTheDocument()
        expect(within(etiqueta).getByRole('img', { name: /40\.000/ })).toBeInTheDocument()
        expect(screen.getByRole('row', { name: /Camiseta básica/ })).toHaveClass('fila-nueva')

        await user.click(within(etiqueta).getByRole('button', { name: 'Ver en la lista' }))
        expect(screen.queryByText('Producto creado')).not.toBeInTheDocument()
    })

    it('edita un producto con el mismo formulario', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Más acciones para Camiseta básica' }))
        await user.click(screen.getByRole('button', { name: 'Editar' }))
        const dialogo = screen.getByRole('dialog', { name: 'Editar producto' })
        expect(within(dialogo).getByLabelText('SKU')).toHaveValue('CAM-001')
        await llenar(user, dialogo, { precioVenta: 50000 })
        await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))

        expect(await screen.findByText('Producto actualizado')).toBeInTheDocument()
        const fila = screen.getByRole('row', { name: /Camiseta básica/ })
        expect(within(fila).getByText(/50\.000/)).toBeInTheDocument()
        expect(within(fila).getByText('60%')).toBeInTheDocument()
    })

    it('al editar valida los campos y calcula el precio mínimo', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Más acciones para Camiseta básica' }))
        await user.click(screen.getByRole('button', { name: 'Editar' }))
        const dialogo = screen.getByRole('dialog', { name: 'Editar producto' })
        await llenar(user, dialogo, { nombre: '', costo: 30000, precioVenta: 35000, margenObjetivo: 25 })
        expect(within(dialogo).getByText('Margen con este precio: 14,29%, por debajo del objetivo')).toBeInTheDocument()
        expect(within(dialogo).getByText('Precio mínimo para tu objetivo').nextElementSibling).toHaveTextContent(/40\.000/)

        await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))
        expect(within(dialogo).getByText('El nombre es obligatorio')).toBeInTheDocument()

        await user.keyboard('{Escape}')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('pide confirmación antes de eliminar', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Más acciones para Camiseta básica' }))
        await user.click(screen.getByRole('button', { name: 'Eliminar Camiseta básica' }))
        let confirmacion = screen.getByRole('alertdialog', { name: '¿Eliminar producto?' })
        await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))
        expect(screen.getByRole('row', { name: /Camiseta básica/ })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Más acciones para Camiseta básica' }))
        await user.click(screen.getByRole('button', { name: 'Eliminar Camiseta básica' }))
        confirmacion = screen.getByRole('alertdialog')
        await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }))

        expect(await screen.findByText('Producto eliminado')).toBeInTheDocument()
        expect(screen.getByText('Aún no tienes productos, agrega el primero')).toBeInTheDocument()
    })

    it('resalta el margen actual cuando está por debajo del objetivo', async () => {
        sembrarProductos(EMAIL, [
            CAMISETA,
            { nombre: 'Gorra', sku: 'GOR-001', costo: 30000, precioVenta: 35000, margenObjetivo: 25 },
        ])
        await renderizar()

        const gorra = within(screen.getByRole('row', { name: /Gorra/ }))
        expect(gorra.getByText(/14,29%/).closest('td')).toHaveClass('margen-bajo')
        expect(gorra.getByText('Bajo el objetivo')).toBeInTheDocument()

        const camiseta = within(screen.getByRole('row', { name: /Camiseta básica/ }))
        expect(camiseta.getByText('50%').closest('td')).not.toHaveClass('margen-bajo')
    })

    it('muestra los productos en tarjetas con el precio en paletas', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Tarjetas' }))
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
        expect(screen.getByRole('img', { name: /40\.000/ })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Camiseta básica' })).toHaveAttribute('href', expect.stringMatching(/^\/productos\/\d+$/))
    })

    it('filtra los productos bajo su margen objetivo', async () => {
        sembrarProductos(EMAIL, [
            CAMISETA,
            { nombre: 'Gorra', sku: 'GOR-001', costo: 30000, precioVenta: 35000, margenObjetivo: 25 },
        ])
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: /Bajo el objetivo/ }))
        expect(screen.getByRole('row', { name: /Gorra/ })).toBeInTheDocument()
        expect(screen.queryByRole('row', { name: /Camiseta básica/ })).not.toBeInTheDocument()
    })

    it('con competidores muestra el mínimo, tu posición y cuántas publicaciones vigilas', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        await crearMonitoreo(1, { tipo: 'URL', valor: 'https://articulo.mercadolibre.com.co/MCO-1342210987-camiseta-_JM' })
        await renderizar()

        const fila = within(screen.getByRole('row', { name: /Camiseta básica/ }))
        expect(fila.getByText('MercadoLibre')).toBeInTheDocument()
        expect(fila.getByText('Costo a mano')).toBeInTheDocument()
        expect(fila.getByText('1 publicación')).toBeInTheDocument()
        expect(fila.getByText(/40\.100/)).toBeInTheDocument()
        expect(fila.getByText('El más barato')).toBeInTheDocument()
        expect(fila.getByRole('link', { name: 'Ver detalle de Camiseta básica' })).toHaveAttribute('href', '/productos/1')
    })
})
