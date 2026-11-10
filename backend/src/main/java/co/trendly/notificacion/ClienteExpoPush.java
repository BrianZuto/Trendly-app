package co.trendly.notificacion;

import java.util.List;

/** Envía notificaciones con la Expo Push API. Detrás de una interfaz para que las pruebas no salgan a internet. */
public interface ClienteExpoPush {

    /**
     * @return un resultado por mensaje, en el mismo orden
     * @throws IllegalStateException si Expo no recibió la solicitud (red, 4xx o 5xx): los mensajes quedan sin enviar
     */
    List<ResultadoPush> enviar(List<MensajePush> mensajes);
}
