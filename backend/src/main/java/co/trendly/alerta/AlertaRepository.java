package co.trendly.alerta;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlertaRepository extends JpaRepository<Alerta, Long> {

    /** Alertas recientes que todavía no salieron por correo. */
    List<Alerta> findByEnviadaCorreoEnIsNullAndCreadoEnAfterOrderByCreadoEnAscIdAsc(Instant desde);

    @Modifying
    @Query("UPDATE Alerta a SET a.enviadaCorreoEn = :cuando WHERE a.id IN :ids")
    int marcarEnviadas(@Param("ids") Collection<Long> ids, @Param("cuando") Instant cuando);
}
