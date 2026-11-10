package co.trendly.incidencia;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import co.trendly.scraping.TipoFallo;

public interface IncidenciaRepository extends JpaRepository<IncidenciaScraping, Long> {

    List<IncidenciaScraping> findByOrderByOcurridoEnDescIdDesc(Pageable limite);

    List<IncidenciaScraping> findByTipoOrderByOcurridoEnDescIdDesc(TipoFallo tipo, Pageable limite);
}
