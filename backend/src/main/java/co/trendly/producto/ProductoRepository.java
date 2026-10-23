package co.trendly.producto;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    List<Producto> findByUsuarioIdOrderByIdAsc(Long usuarioId);

    /** Un producto ajeno se trata igual que uno que no existe. */
    Optional<Producto> findByIdAndUsuarioId(Long id, Long usuarioId);

    long countByUsuarioId(Long usuarioId);

    boolean existsByUsuarioIdAndSkuIgnoreCase(Long usuarioId, String sku);

    boolean existsByUsuarioIdAndSkuIgnoreCaseAndIdNot(Long usuarioId, String sku, Long id);
}
