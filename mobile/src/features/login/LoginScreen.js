import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { mensajeDeError } from '@/core/api/errores'
import { useAuth } from '@/core/auth/AuthProvider'
import { LogoTrendly } from '@/core/Logo'
import { Aparecer, vibrar } from '@/core/movimiento'
import { Boton, colores, tipo } from '@/core/ui'

// Las partes del dominio no incluyen el punto, así la expresión no retrocede (tiempo lineal)
const EMAIL_VALIDO = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

export default function LoginScreen() {
    const { entrar, aviso } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [enfocado, setEnfocado] = useState(null)
    const campoPassword = useRef(null)

    function fallar(mensaje) {
        setError(mensaje)
        vibrar.error()
    }

    async function enviar() {
        if (!EMAIL_VALIDO.test(email.trim())) return fallar('Escribe un correo válido')
        if (!password) return fallar('Escribe tu contraseña')
        setError(null)
        setEnviando(true)
        try {
            await entrar({ email: email.trim(), password })
            vibrar.exito()
        } catch (e) {
            fallar(mensajeDeError(e, { 401: 'Correo o contraseña incorrectos' }))
            setEnviando(false)
        }
    }

    const mensaje = error ?? aviso
    const estiloCampo = (nombre) => [estilos.input, enfocado === nombre && estilos.inputEnfocado]

    return (
        <SafeAreaView style={estilos.pantalla}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.contenido}>
                <Aparecer style={estilos.encabezado} desplazamiento={12}>
                    <LogoTrendly tamano={64} />
                    <Text style={estilos.marca}>Trendly</Text>
                    <Text style={estilos.subtitulo}>Entra con la misma cuenta de la web</Text>
                </Aparecer>

                <Aparecer style={estilos.formulario} retraso={60} desplazamiento={12}>
                    <View style={estilos.campo}>
                        <Text style={estilos.etiqueta}>Correo</Text>
                        <TextInput
                            accessibilityLabel="Correo"
                            style={estiloCampo('email')}
                            value={email}
                            onChangeText={setEmail}
                            onFocus={() => setEnfocado('email')}
                            onBlur={() => setEnfocado(null)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            keyboardType="email-address"
                            textContentType="username"
                            placeholder="tu@correo.com"
                            placeholderTextColor={colores.tintaSuave}
                            returnKeyType="next"
                            submitBehavior="submit"
                            onSubmitEditing={() => campoPassword.current?.focus()}
                        />
                    </View>
                    <View style={estilos.campo}>
                        <Text style={estilos.etiqueta}>Contraseña</Text>
                        <TextInput
                            ref={campoPassword}
                            accessibilityLabel="Contraseña"
                            style={estiloCampo('password')}
                            value={password}
                            onChangeText={setPassword}
                            onFocus={() => setEnfocado('password')}
                            onBlur={() => setEnfocado(null)}
                            secureTextEntry
                            autoComplete="current-password"
                            textContentType="password"
                            placeholder="••••••••"
                            placeholderTextColor={colores.tintaSuave}
                            returnKeyType="go"
                            onSubmitEditing={enviar}
                        />
                    </View>

                    {mensaje && (
                        <Aparecer key={mensaje} desplazamiento={4}>
                            <Text style={estilos.error} accessibilityRole="alert">
                                {mensaje}
                            </Text>
                        </Aparecer>
                    )}

                    <Boton
                        titulo={enviando ? 'Entrando…' : 'Iniciar sesión'}
                        onPress={enviar}
                        deshabilitado={enviando}
                        cargando={enviando}
                    />
                </Aparecer>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const estilos = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: colores.humo },
    contenido: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 36 },
    encabezado: { gap: 6 },
    marca: { ...tipo.destacado, marginTop: 14 },
    subtitulo: tipo.cuerpo,
    formulario: { gap: 16 },
    campo: { gap: 6 },
    etiqueta: tipo.etiqueta,
    input: {
        backgroundColor: colores.papel,
        borderRadius: 14,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colores.borde,
        minHeight: 52,
        paddingHorizontal: 16,
        // 17 = cuerpo de iOS; con menos, iOS hace zoom al enfocar el campo
        fontSize: tipo.titular.fontSize,
        color: colores.tinta,
    },
    inputEnfocado: { borderColor: colores.tinta },
    error: { ...tipo.cuerpo, color: colores.peligro },
})
