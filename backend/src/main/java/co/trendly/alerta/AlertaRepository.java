package co.trendly.alerta;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlertaRepository extends JpaRepository<Alerta, Long> {

    /** Alertas recientes que todavía no salieron por correo. */
    List<Alerta> findByEnviadaCorreoEnIsNullAndCreadoEnAfterOrderByCreadoEnAscIdAsc(Instant desde);

    /** Alertas de un producto en un periodo, para el reporte (SCRUM-50). */
    List<Alerta> findByMonitoreoIdInAndCreadoEnBetweenOrderByCreadoEnAscIdAsc(Collection<Long> monitoreoIds, Instant desde,
            Instant hasta);

    /** Bandeja del vendedor (SCRUM-49): las más recientes primero. */
    List<Alerta> findByUsuarioIdOrderByCreadoEnDescIdDesc(Long usuarioId);

    List<Alerta> findByUsuarioIdAndEstadoOrderByCreadoEnDescIdDesc(Long usuarioId, EstadoAlerta estado);

    /** Una alerta de otro vendedor no existe para él (404). */
    Optional<Alerta> findByIdAndUsuarioId(Long id, Long usuarioId);

    @Modifying
    @Query("UPDATE Alerta a SET a.enviadaCorreoEn = :cuando WHERE a.id IN :ids")
    int marcarEnviadas(@Param("ids") Collection<Long> ids, @Param("cuando") Instant cuando);
}
