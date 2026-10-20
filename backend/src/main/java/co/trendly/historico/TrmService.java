package co.trendly.historico;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * TRM del día con caché de 24 horas (SCRUM-42). Cada TRM consultada se guarda en la tabla {@code trm};
 * si datos.gov.co falla, se usa la última guardada.
 */
@Service
public class TrmService {

    private static final Logger log = LoggerFactory.getLogger(TrmService.class);
    private static final ZoneId COLOMBIA = ZoneId.of("America/Bogota");
    static final Duration VIGENCIA_CACHE = Duration.ofHours(24);

    private final ClienteTrm cliente;
    private final TrmRepository repositorio;
    private final Clock reloj;

    private BigDecimal enCache;
    private LocalDate diaEnCache;
    private Instant cargadaEn;

    @Autowired
    public TrmService(ClienteTrm cliente, TrmRepository repositorio) {
        this(cliente, repositorio, Clock.systemUTC());
    }

    TrmService(ClienteTrm cliente, TrmRepository repositorio, Clock reloj) {
        this.cliente = cliente;
        this.repositorio = repositorio;
        this.reloj = reloj;
    }

    /** Pesos por 1 dólar; vacío solo si datos.gov.co falla y nunca se ha guardado una TRM. */
    public synchronized Optional<BigDecimal> trmDelDia() {
        Instant ahora = reloj.instant();
        LocalDate hoy = LocalDate.ofInstant(ahora, COLOMBIA);
        if (enCache != null && hoy.equals(diaEnCache) && Duration.between(cargadaEn, ahora).compareTo(VIGENCIA_CACHE) < 0) {
            return Optional.of(enCache);
        }
        try {
            Trm trm = repositorio.save(cliente.consultar(hoy));
            enCache = trm.getValor();
            diaEnCache = hoy;
            cargadaEn = ahora;
            return Optional.of(enCache);
        } catch (RuntimeException e) {
            Optional<Trm> ultima = repositorio.findFirstByOrderByVigenciaDesdeDesc();
            log.warn("No se pudo consultar la TRM ({}). Se usa la última guardada: {}", e.getMessage(),
                    ultima.map(t -> t.getValor() + " del " + t.getVigenciaDesde()).orElse("ninguna"));
            return ultima.map(Trm::getValor);
        }
    }
}
