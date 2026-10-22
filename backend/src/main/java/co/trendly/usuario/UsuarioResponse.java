package co.trendly.usuario;

/** Datos públicos de un usuario. Nunca incluye la contraseña. */
public record UsuarioResponse(Long id, String nombre, String email, Rol rol, PlanResponse plan) {

    public record PlanResponse(Long id, String nombre, int maxProductos) {
    }

    public static UsuarioResponse de(Usuario usuario) {
        Plan plan = usuario.getPlan();
        return new UsuarioResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail(), usuario.getRol(),
                new PlanResponse(plan.getId(), plan.getNombre(), plan.getMaxProductos()));
    }
}
