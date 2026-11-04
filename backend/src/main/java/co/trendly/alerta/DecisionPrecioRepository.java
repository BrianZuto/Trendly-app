package co.trendly.alerta;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionPrecioRepository extends JpaRepository<DecisionPrecio, Long> {

    List<DecisionPrecio> findByAlertaIdIn(Collection<Long> alertaIds);
}
