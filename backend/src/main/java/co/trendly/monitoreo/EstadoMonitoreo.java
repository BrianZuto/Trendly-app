package co.trendly.monitoreo;

/** ACTIVO y PAUSADO los elige el vendedor; ERROR lo pone el job tras 3 fallos seguidos (SCRUM-45). */
public enum EstadoMonitoreo {
    ACTIVO,
    PAUSADO,
    ERROR
}
