import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@core/auth/AuthProvider'
import { guardarSesion, guardarToken } from '@core/auth/token'
import { sembrarProductos } from '@core/mocks/mockAdapter'
import { iniciarSesion, obtenerPerfil } from '@core/services/auth.service'
import Productos from './Productos'

const EMAIL = 'vendedor@trendly.co'

const CAMISETA = { nombre: 'Camiseta básica', sku: 'CAM-001', costo: 20000, precioVenta: 40000, margenObjetivo: 30 }

beforeEach(async () => {
    const { token } = await iniciarSesion({ email: EMAIL, password: 'Trendly123' })
    guardarToken(token)
    guardarSesion(token, await obtenerPerfil())
})

async function renderizar() {
    render(
        <MemoryRouter>
            <AuthProvider>
                <Productos />
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

    it('crea un producto y aparece en la tabla sin recargar', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
        const dialogo = screen.getByRole('dialog', { name: 'Nuevo producto' })
        expect(within(dialogo).getByLabelText('Nombre')).toHaveFocus()
        await llenar(user, dialogo, CAMISETA)
        expect(within(dialogo).getByText('Margen con este precio: 50%')).toBeInTheDocument()
        await user.click(within(dialogo).getByRole('button', { name: 'Crear producto' }))

        expect(await screen.findByText('Producto creado')).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        const fila = screen.getByRole('row', { name: /Camiseta básica/ })
        expect(within(fila).getByText('SKU CAM-001')).toBeInTheDocument()
        expect(within(fila).getByText(/40\.000/)).toBeInTheDocument()
        expect(within(fila).getByText('Próximamente')).toBeInTheDocument()
        expect(within(fila).getByText('Sin datos')).toBeInTheDocument()
    })

    it('valida los campos antes de enviar', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
        const dialogo = screen.getByRole('dialog')
        await llenar(user, dialogo, { costo: 0, margenObjetivo: 150 })
        await user.click(within(dialogo).getByRole('button', { name: 'Crear producto' }))

        expect(within(dialogo).getByText('El nombre es obligatorio')).toBeInTheDocument()
        expect(within(dialogo).getByText('El SKU es obligatorio')).toBeInTheDocument()
        expect(within(dialogo).getByText('El costo debe ser mayor que 0')).toBeInTheDocument()
        expect(within(dialogo).getByText('El precio de venta debe ser mayor que 0')).toBeInTheDocument()
        expect(within(dialogo).getByText('El margen objetivo debe estar entre 0 y 100')).toBeInTheDocument()
    })

    it('muestra el error del servidor cuando el SKU ya existe', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
        const dialogo = screen.getByRole('dialog')
        await llenar(user, dialogo, { ...CAMISETA, nombre: 'Otra camiseta' })
        await user.click(within(dialogo).getByRole('button', { name: 'Crear producto' }))

        expect(await within(dialogo).findByText('Ya tienes un producto con ese SKU')).toBeInTheDocument()
    })

    it('edita un producto con el mismo formulario', async () => {
        sembrarProductos(EMAIL, [CAMISETA])
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Editar Camiseta básica' }))
        const dialogo = screen.getByRole('dialog', { name: 'Editar producto' })
        expect(within(dialogo).getByLabelText('SKU')).toHaveValue('CAM-001')
        await llenar(user, dialogo, { precioVenta: 50000 })
        await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))

        expect(await screen.findByText('Producto actualizado')).toBeInTheDocument()
        const fila = screen.getByRole('row', { name: /Camiseta básica/ })
        expect(within(fila).getByText(/50\.000/)).toBeInTheDocument()
        expect(within(fila).getByText('60%')).toBeInTheDocument()
    })

    it('Escape cierra el formulario y devuelve el foco al botón', async () => {
        const user = userEvent.setup()
        await renderizar()

        const boton = screen.getByRole('button', { name: 'Nuevo producto' })
        await user.click(boton)
        await user.keyboard('{Escape}')

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(boton).toHaveFocus()
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
        expect(screen.getByRole('button', { name: 'Editar Camiseta básica' })).toBeInTheDocument()
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

    it('el formulario calcula el precio mínimo para el margen objetivo', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
        const dialogo = screen.getByRole('dialog')
        await llenar(user, dialogo, { costo: 30000, precioVenta: 35000, margenObjetivo: 25 })

        expect(within(dialogo).getByText('Margen con este precio: 14,29%, por debajo del objetivo')).toBeInTheDocument()
        const minimo = within(dialogo).getByText('Precio mínimo para tu objetivo').nextElementSibling
        expect(minimo).toHaveTextContent(/40\.000/)
    })

    it('al llegar al límite del plan muestra el mensaje del servidor', async () => {
        sembrarProductos(
            EMAIL,
            Array.from({ length: 10 }, (_, n) => ({ ...CAMISETA, nombre: `Producto ${n + 1}`, sku: `SKU-${n + 1}` })),
        )
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
        const dialogo = screen.getByRole('dialog')
        await llenar(user, dialogo, { ...CAMISETA, sku: 'NUEVO-1' })
        await user.click(within(dialogo).getByRole('button', { name: 'Crear producto' }))

        expect(await within(dialogo).findByText('Alcanzó el límite de su plan')).toBeInTheDocument()
    })
})
