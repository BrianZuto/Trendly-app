import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@core/auth/AuthProvider'
import { guardarSesion, guardarToken } from '@core/auth/token'
import { sembrarProductos } from '@core/mocks/mockAdapter'
import { iniciarSesion, obtenerPerfil } from '@core/services/auth.service'
import { formatearPesos } from '@features/productos/formato'
import Productos from '@features/productos/Productos'
import TendenciasDropshipping from '@features/dashboard/TendenciasDropshipping'
import NuevoProducto from './NuevoProducto'
import { recomendar } from './recomendaciones'

const EMAIL = 'vendedor@trendly.co'

beforeEach(async () => {
    const { token } = await iniciarSesion({ email: EMAIL, password: 'Trendly123' })
    guardarToken(token)
    guardarSesion(token, await obtenerPerfil())
})

function renderizar(ruta = '/productos/nuevo') {
    render(
        <MemoryRouter initialEntries={[ruta]}>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<TendenciasDropshipping />} />
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/productos/nuevo" element={<NuevoProducto />} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>,
    )
}

async function buscar(user, texto) {
    const campo = screen.getByLabelText('Busca el producto en AliExpress')
    await user.clear(campo)
    await user.type(campo, texto)
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
}

async function llenarDatos(user, datos) {
    for (const [etiqueta, valor] of Object.entries(datos)) {
        const campo = screen.getByLabelText(etiqueta)
        await user.clear(campo)
        if (valor !== '') await user.type(campo, String(valor))
    }
}

