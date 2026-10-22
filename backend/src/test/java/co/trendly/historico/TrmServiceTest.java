package co.trendly.historico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** TRM del día: caché de 24 h y respaldo con la última guardada (SCRUM-42). */
class TrmServiceTest {

    private ClienteTrm cliente;
    private TrmRepository repositorio;
    private final AtomicReference<Instant> ahora = new AtomicReference<>(Instant.parse("2026-10-20T15:00:00Z"));
    private TrmService servicio;

    @BeforeEach
    void preparar() {
        cliente = mock(ClienteTrm.class);
        repositorio = mock(TrmRepository.class);
        when(repositorio.save(any(Trm.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        Clock reloj = new Clock() {
            @Override
            public Instant instant() {
                return ahora.get();
            }

            @Override
            public ZoneOffset getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(java.time.ZoneId zona) {
                return this;
            }
        };
        servicio = new TrmService(cliente, repositorio, reloj);
    }

    @Test
    void consultaUnaVezYUsaLaCacheElMismoDia() {
        when(cliente.consultar(LocalDate.of(2026, 10, 20))).thenReturn(trm("2026-10-20", "3156.32"));

        assertThat(servicio.trmDelDia()).contains(new BigDecimal("3156.32"));
        ahora.set(ahora.get().plus(Duration.ofHours(3)));
        assertThat(servicio.trmDelDia()).contains(new BigDecimal("3156.32"));

        verify(cliente, times(1)).consultar(any());
        verify(repositorio).save(any(Trm.class));
    }

    @Test
    void alCambiarElDiaEnColombiaConsultaLaNueva() {
        when(cliente.consultar(LocalDate.of(2026, 10, 20))).thenReturn(trm("2026-10-20", "3156.32"));
        when(cliente.consultar(LocalDate.of(2026, 10, 21))).thenReturn(trm("2026-10-21", "3163.76"));
        servicio.trmDelDia();

        // 05:00 UTC del 21 son las 00:00 en Bogotá
        ahora.set(Instant.parse("2026-10-21T05:00:00Z"));

        assertThat(servicio.trmDelDia()).contains(new BigDecimal("3163.76"));
    }

    @Test
    void siDatosGovFallaUsaLaUltimaGuardada() {
        when(cliente.consultar(any())).thenThrow(new IllegalStateException("datos.gov.co respondió 503"));
        when(repositorio.findFirstByOrderByVigenciaDesdeDesc()).thenReturn(Optional.of(trm("2026-10-17", "3174.67")));

        assertThat(servicio.trmDelDia()).contains(new BigDecimal("3174.67"));
    }

    @Test
    void sinTrmGuardadaYSinRespuestaNoHayTrm() {
        when(cliente.consultar(any())).thenThrow(new IllegalStateException("sin red"));
        when(repositorio.findFirstByOrderByVigenciaDesdeDesc()).thenReturn(Optional.empty());

        assertThat(servicio.trmDelDia()).isEmpty();
    }

    private static Trm trm(String dia, String valor) {
        return new Trm(LocalDate.parse(dia), LocalDate.parse(dia), new BigDecimal(valor));
    }
}
