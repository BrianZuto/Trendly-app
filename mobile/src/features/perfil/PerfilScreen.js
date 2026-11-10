import Ionicons from '@expo/vector-icons/Ionicons'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { mensajeDeError } from '@/core/api/errores'
import { useAuth } from '@/core/auth/AuthProvider'
import { Aparecer, vibrar } from '@/core/movimiento'
import { estadoPermiso } from '@/core/notificaciones'
import { actualizarReglas, obtenerReglas } from '@/core/services/api'
import { Boton, Cargando, ErrorConReintento, Etiqueta, Tarjeta, colores, espacio, tipo } from '@/core/ui'
import { useCarga } from '@/core/useCarga'

// Si el usuario negó el permiso, iOS no vuelve a preguntar: solo se puede cambiar en Ajustes. Se revisa al volver a la app
function usePermisoNotificaciones() {
    const [permiso, setPermiso] = useState(null)
    useEffect(() => {
        const revisar = () => estadoPermiso().then(setPermiso).catch(() => setPermiso(null))
        revisar()
        const suscripcion = AppState.addEventListener('change', (estado) => {
            if (estado === 'active') revisar()
        })
        return () => suscripcion.remove()
    }, [])
    return permiso
}

/** Perfil del vendedor (SCRUM-52, SCRUM-48): aquí puede desactivar las notificaciones push y los correos, y cerrar sesión. */
export default function PerfilScreen() {
    const { usuario, cerrarSesion } = useAuth()
    const cargar = useCallback(() => obtenerReglas(), [])
    const { datos: reglas, error, cargando, recargar } = useCarga(cargar)
    const permiso = usePermisoNotificaciones()
    // Lo que el vendedor cambió en esta pantalla; manda sobre lo que trajo el servidor
    const [cambios, setCambios] = useState({})
    const [guardando, setGuardando] = useState(false)
    const [errorGuardar, setErrorGuardar] = useState(null)
    const [saliendo, setSaliendo] = useState(false)

    if (cargando) return <Cargando texto="Cargando tu perfil…" />
    if (error && !reglas) return <ErrorConReintento mensaje={error} onReintentar={recargar} />

    const actuales = { ...reglas, ...cambios }
    const activas = actuales.recibirPush

    // Push y correo se guardan juntos con el resto de las reglas, para no pisar un cambio con el otro
    async function cambiar(campo, valor) {
        vibrar.seleccion()
        const antes = cambios
        setCambios({ ...cambios, [campo]: valor })
        setErrorGuardar(null)
        setGuardando(true)
        try {
            const guardadas = await actualizarReglas({
                umbralPct: actuales.umbralPct,
                avisarDisponibilidad: actuales.avisarDisponibilidad,
                recibirCorreos: actuales.recibirCorreos,
                recibirPush: actuales.recibirPush,
                [campo]: valor,
            })
            setCambios({ recibirPush: guardadas.recibirPush, recibirCorreos: guardadas.recibirCorreos })
        } catch (e) {
            setCambios(antes)
            setErrorGuardar(mensajeDeError(e))
            vibrar.error()
        } finally {
            setGuardando(false)
        }
    }

    async function salir() {
        setSaliendo(true)
        await cerrarSesion()
    }

    return (
        <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido} contentInsetAdjustmentBehavior="automatic">
            <Aparecer style={estilos.bloque}>
                <View style={estilos.cuenta}>
                    <View style={estilos.avatar}>
                        <Text style={[tipo.titulo2, { color: colores.papel }]}>{(usuario?.nombre ?? '?').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={estilos.flexible}>
                        <Text style={tipo.titulo} accessibilityRole="header">
                            {usuario?.nombre}
                        </Text>
                        <Text style={tipo.nota}>
                            {usuario?.email}
                            {usuario?.plan?.nombre ? ` · Plan ${usuario.plan.nombre}` : ''}
                        </Text>
                    </View>
                </View>

                <Etiqueta style={estilos.seccion}>Notificaciones</Etiqueta>
                <Tarjeta>
                    <View style={estilos.fila}>
                        <Ionicons name="notifications-outline" size={20} color={colores.tinta} />
                        <View style={estilos.flexible}>
                            <Text style={tipo.titular}>Notificaciones push</Text>
                            <Text style={tipo.nota}>Te avisamos en el celular cuando la competencia cambia un precio.</Text>
                        </View>
                        <Switch
                            accessibilityLabel="Notificaciones push"
                            value={activas}
                            onValueChange={(valor) => cambiar('recibirPush', valor)}
                            disabled={guardando}
                            trackColor={{ true: colores.tinta, false: colores.humoOscuro }}
                            thumbColor={colores.papel}
                            ios_backgroundColor={colores.humoOscuro}
                        />
                    </View>
                    <View style={[estilos.fila, estilos.separada]}>
                        <Ionicons name="mail-outline" size={20} color={colores.tinta} />
                        <View style={estilos.flexible}>
                            <Text style={tipo.titular}>Alertas por correo</Text>
                            <Text style={tipo.nota}>Un correo con los cambios de precio de tu competencia. Puedes desactivarlo cuando quieras.</Text>
                        </View>
                        <Switch
                            accessibilityLabel="Alertas por correo"
                            value={actuales.recibirCorreos}
                            onValueChange={(valor) => cambiar('recibirCorreos', valor)}
                            disabled={guardando}
                            trackColor={{ true: colores.tinta, false: colores.humoOscuro }}
                            thumbColor={colores.papel}
                            ios_backgroundColor={colores.humoOscuro}
                        />
                    </View>
                    {errorGuardar && (
                        <Text style={[tipo.nota, { color: colores.peligro }]} accessibilityRole="alert">
                            {errorGuardar}
                        </Text>
                    )}
                    {activas && permiso === 'denied' && (
                        <View style={estilos.aviso}>
                            <Text style={tipo.nota}>Este celular no tiene permiso para mostrar notificaciones de Trendly. Actívalo en Ajustes.</Text>
                            <Boton titulo="Abrir Ajustes" variante="claro" onPress={() => Linking.openSettings()} />
                        </View>
                    )}
                </Tarjeta>

                <View style={estilos.salir}>
                    <Boton
                        titulo={saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
                        variante="claro"
                        onPress={salir}
                        deshabilitado={saliendo}
                        cargando={saliendo}
                    />
                </View>
            </Aparecer>
        </ScrollView>
    )
}

const estilos = StyleSheet.create({
    pantalla: { backgroundColor: colores.humo },
    contenido: { padding: espacio.l, paddingBottom: 40 },
    bloque: { gap: espacio.m },
    cuenta: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingHorizontal: espacio.xs, marginBottom: espacio.xs },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colores.tinta, alignItems: 'center', justifyContent: 'center' },
    flexible: { flex: 1, gap: 2 },
    seccion: { marginTop: espacio.s, marginLeft: espacio.xs },
    fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
    separada: { marginTop: espacio.m },
    aviso: { gap: espacio.s, paddingTop: espacio.xs },
    salir: { marginTop: espacio.s },
})
