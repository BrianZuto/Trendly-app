package co.trendly.monitoreo;

import java.util.Collection;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonitoreoRepository extends JpaRepository<Monitoreo, Long> {

    /** Lote del job (SCRUM-39): los ACTIVOS cuya próxima captura ya venció, los más atrasados primero. */
    List<Monitoreo> findByEstadoAndProximaEjecucionLessThanEqualOrderByProximaEjecucionAscIdAsc(EstadoMonitoreo estado,
            Instant hasta, Pageable lote);

    List<Monitoreo> findByProductoIdOrderByIdAsc(Long productoId);

    long countByProductoId(Long productoId);

    List<Monitoreo> findByProductoIdInOrderByIdAsc(Collection<Long> productoIds);

    boolean existsByProductoIdAndMarketplaceAndIdPublicacion(Long productoId, Marketplace marketplace,
            String idPublicacion);

    /** Misma palabra clave en el mismo marketplace y producto, sin importar mayúsculas (SCRUM-37). */
    boolean existsByProductoIdAndTipoAndMarketplaceAndValorIgnoreCase(Long productoId, TipoMonitoreo tipo,
            Marketplace marketplace, String valor);
}
