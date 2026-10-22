package co.trendly.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByNombre(String nombre);
}
