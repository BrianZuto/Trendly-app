package co.trendly.recoleccion;

import java.time.Instant;

/**
 * Lo que hizo un ciclo del job (SCRUM-39). Se registra en el log y lo devuelve el endpoint interno.
 *
 * @param procesados monitoreos que se intentaron capturar
 * @param exitosos   capturas OK (aunque el histórico no haya guardado puntos nuevos por ser duplicados)
 * @param fallidos   capturas con FALLO o sin scraper para su marketplace
 * @param puntos     puntos nuevos en el histórico
 */
public record ResumenCiclo(Instant inicio, Instant fin, int procesados, int exitosos, int fallidos, int puntos) {
}
