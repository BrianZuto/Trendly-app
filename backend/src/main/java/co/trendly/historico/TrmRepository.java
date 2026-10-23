package co.trendly.historico;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TrmRepository extends JpaRepository<Trm, LocalDate> {

    /** La última TRM guardada: es la que se usa si datos.gov.co no responde. */
    Optional<Trm> findFirstByOrderByVigenciaDesdeDesc();
}
