package co.trendly.alerta;

import java.math.BigDecimal;

public record ReglaAlertaResponse(BigDecimal umbralPct, boolean avisarDisponibilidad, boolean recibirCorreos) {

    static ReglaAlertaResponse de(ReglaAlerta regla) {
        return new ReglaAlertaResponse(regla.getUmbralPct(), regla.isAvisarDisponibilidad(), regla.isRecibirCorreos());
    }
}
