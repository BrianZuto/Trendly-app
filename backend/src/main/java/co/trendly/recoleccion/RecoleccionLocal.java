package co.trendly.recoleccion;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Disparador local para desarrollo (SCRUM-39): con {@code trendly.scheduler.local=true} corre el mismo ciclo que la
 * Azure Function, sin depender de Azure. En producción está apagado y dispara la Function.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "trendly.scheduler.local", havingValue = "true")
public class RecoleccionLocal {

    private final RecoleccionService recoleccion;

    public RecoleccionLocal(RecoleccionService recoleccion) {
        this.recoleccion = recoleccion;
    }

    @Scheduled(cron = "${trendly.scheduler.cron:0 0 */6 * * *}", zone = "America/Bogota")
    public void disparar() {
        recoleccion.ejecutarAhora();
    }
}
