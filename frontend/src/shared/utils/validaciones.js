const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MENSAJE_POLITICA = 'Debe aceptar la política de tratamiento de datos'

export function validarNombre(valor) {
    return valor.trim() ? '' : 'El nombre es obligatorio'
}

export function validarEmail(valor) {
    const email = valor.trim()
    if (!email) return 'El email es obligatorio'
    if (!EMAIL_RE.test(email)) return 'Ingresa un email válido'
    return ''
}

export function validarPassword(valor) {
    if (!valor) return 'La contraseña es obligatoria'
    if (valor.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (!/\p{L}/u.test(valor) || !/\d/.test(valor)) return 'La contraseña debe tener letras y números'
    return ''
}

export function validarRegistro({ nombre, email, password, confirmar, aceptaPolitica }) {
    const errores = {
    nombre: validarNombre(nombre),
    email: validarEmail(email),
    password: validarPassword(password),
    confirmar: !confirmar ? 'Confirma tu contraseña' : confirmar !== password ? 'Las contraseñas no coinciden' : '',
    aceptaPolitica: aceptaPolitica ? '' : MENSAJE_POLITICA,
    }
    return quitarVacios(errores)
}

export function validarLogin({ email, password }) {
    return quitarVacios({
    email: validarEmail(email),
    password: password ? '' : 'La contraseña es obligatoria',
    })
}

function quitarVacios(errores) {
    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje))
}