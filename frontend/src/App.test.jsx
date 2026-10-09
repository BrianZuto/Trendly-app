import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import client from '@core/api/client'
import { AuthProvider } from '@core/auth/AuthProvider'
import App from './App'

function renderizar(ruta, initialEntries = [ruta]) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <AuthProvider>
                <App />
            </AuthProvider>
        </MemoryRouter>,
    )
}

async function iniciarSesion(user, email = 'vendedor@trendly.co', password = 'Trendly123') {
    await user.type(screen.getByLabelText('Email'), email)
    await user.type(screen.getByLabelText('Contraseña'), password)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('rutas protegidas', () => {
    it('sin sesión, /dashboard redirige a /login', async () => {
        renderizar('/dashboard')
        expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    })

    it('sin sesión, /productos redirige a /login', async () => {
        renderizar('/productos')
        expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    })

    it('una ruta desconocida lleva a la landing pública', async () => {
        renderizar('/no-existe')
        expect(await screen.findByRole('heading', { name: /domina el mercado, protege tu margen/i })).toBeInTheDocument()
    })

    it('la política de datos es pública', () => {
        renderizar('/politica-datos')
        expect(screen.getByRole('heading', { name: /política de tratamiento/i })).toBeInTheDocument()
    })
})

describe('navegación pública compartida', () => {
    it.each(['/login', '/registro'])('muestra los mismos enlaces en %s', (ruta) => {
        renderizar(ruta)

        expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Planes' })).toHaveAttribute('href', '/#planes')
        expect(screen.getByRole('link', { name: 'Política de datos' })).toHaveAttribute('href', '/politica-datos')
        expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Empezar gratis' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Regresar a la vista anterior' })).toBeInTheDocument()
    })

    it('regresa a la vista visitada antes de registro', async () => {
        const user = userEvent.setup()
        renderizar('/registro', ['/', '/registro'])

        await user.click(screen.getByRole('button', { name: 'Regresar a la vista anterior' }))

        expect(await screen.findByRole('heading', { name: /domina el mercado y protege tu margen/i })).toBeInTheDocument()
    })

    it('usa la landing como destino al abrir login directamente', async () => {
        const user = userEvent.setup()
        renderizar('/login')

        await user.click(screen.getByRole('button', { name: 'Regresar a la vista anterior' }))

        expect(await screen.findByRole('heading', { name: /domina el mercado y protege tu margen/i })).toBeInTheDocument()
    })
})

describe('inicio de sesión', () => {
    it('con credenciales válidas llega al dashboard y puede cerrar sesión', async () => {
        const user = userEvent.setup()
        renderizar('/login')
        await iniciarSesion(user)

        expect(await screen.findByRole('heading', { name: 'Hola, Vendedor Demo' })).toBeInTheDocument()
        expect(localStorage.getItem('trendly.token')).toBeTruthy()

        await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
        expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
        expect(localStorage.getItem('trendly.token')).toBeNull()
    })

    it('muestra "Credenciales inválidas" cuando el API responde 401', async () => {
        const user = userEvent.setup()
        renderizar('/login')
        await iniciarSesion(user, 'vendedor@trendly.co', 'Incorrecta1')
        expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
    })

    it('valida los campos antes de llamar al API', async () => {
        const user = userEvent.setup()
        renderizar('/login')
        await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
        expect(screen.getByText('El email es obligatorio')).toBeInTheDocument()
        expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    })

    it('con sesión abierta, /login redirige al dashboard', async () => {
        const user = userEvent.setup()
        const primera = renderizar('/login')
        await iniciarSesion(user)
        await screen.findByRole('heading', { name: /Hola/ })
        primera.unmount()

        renderizar('/login')
        expect(await screen.findByRole('heading', { name: /Hola/ })).toBeInTheDocument()
    })

    it('el ojo muestra y oculta la contraseña', async () => {
        const user = userEvent.setup()
        renderizar('/login')
        const campo = screen.getByLabelText('Contraseña')
        expect(campo).toHaveAttribute('type', 'password')

        await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
        expect(campo).toHaveAttribute('type', 'text')

        await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
        expect(campo).toHaveAttribute('type', 'password')
    })

    it('avisa cuando Bloq Mayús está activado', async () => {
        const user = userEvent.setup()
        renderizar('/login')
        const campo = screen.getByLabelText('Contraseña')
        await user.click(campo)
        await user.keyboard('{CapsLock}')
        expect(screen.queryByText('Bloq Mayús está activado')).toBeInTheDocument()
    })
})

