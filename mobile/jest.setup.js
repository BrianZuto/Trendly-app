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
