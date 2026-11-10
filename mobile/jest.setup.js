// SecureStore no existe en Node: se reemplaza por un almacén en memoria que cada prueba puede revisar
jest.mock('expo-secure-store', () => {
    const almacen = new Map()
    return {
        __almacen: almacen,
        getItemAsync: jest.fn(async (clave) => (almacen.has(clave) ? almacen.get(clave) : null)),
        setItemAsync: jest.fn(async (clave, valor) => {
            almacen.set(clave, valor)
        }),
        deleteItemAsync: jest.fn(async (clave) => {
            almacen.delete(clave)
        }),
    }
})

// La vibración no existe en Node; se registra para poder revisarla en las pruebas
jest.mock('expo-haptics', () => ({
    selectionAsync: jest.fn(async () => {}),
    notificationAsync: jest.fn(async () => {}),
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// Notificaciones (SCRUM-52): un doble que entrega un token fijo y deja simular que el vendedor toca una notificación
jest.mock('expo-device', () => ({ isDevice: true }))
jest.mock('expo-notifications', () => {
    const oyentes = new Set()
    const respuesta = (url) => ({
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification: { request: { content: { data: { url } } } },
    })
    return {
        __respuesta: respuesta,
        __tocar: (url) => oyentes.forEach((oyente) => oyente(respuesta(url))),
        setNotificationHandler: jest.fn(),
        setNotificationChannelAsync: jest.fn(async () => null),
        getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
        requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
        getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: 'ExponentPushToken[prueba]' })),
        getLastNotificationResponseAsync: jest.fn(async () => null),
        clearLastNotificationResponseAsync: jest.fn(async () => {}),
        addNotificationResponseReceivedListener: jest.fn((oyente) => {
            oyentes.add(oyente)
            return { remove: () => oyentes.delete(oyente) }
        }),
        AndroidImportance: { HIGH: 4 },
    }
})
