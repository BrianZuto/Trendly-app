package co.trendly.sugerencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SugerenciaPrecioRepository extends JpaRepository<SugerenciaPrecio, Long> {

    Optional<SugerenciaPrecio> findFirstByProductoIdOrderByCalculadoEnDescIdDesc(Long productoId);
}
