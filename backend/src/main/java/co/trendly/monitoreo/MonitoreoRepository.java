package co.trendly.monitoreo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MonitoreoRepository extends JpaRepository<Monitoreo, Long> {

    List<Monitoreo> findByProductoIdOrderByIdAsc(Long productoId);

    long countByProductoId(Long productoId);

    boolean existsByProductoIdAndMarketplaceAndIdPublicacion(Long productoId, Marketplace marketplace,
            String idPublicacion);
}
