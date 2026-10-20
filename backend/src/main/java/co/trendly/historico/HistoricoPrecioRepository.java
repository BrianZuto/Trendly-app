package co.trendly.historico;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoricoPrecioRepository extends JpaRepository<HistoricoPrecio, Long> {

    /** ¿Ya hay una captura de esta publicación en este monitoreo después de {@code desde}? (anti duplicados) */
    boolean existsByMonitoreoIdAndPublicacionIdAndCapturadoEnAfter(Long monitoreoId, String publicacionId,
            Instant desde);

    /** Captura anterior de la misma publicación: de ahí sale el "precio anterior" del evento. */
    Optional<HistoricoPrecio> findFirstByMonitoreoIdAndPublicacionIdOrderByCapturadoEnDescIdDesc(Long monitoreoId,
            String publicacionId);

    List<HistoricoPrecio> findByMonitoreoIdAndCapturadoEnBetweenOrderByCapturadoEnAscIdAsc(Long monitoreoId,
            Instant desde, Instant hasta);
}
