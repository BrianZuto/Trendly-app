package co.trendly.usuario;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Plan de suscripción (tabla {@code plan}). Los planes se cargan con Flyway en {@code V2__datos_iniciales.sql}. */
@Entity
@Table(name = "plan")
public class Plan {

    /** Plan que recibe todo vendedor nuevo (SCRUM-30). */
    public static final String GRATUITO = "Gratuito";

    /** Único plan que puede bajar la frecuencia de los monitoreos (SCRUM-36). */
    public static final String PRO = "Pro";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, unique = true)
    private String nombre;

    @Column(name = "max_productos", nullable = false)
    private int maxProductos;

    @Column(name = "precio_simulado", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioSimulado;

    protected Plan() {
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public int getMaxProductos() {
        return maxProductos;
    }

    public BigDecimal getPrecioSimulado() {
        return precioSimulado;
    }
}
