package co.trendly.notificacion;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DispositivoPushRepository extends JpaRepository<DispositivoPush, Long> {

    Optional<DispositivoPush> findByToken(String token);

    List<DispositivoPush> findByUsuarioIdIn(Collection<Long> usuarioIds);

    /** Al cerrar sesión: solo el dueño puede quitar su celular. */
    @Modifying
    @Query("DELETE FROM DispositivoPush d WHERE d.token = :token AND d.usuarioId = :usuarioId")
    int borrarDeUsuario(@Param("token") String token, @Param("usuarioId") Long usuarioId);

    /** Expo avisó que el token ya no existe (la app se desinstaló o se revocó el permiso). */
    @Modifying
    @Query("DELETE FROM DispositivoPush d WHERE d.token IN :tokens")
    int borrarTokens(@Param("tokens") Collection<String> tokens);
}
