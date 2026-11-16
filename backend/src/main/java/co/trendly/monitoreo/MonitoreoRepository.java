package co.trendly.monitoreo;

import java.util.Collection;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MonitoreoRepository extends JpaRepository<Monitoreo, Long> {

    /** Lote del job (SCRUM-39): los ACTIVOS cuya próxima captura ya venció, los más atrasados primero. */
    List<Monitoreo> findByEstadoAndProximaEjecucionLessThanEqualOrderByProximaEjecucionAscIdAsc(EstadoMonitoreo estado,
            Instant hasta, Pageable lote);

    List<Monitoreo> findByProductoIdOrderByIdAsc(Long productoId);

    /** Monitoreos en ERROR que debe revisar el administrador (SCRUM-45). */
    List<Monitoreo> findByEstadoOrderByIdAsc(EstadoMonitoreo estado);

    /** Las búsquedas por palabra clave de un vendedor en un marketplace: de ahí sale el ranking de tendencias (SCRUM-53). */
    @Query("""
            SELECT m FROM Monitoreo m WHERE m.tipo = :tipo AND m.marketplace = :marketplace
            AND m.productoId IN (SELECT p.id FROM Producto p WHERE p.usuarioId = :usuarioId) ORDER BY m.id""")
    List<Monitoreo> deUsuario(@Param("usuarioId") Long usuarioId, @Param("tipo") TipoMonitoreo tipo,
            @Param("marketplace") Marketplace marketplace);

    long countByProductoId(Long productoId);

    List<Monitoreo> findByProductoIdInOrderByIdAsc(Collection<Long> productoIds);

    boolean existsByProductoIdAndMarketplaceAndIdPublicacion(Long productoId, Marketplace marketplace,
            String idPublicacion);

    /** Misma palabra clave en el mismo marketplace y producto, sin importar mayúsculas (SCRUM-37). */
    boolean existsByProductoIdAndTipoAndMarketplaceAndValorIgnoreCase(Long productoId, TipoMonitoreo tipo,
            Marketplace marketplace, String valor);
}
