package co.trendly.notificacion;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Celular donde el vendedor inició sesión en la app, con su token de Expo Push (tabla {@code dispositivo_push}). */
@Entity
@Table(name = "dispositivo_push")
public class DispositivoPush {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 200, unique = true, updatable = false)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PlataformaDispositivo plataforma;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    protected DispositivoPush() {
    }

    DispositivoPush(Long usuarioId, String token, PlataformaDispositivo plataforma, Instant ahora) {
        this.usuarioId = usuarioId;
        this.token = token;
        this.plataforma = plataforma;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    /** El mismo celular vuelve a registrarse, quizá con otra cuenta: el token pasa al vendedor que inició sesión. */
    void asignarA(Long usuarioId, PlataformaDispositivo plataforma, Instant ahora) {
        this.usuarioId = usuarioId;
        this.plataforma = plataforma;
        this.actualizadoEn = ahora;
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getToken() {
        return token;
    }

    public PlataformaDispositivo getPlataforma() {
        return plataforma;
    }
}
