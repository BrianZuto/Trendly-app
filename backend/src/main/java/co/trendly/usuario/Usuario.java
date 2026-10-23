package co.trendly.usuario;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Usuario de Trendly (tabla {@code usuario}). La contraseña solo se guarda como hash BCrypt.
 * La comparten el registro (SCRUM-30) y el login (SCRUM-31).
 */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    /** Siempre en minúsculas y sin espacios: así el email es único sin importar las mayúsculas. */
    @Column(nullable = false, length = 150, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Rol rol;

    /** Autorización de tratamiento de datos (Ley 1581 de 2012). */
    @Column(name = "acepta_politica_datos", nullable = false)
    private boolean aceptaPoliticaDatos;

    @Column(name = "fecha_aceptacion")
    private Instant fechaAceptacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @Column(nullable = false)
    private boolean activo;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    protected Usuario() {
    }

    /** Vendedor nuevo que acaba de aceptar la política de datos. */
    public static Usuario nuevoVendedor(String nombre, String email, String passwordHash, Plan plan) {
        Usuario usuario = new Usuario();
        Instant ahora = Instant.now();
        usuario.nombre = nombre;
        usuario.email = email;
        usuario.passwordHash = passwordHash;
        usuario.rol = Rol.VENDEDOR;
        usuario.aceptaPoliticaDatos = true;
        usuario.fechaAceptacion = ahora;
        usuario.plan = plan;
        usuario.activo = true;
        usuario.creadoEn = ahora;
        return usuario;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Rol getRol() {
        return rol;
    }

    public boolean isAceptaPoliticaDatos() {
        return aceptaPoliticaDatos;
    }

    public Instant getFechaAceptacion() {
        return fechaAceptacion;
    }

    public Plan getPlan() {
        return plan;
    }

    public boolean isActivo() {
        return activo;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }
}
