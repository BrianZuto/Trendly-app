package co.trendly.recoleccion;

/** Evento interno: en un ciclo falló más del 10 % de los monitoreos (SCRUM-45). */
public record CicloConMuchosFallos(ResumenCiclo resumen) {
}
