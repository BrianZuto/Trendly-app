import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@core/auth/AuthProvider'
import { guardarSesion, guardarToken } from '@core/auth/token'
import { sembrarProductos } from '@core/mocks/mockAdapter'
import { iniciarSesion, obtenerPerfil } from '@core/services/auth.service'
import ProductoDetalle from './ProductoDetalle'

const EMAIL = 'vendedor@trendly.co'
const URL_ML = 'https://articulo.mercadolibre.com.co/MCO-1342210987-smartwatch-amoled-_JM'
const URL_AE = 'https://es.aliexpress.com/item/1005006123456789.html'
const URL_FA = 'https://www.falabella.com.co/falabella-co/product/72345678/smartwatch-amoled'

beforeEach(async () => {
    const { token } = await iniciarSesion({ email: EMAIL, password: 'Trendly123' })
    guardarToken(token)
    guardarSesion(token, await obtenerPerfil())
    sembrarProductos(EMAIL, [{ nombre: 'Smartwatch AMOLED 1.9"', sku: 'SW-AM19', costo: 112000, precioVenta: 159900, margenObjetivo: 30 }])
})

async function renderizar(ruta = '/productos/1') {
    render(
        <MemoryRouter initialEntries={[ruta]}>
            <AuthProvider>
                <Routes>
                    <Route path="/productos/:id" element={<ProductoDetalle />} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>,
    )
    await waitForElementToBeRemoved(() => screen.queryByText('Cargando producto…'))
}

async function agregarPorUrl(user, url) {
    const campo = screen.getByLabelText('URL de la publicación')
    await user.clear(campo)
    await user.type(campo, url)
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
}

