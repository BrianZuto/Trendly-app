package co.trendly.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /** El email debe venir normalizado (minúsculas, sin espacios). */
    boolean existsByEmail(String email);

    /** El email debe venir normalizado (minúsculas, sin espacios). */
    Optional<Usuario> findByEmail(String email);
}
