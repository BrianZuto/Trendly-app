package co.trendly.sugerencia;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.trendly.comun.ErrorDeNegocio;
import co.trendly.monitoreo.Marketplace;

/** Comisión de cada marketplace, que configura el administrador (SCRUM-46). */
@Service
public class ComisionService {

    private final ComisionMarketplaceRepository comisiones;

    public ComisionService(ComisionMarketplaceRepository comisiones) {
        this.comisiones = comisiones;
    }

    @Transactional(readOnly = true)
    public List<ComisionResponse> listar() {
        return comisiones.findAll().stream().map(ComisionResponse::de).toList();
    }

    @Transactional
    public ComisionResponse actualizar(Marketplace marketplace, BigDecimal comisionPct) {
        ComisionMarketplace comision = comisiones.findById(marketplace)
                .orElseThrow(() -> new ErrorDeNegocio(HttpStatus.NOT_FOUND, "No hay comisión para " + marketplace));
        comision.actualizar(comisionPct, Instant.now().truncatedTo(ChronoUnit.MICROS));
        return ComisionResponse.de(comision);
    }
}