describe('nuevo producto desde el proveedor', () => {
    it('recupera el proveedor seleccionado y los datos de venta de la tendencia desde la URL', async () => {
        renderizar('/productos/nuevo?origen=tendencias&id=termo-acero-1l&nombre=Termo+de+acero+1+L&categoria=Hogar&costo=28400&precioVenta=64900&margenObjetivo=30')

        expect(await screen.findByText('Proveedor elegido')).toBeInTheDocument()
        expect(document.querySelector('.pasos li[aria-current="step"]')).toHaveTextContent('Tus datos de venta')
        expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument()
        expect(screen.getByLabelText('Nombre')).toHaveValue('Termo de acero 1 L')
        expect(screen.queryByLabelText('Costo')).not.toBeInTheDocument()
        expect(screen.getByText(/En pesos \(TRM/)).toBeInTheDocument()
        expect(screen.getByLabelText('Precio de venta')).toHaveValue(64900)
    })

    it('agrega una tendencia y abre los datos de venta precargados', async () => {
        const user = userEvent.setup()
        renderizar('/')

        await user.click(screen.getAllByRole('link', { name: 'Agregar a monitoreo' })[0])

        expect(await screen.findByText('Proveedor elegido')).toBeInTheDocument()
        expect(document.querySelector('.pasos li[aria-current="step"]')).toHaveTextContent('Tus datos de venta')
        expect(screen.getByLabelText('Nombre')).toHaveValue('Termo de acero 1 L')
        expect(screen.getByLabelText('SKU')).toHaveValue('TERMO-ACERO-1L')
        expect(screen.queryByLabelText('Costo')).not.toBeInTheDocument()
        expect(screen.getByText(/En pesos \(TRM/)).toBeInTheDocument()
        const costoMostrado = document.querySelector('.desglose div:nth-child(3) dd').textContent.replace(/\s/g, '')
        expect(costoMostrado).toBe(formatearPesos(28400).replace(/\s/g, ''))
        expect(screen.getByLabelText('Precio de venta')).toHaveValue(64900)
        expect(screen.getByLabelText('Margen objetivo')).toHaveValue(56)
        expect(screen.getByText(/Margen con este precio: 56,24%/)).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Siguiente' }))
        expect(screen.getByRole('heading', { name: '¿Dónde comparar tu precio de reventa?' })).toBeInTheDocument()
        expect(screen.getByLabelText('Palabra clave')).toHaveValue('Termo de acero 1')
        await user.click(screen.getByRole('button', { name: 'Crear producto' }))

        expect(await screen.findByText('Producto creado', {}, { timeout: 3000 })).toBeInTheDocument()
        const fila = await screen.findByRole('row', { name: /Termo de acero 1 L/ })
        expect(within(fila).getByText(/publicaciones$/)).toBeInTheDocument()
    })

    it('conserva el costo, precio de venta y margen anunciados para el perfume', async () => {
        const user = userEvent.setup()
        renderizar('/')

        await user.click(screen.getAllByRole('link', { name: 'Agregar a monitoreo' })[3])

        expect(await screen.findByText('Proveedor elegido')).toBeInTheDocument()
        const costoMostrado = document.querySelector('.desglose div:nth-child(3) dd').textContent.replace(/\s/g, '')
        expect(costoMostrado).toBe(formatearPesos(44000).replace(/\s/g, ''))
        expect(screen.getByLabelText('Precio de venta')).toHaveValue(89900)
        expect(screen.getByLabelText('Margen objetivo')).toHaveValue(51)
        expect(screen.getByText(/Margen con este precio: 51,06%/)).toBeInTheDocument()
    })

    it('valida la búsqueda antes de llamar al API', async () => {
        const user = userEvent.setup()
        renderizar()

        await user.click(screen.getByRole('button', { name: 'Buscar' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Escribe al menos 3 caracteres o pega la URL de AliExpress')

        await buscar(user, 'https://www.ebay.com/itm/123')
        expect(screen.getByRole('alert')).toHaveTextContent('Solo se buscan proveedores en AliExpress')
    })

    it('compara las ofertas, recomienda una y permite ordenar y filtrar', async () => {
        const user = userEvent.setup()
        renderizar()

        await buscar(user, 'smartwatch amoled')

        const lista = await screen.findByRole('list', { name: 'Ofertas del proveedor' })
        expect(within(lista).getAllByRole('listitem')).toHaveLength(12)
        expect(screen.getByText('Te recomendamos')).toBeInTheDocument()
        expect(within(lista).getAllByText('Recomendado')).toHaveLength(1)
        expect(within(lista).getByText('Más barato')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Más barato', pressed: false }))
        const primera = within(lista).getAllByRole('listitem')[0]
        expect(within(primera).getByText('Más barato')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Envío gratis' }))
        const visibles = within(screen.getByRole('list', { name: 'Ofertas del proveedor' })).getAllByRole('listitem')
        visibles.forEach((oferta) => expect(within(oferta).getByText('Envío gratis')).toBeInTheDocument())
    })

    it('elige el proveedor, calcula el costo y programa la reventa al crear', async () => {
        const user = userEvent.setup()
        renderizar()
        await buscar(user, 'smartwatch amoled')
        await user.click(await screen.findByRole('button', { name: 'Elegir este proveedor' }))

        expect(screen.getByText('Proveedor elegido')).toBeInTheDocument()
        expect(screen.getByLabelText('Nombre').value).toMatch(/^Smartwatch amoled/)
        expect(screen.queryByLabelText('Costo')).not.toBeInTheDocument()
        await llenarDatos(user, { SKU: 'SW-AM19', 'Costos extra': 5000, 'Precio de venta': 159900, 'Margen objetivo': 30 })
        expect(screen.getByText(/^Margen con este precio:/)).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Siguiente' }))

        expect(screen.getByLabelText('Palabra clave').value).toMatch(/^Smartwatch amoled/)
        expect(screen.getByRole('checkbox', { name: 'MercadoLibre' })).toBeChecked()
        // Por ahora el API solo vigila MercadoLibre (SCRUM-37)
        expect(screen.queryByRole('checkbox', { name: 'Falabella' })).not.toBeInTheDocument()
        expect(screen.queryByRole('checkbox', { name: 'Amazon' })).not.toBeInTheDocument()
        expect(document.querySelector('.reventa-resumen')).toHaveTextContent(/en MercadoLibre\./)
        await user.click(screen.getByRole('button', { name: 'Crear producto' }))

        const etiqueta = (await screen.findByText('Producto creado', {}, { timeout: 3000 })).closest('.llegada')
        expect(within(etiqueta).getByText(/^Smartwatch amoled/)).toBeInTheDocument()
        const fila = await screen.findByRole('row', { name: /Smartwatch amoled/ })
        expect(within(fila).getByText('AE')).toBeInTheDocument()
        expect(within(fila).getByText(/publicaciones$/)).toBeInTheDocument()
    })

    it('sin proveedor pide el costo a mano y exige al menos un sitio de reventa', async () => {
        const user = userEvent.setup()
        renderizar()

        await user.click(screen.getByRole('button', { name: /registrar con costo a mano/ }))
        await user.click(screen.getByRole('button', { name: 'Siguiente' }))
        expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
        expect(screen.getByText('El costo debe ser mayor que 0')).toBeInTheDocument()
        expect(screen.getByText('El margen objetivo debe estar entre 0 y 100')).toBeInTheDocument()

        await llenarDatos(user, { Nombre: 'Gorra bordada', SKU: 'GOR-1', Costo: 20000, 'Precio de venta': 35000, 'Margen objetivo': 50 })
        await user.click(screen.getByRole('button', { name: 'Usar este precio' }))
        expect(screen.getByLabelText('Precio de venta')).toHaveValue(40000)
        await user.click(screen.getByRole('button', { name: 'Siguiente' }))

        await user.click(screen.getByRole('checkbox', { name: 'MercadoLibre' }))
        await user.click(screen.getByRole('button', { name: 'Crear producto' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Elige al menos un sitio donde comparar')
    })

    it('muestra el error del servidor al crear (SKU repetido)', async () => {
        sembrarProductos(EMAIL, [{ nombre: 'Otro', sku: 'GOR-1', costo: 1000, precioVenta: 2000, margenObjetivo: 10 }])
        const user = userEvent.setup()
        renderizar()

        await user.click(screen.getByRole('button', { name: /registrar con costo a mano/ }))
        await llenarDatos(user, { Nombre: 'Gorra bordada', SKU: 'GOR-1', Costo: 20000, 'Precio de venta': 40000, 'Margen objetivo': 30 })
        await user.click(screen.getByRole('button', { name: 'Siguiente' }))
        await user.click(screen.getByRole('button', { name: 'Crear producto' }))

        expect(await screen.findByText('Ya tienes un producto con ese SKU')).toBeInTheDocument()
    })
})

describe('recomendación por reglas', () => {
    const base = { envioUsd: 0, diasMin: 7, diasMax: 12, calificacion: 4.8, ventas: 3000, resenas: 600, imagen: '', titulo: 'x', tienda: 't' }

    it('no recomienda una oferta barata con alertas y explica la elegida', () => {
        const { recomendada, ofertas, razones } = recomendar([
            { ...base, idPublicacion: 'barata', precioUsd: 8, calificacion: 3.9, resenas: 10 },
            { ...base, idPublicacion: 'buena', precioUsd: 10 },
            { ...base, idPublicacion: 'cara', precioUsd: 16 },
        ])
        expect(recomendada.idPublicacion).toBe('buena')
        expect(ofertas.find((o) => o.idPublicacion === 'barata').alertas).toEqual(['Calificación baja', 'Pocas reseñas'])
        expect(ofertas.find((o) => o.idPublicacion === 'barata').insignias).toContain('Más barato')
        expect(razones[1]).toBe('Llega en 7–12 días')
    })
})
