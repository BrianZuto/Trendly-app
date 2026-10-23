-- SCRUM-29: datos iniciales.

INSERT INTO plan (id, nombre, max_productos, precio_simulado) VALUES
    (1, 'Gratuito', 10, 0),
    (2, 'Pro', 100, 49900);

-- Administrador inicial: admin@trendly.co / Trendly123 (BCrypt, costo 10).
-- Es el mismo usuario del API simulado del frontend. Cambiar la contraseña fuera de desarrollo.
INSERT INTO usuario (nombre, email, password_hash, rol, acepta_politica_datos, fecha_aceptacion, plan_id, activo) VALUES
    ('Administrador Trendly', 'admin@trendly.co',
     '$2a$10$aODKiYgqZf6s9eJVxgLW3.yMijqgTYDJ9TEFhs3tFco37/j0.cEmG',
     'ADMIN', TRUE, CURRENT_TIMESTAMP(6), 2, TRUE);
