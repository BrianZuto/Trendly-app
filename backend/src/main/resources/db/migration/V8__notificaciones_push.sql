-- SCRUM-52: notificaciones push en la app móvil (Expo Push API).

-- El vendedor puede desactivar las notificaciones push desde su perfil, igual que los correos
ALTER TABLE regla_alerta ADD COLUMN recibir_push BOOLEAN NOT NULL DEFAULT TRUE;

-- Cuándo salió la notificación push de la alerta; NULL = pendiente (como enviada_correo_en)
ALTER TABLE alerta ADD COLUMN enviada_push_en DATETIME(6) NULL;

-- Celulares donde el vendedor inició sesión en la app. Un token es de un solo celular: si otro vendedor inicia sesión
-- en el mismo teléfono, el token pasa a ser suyo
CREATE TABLE dispositivo_push (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    usuario_id     BIGINT       NOT NULL,
    token          VARCHAR(200) NOT NULL,
    plataforma     VARCHAR(10)  NOT NULL,
    creado_en      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    actualizado_en DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_dispositivo_push PRIMARY KEY (id),
    CONSTRAINT uk_dispositivo_push_token UNIQUE (token),
    CONSTRAINT fk_dispositivo_push_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT ck_dispositivo_push_plataforma CHECK (plataforma IN ('IOS', 'ANDROID'))
);

CREATE INDEX ix_dispositivo_push_usuario ON dispositivo_push (usuario_id);
