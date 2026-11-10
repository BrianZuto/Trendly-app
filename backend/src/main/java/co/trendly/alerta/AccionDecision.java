package co.trendly.alerta;

/** Qué hizo el vendedor con una alerta (SCRUM-49). */
public enum AccionDecision {
    /** Pone el precio sugerido de la alerta. */
    ACEPTAR,
    /** Pone un precio elegido por el vendedor. */
    AJUSTAR,
    /** Deja el precio como está; exige un motivo. */
    DESCARTAR
}
