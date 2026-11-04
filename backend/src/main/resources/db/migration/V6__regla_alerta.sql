-- SCRUM-47: reglas de alerta de cada vendedor. Sin fila, se usan los valores por defecto (5 % y avisos de disponibilidad).
CREATE TABLE regla_alerta (
    usuario_id            BIGINT       NOT NULL,
    umbral_pct            DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    avisar_disponibilidad BOOLEAN      NOT NULL DEFAULT TRUE,
    actualizado_en        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_regla_alerta PRIMARY KEY (usuario_id),
    CONSTRAINT fk_regla_alerta_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT ck_regla_alerta_umbral CHECK (umbral_pct > 0 AND umbral_pct <= 100)
);

-- Un monitoreo por palabra clave trae varias publicaciones: la alerta dice cuál cambió.
ALTER TABLE alerta ADD COLUMN publicacion_id VARCHAR(60) NULL;
