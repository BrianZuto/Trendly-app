package co.trendly.historico;

import java.time.LocalDate;

/** Consulta la TRM oficial. La implementación real es {@link DatosGovTrmCliente}; en las pruebas se simula. */
@FunctionalInterface
public interface ClienteTrm {

    /**
     * @param dia fecha en Colombia
     * @return la TRM vigente ese día
     * @throws IllegalStateException si el servicio no responde o la respuesta no sirve
     */
    Trm consultar(LocalDate dia);
}
