package co.trendly.sugerencia;

import org.springframework.data.jpa.repository.JpaRepository;

import co.trendly.monitoreo.Marketplace;

public interface ComisionMarketplaceRepository extends JpaRepository<ComisionMarketplace, Marketplace> {
}
