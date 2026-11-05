package co.trendly.notificacion;

/**
 * Lo que respondió Expo para un mensaje (su "push ticket").
 *
 * @param token token al que iba el mensaje
 * @param ok    Expo lo aceptó (no garantiza que el celular ya lo haya mostrado)
 * @param error código de Expo cuando no lo aceptó, p. ej. {@code DeviceNotRegistered}
 */
public record ResultadoPush(String token, boolean ok, String error) {

    static final String DISPOSITIVO_NO_REGISTRADO = "DeviceNotRegistered";

    /** El celular ya no existe para Expo: hay que dejar de enviarle. */
    public boolean dispositivoNoRegistrado() {
        return DISPOSITIVO_NO_REGISTRADO.equals(error);
    }
}
