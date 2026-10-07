import client from '@core/api/client'


// POST /auth/registro → 201 { id, nombre, email, rol, plan }
export async function registrar({ nombre, email, password, aceptaPolitica }) {
    const { data } = await client.post('/auth/registro', { nombre, email, password, aceptaPolitica })
    return data
}

// POST /auth/login → 200 { token }
export async function iniciarSesion({ email, password }) {
    const { data } = await client.post('/auth/login', { email, password })
    return data
}

// GET /auth/me → 200 { id, nombre, email, rol, plan }
export async function obtenerPerfil() {
    const { data } = await client.get('/auth/me')
    return data
}