describe('registro', () => {
    async function llenar(user, { email = 'nuevo@correo.com', aceptar = true } = {}) {
        await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez')
        await user.type(screen.getByLabelText('Email'), email)
        await user.type(screen.getByLabelText('Contraseña'), 'Clave1234')
        await user.type(screen.getByLabelText('Confirmar contraseña'), 'Clave1234')
        if (aceptar) await user.click(screen.getByLabelText('Acepto la política de tratamiento de datos'))
        await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    }

    it('un usuario nuevo se registra, inicia sesión y llega al dashboard', async () => {
        const user = userEvent.setup()
        renderizar('/registro')
        await llenar(user)

        expect(await screen.findByText('Cuenta creada. Inicia sesión para continuar.')).toBeInTheDocument()
        await iniciarSesion(user, 'nuevo@correo.com', 'Clave1234')
        expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument()
    })

    it('exige aceptar la política y no llama al API sin ella', async () => {
        const user = userEvent.setup()
        renderizar('/registro')
        await llenar(user, { aceptar: false })
        expect(screen.getByText('Debe aceptar la política de tratamiento de datos')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument()
    })

    it('muestra "Email ya registrado" cuando el API responde 409', async () => {
        const user = userEvent.setup()
        renderizar('/registro')
        await llenar(user, { email: 'vendedor@trendly.co' })
        expect(await screen.findByText('Email ya registrado')).toBeInTheDocument()
    })

    it('enlaza a la política de datos', () => {
        renderizar('/registro')
        expect(screen.getByRole('link', { name: 'Leer la política' })).toHaveAttribute('href', '/politica-datos')
    })

    it('el indicador muestra los requisitos y la seguridad en vivo', async () => {
        const user = userEvent.setup()
        renderizar('/registro')
        expect(screen.getByText('Crea una contraseña segura')).toBeInTheDocument()

        const campo = screen.getByLabelText('Contraseña')
        await user.type(campo, 'abc')
        expect(screen.getByText('Seguridad: Débil')).toBeInTheDocument()
        expect(screen.queryByText('Para hacerla más fuerte (recomendado)')).not.toBeInTheDocument()

        await user.clear(campo)
        await user.type(campo, 'clave1234')
        expect(screen.getByText('Seguridad: Aceptable')).toBeInTheDocument()
        expect(screen.getByText('Para hacerla más fuerte (recomendado)')).toBeInTheDocument()

        await user.clear(campo)
        await user.type(campo, 'Clave1234!')
        expect(screen.getByText('Seguridad: Fuerte')).toBeInTheDocument()
    })

    it('avisa en vivo si las contraseñas coinciden', async () => {
        const user = userEvent.setup()
        renderizar('/registro')
        await user.type(screen.getByLabelText('Contraseña'), 'Clave1234')
        await user.type(screen.getByLabelText('Confirmar contraseña'), 'Clave12')
        expect(screen.getByText('Las contraseñas aún no coinciden')).toBeInTheDocument()

        await user.type(screen.getByLabelText('Confirmar contraseña'), '34')
        expect(screen.getByText('Las contraseñas coinciden')).toBeInTheDocument()
    })
})

describe('interceptor de Axios', () => {
    it('envía el token Bearer y, ante un 401, cierra la sesión y manda a /login', async () => {
        const user = userEvent.setup()
        renderizar('/login')
        await iniciarSesion(user)
        await screen.findByRole('heading', { name: /Hola/ })

        const token = localStorage.getItem('trendly.token')
        let enviado
        const adaptadorOriginal = client.defaults.adapter
        client.defaults.adapter = (config) => {
            enviado = config.headers.Authorization
            return Promise.reject({ config, response: { status: 401, data: {}, config } })
        }

        await client.get('/productos').catch(() => { })
        client.defaults.adapter = adaptadorOriginal

        expect(enviado).toBe(`Bearer ${token}`)
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument())
        expect(screen.getByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument()
        expect(localStorage.getItem('trendly.token')).toBeNull()
    })
})