describe('detalle del producto', () => {
    it('muestra el producto y, sin competidores, invita a agregar el primero', async () => {
        await renderizar()

        expect(screen.getByRole('heading', { level: 1, name: 'Smartwatch AMOLED 1.9"' })).toBeInTheDocument()
        expect(screen.getByRole('img', { name: '$159.900' })).toBeInTheDocument()
        expect(screen.getByText('La foto llega con la primera captura')).toBeInTheDocument()
        expect(screen.getByText(/Todavía no vigilas la reventa/)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Productos' })).toHaveAttribute('href', '/productos')
    })

    it('valida la URL en el navegador antes de llamar al API', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('button', { name: 'Agregar' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Pega la URL de la publicación')

        await agregarPorUrl(user, 'amazon.com/dp/B0C7')
        expect(screen.getByRole('alert')).toHaveTextContent('Esa URL no está bien escrita')

        await agregarPorUrl(user, 'https://www.ebay.com/itm/1234')
        expect(screen.getByRole('alert')).toHaveTextContent('Solo se admiten publicaciones de MercadoLibre, Falabella o Amazon.')

        await agregarPorUrl(user, URL_AE)
        expect(screen.getByRole('alert')).toHaveTextContent('AliExpress es tu proveedor: aquí se vigilan sitios de reventa.')
        expect(screen.getByLabelText('URL de la publicación')).toHaveAttribute('aria-invalid', 'true')
    })

    it('reconoce el marketplace mientras se escribe la URL', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.type(screen.getByLabelText('URL de la publicación'), URL_FA)
        expect(screen.getByText('Falabella', { selector: '.sello-detectado' })).toBeInTheDocument()
    })

    it('agrega una publicación por URL: aparece en la tabla, da la foto y ubica tu precio', async () => {
        const user = userEvent.setup()
        await renderizar()

        await agregarPorUrl(user, URL_ML)

        const tabla = await screen.findByRole('table', { name: 'Publicaciones que vigilas' })
        const fila = within(tabla).getByText('MCO-1342210987').closest('tr')
        expect(within(fila).getByText('MercadoLibre')).toBeInTheDocument()
        expect(within(fila).getByText('Por URL')).toBeInTheDocument()
        expect(within(fila).getByText(/que tú$/)).toBeInTheDocument()
        // Tu precio entra a la lista como una fila más
        expect(within(tabla).getByText('Tú')).toBeInTheDocument()
        expect(screen.getByLabelText('URL de la publicación')).toHaveValue('')

        expect(await screen.findByText(/^En uso · De la publicación de/)).toBeInTheDocument()
        expect(screen.getByRole('img', { name: /^Tu precio \$159\.900\. Eres el \d\.º más barato de 2/ })).toBeInTheDocument()
        expect(screen.getByText(/^1 publicación en MercadoLibre/)).toBeInTheDocument()
    })

    it('muestra junto al formulario el error del API si la publicación ya se vigila', async () => {
        const user = userEvent.setup()
        await renderizar()

        await agregarPorUrl(user, URL_ML)
        await screen.findByRole('table', { name: 'Publicaciones que vigilas' })
        await agregarPorUrl(user, URL_ML)

        expect(await screen.findByText('Ya vigilas esta publicación en este producto')).toBeInTheDocument()
    })

    it('vigila los primeros resultados de una búsqueda con su posición', async () => {
        const user = userEvent.setup()
        await renderizar()

        await user.click(screen.getByRole('tab', { name: 'Por palabra clave' }))
        await user.click(screen.getByRole('button', { name: 'Agregar' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Escribe al menos 3 caracteres')

        await user.type(screen.getByLabelText('Palabra clave'), 'smartwatch amoled')
        await user.selectOptions(screen.getByLabelText('Marketplace'), 'AMAZON')
        await user.selectOptions(screen.getByLabelText('Primeros'), '3')
        await user.click(screen.getByRole('button', { name: 'Agregar' }))

        const tabla = await screen.findByRole('table', { name: 'Publicaciones que vigilas' })
        // Encabezado, 3 publicaciones y la fila con tu precio
        expect(within(tabla).getAllByRole('row')).toHaveLength(5)
        expect(within(tabla).getByText('Puesto 1 de 3')).toBeInTheDocument()
        expect(within(tabla).getAllByText(/^US\$/)).toHaveLength(3)
    })

    it('filtra por sitio y por stock, y ordena por precio', async () => {
        const user = userEvent.setup()
        await renderizar()
        await user.click(screen.getByRole('tab', { name: 'Por palabra clave' }))
        await user.type(screen.getByLabelText('Palabra clave'), 'smartwatch amoled')
        await user.click(screen.getByRole('button', { name: 'Agregar' }))
        const tabla = await screen.findByRole('table', { name: 'Publicaciones que vigilas' })
        expect(within(tabla).getAllByText('MercadoLibre')).toHaveLength(5)

        await user.type(screen.getByLabelText('Palabra clave'), 'smartwatch amoled')
        await user.selectOptions(screen.getByLabelText('Marketplace'), 'FALABELLA')
        await user.selectOptions(screen.getByLabelText('Primeros'), '3')
        await user.click(screen.getByRole('button', { name: 'Agregar' }))
        await within(tabla).findAllByText('Falabella')

        await user.click(screen.getByRole('button', { name: /^Falabella/, pressed: false }))
        expect(within(tabla).queryAllByText('MercadoLibre')).toHaveLength(0)
        expect(within(tabla).getAllByText('Falabella')).toHaveLength(3)

        const precios = () => within(tabla).getAllByText(/^\$[\d.]+$/, { selector: '.precio-vivo strong' }).map((n) => Number(n.textContent.replace(/\D/g, '')))
        const subiendo = precios()
        expect(subiendo).toEqual([...subiendo].sort((a, b) => a - b))
        await user.click(within(tabla).getByRole('button', { name: 'Precio' }))
        expect(within(tabla).getByRole('columnheader', { name: 'Precio' })).toHaveAttribute('aria-sort', 'descending')
        expect(precios()).toEqual([...subiendo].reverse())

        await user.click(screen.getByLabelText('Solo con stock'))
        expect(within(tabla).queryAllByText('Sin stock')).toHaveLength(0)
    })

    it('pausa, reactiva y deja de vigilar una publicación', async () => {
        const user = userEvent.setup()
        await renderizar()
        await agregarPorUrl(user, URL_ML)
        const tabla = await screen.findByRole('table', { name: 'Publicaciones que vigilas' })

        await user.click(within(tabla).getByRole('button', { name: /^Pausar / }))
        expect(await within(tabla).findByText('Pausado')).toBeInTheDocument()
        await user.click(within(tabla).getByRole('button', { name: /^Reactivar / }))
        expect(await within(tabla).findByRole('button', { name: /^Pausar / })).toBeInTheDocument()
        expect(within(tabla).queryByText('Pausado')).not.toBeInTheDocument()

        await user.click(within(tabla).getByRole('button', { name: /^Eliminar / }))
        const confirmacion = screen.getByRole('alertdialog', { name: '¿Dejar de vigilar?' })
        await user.click(within(confirmacion).getByRole('button', { name: 'Dejar de vigilar' }))

        expect(await screen.findByText(/Todavía no vigilas la reventa/)).toBeInTheDocument()
    })

    it('un producto que no existe muestra el error y el camino de vuelta', async () => {
        await renderizar('/productos/99')

        expect(screen.getByText('Este producto no existe o ya fue eliminado.')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Volver a productos' })).toBeInTheDocument()
    })
})
