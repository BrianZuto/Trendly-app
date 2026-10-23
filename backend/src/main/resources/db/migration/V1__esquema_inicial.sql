-- SCRUM-29: esquema inicial de Trendly (MySQL 8).
-- Los enumerados se guardan como VARCHAR + CHECK para mapearlos con @Enumerated(EnumType.STRING).
-- Las fechas se guardan en UTC. Los montos en COP usan DECIMAL(14,2); los porcentajes van de 0 a 100.

-- ---------------------------------------------------------------------------
-- Usuarios y planes (S2)
-- ---------------------------------------------------------------------------

CREATE TABLE plan (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(50)   NOT NULL,
    max_productos   INT           NOT NULL,
    precio_simulado DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT pk_plan PRIMARY KEY (id),
    CONSTRAINT uk_plan_nombre UNIQUE (nombre),
    CONSTRAINT ck_plan_max_productos CHECK (max_productos > 0),
    CONSTRAINT ck_plan_precio CHECK (precio_simulado >= 0)
);

CREATE TABLE usuario (
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    nombre                VARCHAR(100) NOT NULL,
    email                 VARCHAR(150) NOT NULL,
    password_hash         VARCHAR(100) NOT NULL,
    rol                   VARCHAR(20)  NOT NULL DEFAULT 'VENDEDOR',
    acepta_politica_datos BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_aceptacion      DATETIME(6)  NULL,
    plan_id               BIGINT       NOT NULL,
    activo                BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_usuario PRIMARY KEY (id),
    CONSTRAINT uk_usuario_email UNIQUE (email),
    CONSTRAINT fk_usuario_plan FOREIGN KEY (plan_id) REFERENCES plan (id),
    CONSTRAINT ck_usuario_rol CHECK (rol IN ('ADMIN', 'VENDEDOR'))
);

-- ---------------------------------------------------------------------------
-- Proceso 1: productos propios y monitoreos de la competencia (S2-S3)
-- ---------------------------------------------------------------------------

CREATE TABLE producto (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    usuario_id      BIGINT        NOT NULL,
    nombre          VARCHAR(150)  NOT NULL,
    sku             VARCHAR(60)   NULL,
    costo           DECIMAL(14,2) NOT NULL,
    precio_venta    DECIMAL(14,2) NOT NULL,
    margen_objetivo DECIMAL(5,2)  NOT NULL,
    creado_en       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_producto PRIMARY KEY (id),
    -- SKU único por vendedor (varios productos sin SKU sí se permiten)
    CONSTRAINT uk_producto_usuario_sku UNIQUE (usuario_id, sku),
    CONSTRAINT fk_producto_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT ck_producto_costo CHECK (costo > 0),
    CONSTRAINT ck_producto_precio CHECK (precio_venta > 0),
    CONSTRAINT ck_producto_margen CHECK (margen_objetivo BETWEEN 0 AND 100)
);

CREATE TABLE monitoreo (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    producto_id         BIGINT       NOT NULL,
    tipo                VARCHAR(20)  NOT NULL,
    -- URL de la publicación o palabra clave de búsqueda
    valor               VARCHAR(500) NOT NULL,
    marketplace         VARCHAR(20)  NOT NULL,
    -- Solo para PALABRA_CLAVE: cuántas publicaciones de la búsqueda se capturan (SCRUM-37)
    top_n               INT          NULL,
    frecuencia_horas    INT          NOT NULL DEFAULT 6,
    estado              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO',
    -- Ciclos seguidos con fallo; al llegar a 3 pasa a ERROR (SCRUM-45)
    fallos_consecutivos INT          NOT NULL DEFAULT 0,
    proxima_ejecucion   DATETIME(6)  NULL,
    ultima_captura      DATETIME(6)  NULL,
    creado_en           DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_monitoreo PRIMARY KEY (id),
    CONSTRAINT fk_monitoreo_producto FOREIGN KEY (producto_id) REFERENCES producto (id) ON DELETE CASCADE,
    CONSTRAINT ck_monitoreo_tipo CHECK (tipo IN ('URL', 'PALABRA_CLAVE')),
    CONSTRAINT ck_monitoreo_marketplace CHECK (marketplace IN ('MERCADOLIBRE', 'ALIEXPRESS')),
    CONSTRAINT ck_monitoreo_estado CHECK (estado IN ('ACTIVO', 'PAUSADO', 'ERROR')),
    CONSTRAINT ck_monitoreo_frecuencia CHECK (frecuencia_horas > 0),
    CONSTRAINT ck_monitoreo_top_n CHECK (top_n IS NULL OR top_n BETWEEN 1 AND 10)
);

-- El job de recolección busca los monitoreos ACTIVOS cuya próxima ejecución ya venció (SCRUM-39)
CREATE INDEX ix_monitoreo_estado_proxima ON monitoreo (estado, proxima_ejecucion);

-- ---------------------------------------------------------------------------
-- Proceso 2: histórico de precios, incidencias y sugerencias (S3-S4)
-- ---------------------------------------------------------------------------

CREATE TABLE historico_precio (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    monitoreo_id   BIGINT        NOT NULL,
    -- Identificador de la publicación en el marketplace; permite comparar la misma publicación entre capturas
    publicacion_id VARCHAR(60)   NULL,
    titulo         VARCHAR(300)  NULL,
    vendedor       VARCHAR(150)  NULL,
    -- Posición en los resultados de búsqueda (solo PALABRA_CLAVE)
    posicion       INT           NULL,
    precio         DECIMAL(14,2) NOT NULL,
    moneda         CHAR(3)       NOT NULL,
    precio_cop     DECIMAL(14,2) NOT NULL,
    disponible     BOOLEAN       NOT NULL DEFAULT TRUE,
    fuente         VARCHAR(30)   NULL,
    capturado_en   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_historico_precio PRIMARY KEY (id),
    CONSTRAINT fk_historico_monitoreo FOREIGN KEY (monitoreo_id) REFERENCES monitoreo (id) ON DELETE CASCADE,
    CONSTRAINT ck_historico_precio CHECK (precio > 0 AND precio_cop > 0)
);

CREATE INDEX ix_historico_monitoreo_fecha ON historico_precio (monitoreo_id, capturado_en);
CREATE INDEX ix_historico_publicacion ON historico_precio (monitoreo_id, publicacion_id, capturado_en);

CREATE TABLE incidencia_scraping (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    monitoreo_id BIGINT        NOT NULL,
    tipo         VARCHAR(20)   NOT NULL,
    detalle      VARCHAR(1000) NULL,
    intentos     INT           NOT NULL DEFAULT 1,
    ocurrido_en  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_incidencia_scraping PRIMARY KEY (id),
    CONSTRAINT fk_incidencia_monitoreo FOREIGN KEY (monitoreo_id) REFERENCES monitoreo (id) ON DELETE CASCADE,
    CONSTRAINT ck_incidencia_tipo CHECK (tipo IN ('TIMEOUT', 'BLOQUEO', 'NO_ENCONTRADO', 'ESTRUCTURA', 'DATO_INVALIDO'))
);

CREATE INDEX ix_incidencia_fecha ON incidencia_scraping (ocurrido_en);

CREATE TABLE sugerencia_precio (
    id                     BIGINT        NOT NULL AUTO_INCREMENT,
    producto_id            BIGINT        NOT NULL,
    precio_min_competencia DECIMAL(14,2) NULL,
    precio_prom_competencia DECIMAL(14,2) NULL,
    precio_mediana_competencia DECIMAL(14,2) NULL,
    precio_minimo_rentable DECIMAL(14,2) NULL,
    precio_sugerido        DECIMAL(14,2) NULL,
    margen_resultante      DECIMAL(5,2)  NULL,
    -- Posición del producto frente a la competencia
    posicion               VARCHAR(20)   NULL,
    -- FALSE = "no competitivo con el margen objetivo" (SCRUM-46)
    competitivo            BOOLEAN       NULL,
    -- PENDIENTE cuando no hay histórico suficiente
    estado                 VARCHAR(20)   NOT NULL DEFAULT 'CALCULADA',
    calculado_en           DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_sugerencia_precio PRIMARY KEY (id),
    CONSTRAINT fk_sugerencia_producto FOREIGN KEY (producto_id) REFERENCES producto (id) ON DELETE CASCADE,
    CONSTRAINT ck_sugerencia_posicion CHECK (posicion IS NULL OR posicion IN ('MAS_BARATO', 'EN_RANGO', 'MAS_CARO')),
    CONSTRAINT ck_sugerencia_estado CHECK (estado IN ('CALCULADA', 'PENDIENTE'))
);

CREATE INDEX ix_sugerencia_producto_fecha ON sugerencia_precio (producto_id, calculado_en);

-- ---------------------------------------------------------------------------
-- Proceso 3: alertas y decisiones de precio (S4)
-- ---------------------------------------------------------------------------

CREATE TABLE alerta (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    monitoreo_id      BIGINT        NOT NULL,
    -- Dueño de la alerta (desnormalizado para la bandeja del vendedor)
    usuario_id        BIGINT        NOT NULL,
    tipo              VARCHAR(20)   NOT NULL,
    relevancia        VARCHAR(10)   NOT NULL DEFAULT 'NORMAL',
    precio_anterior   DECIMAL(14,2) NULL,
    precio_nuevo      DECIMAL(14,2) NULL,
    variacion_pct     DECIMAL(7,2)  NULL,
    precio_sugerido   DECIMAL(14,2) NULL,
    estado            VARCHAR(20)   NOT NULL DEFAULT 'NUEVA',
    enviada_correo_en DATETIME(6)   NULL,
    creado_en         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_alerta PRIMARY KEY (id),
    CONSTRAINT fk_alerta_monitoreo FOREIGN KEY (monitoreo_id) REFERENCES monitoreo (id) ON DELETE CASCADE,
    CONSTRAINT fk_alerta_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT ck_alerta_tipo CHECK (tipo IN ('BAJA_PRECIO', 'SUBIDA_PRECIO', 'AGOTADO', 'DISPONIBLE')),
    CONSTRAINT ck_alerta_relevancia CHECK (relevancia IN ('NORMAL', 'ALTA')),
    CONSTRAINT ck_alerta_estado CHECK (estado IN ('NUEVA', 'LEIDA', 'CERRADA'))
);

CREATE INDEX ix_alerta_usuario_estado ON alerta (usuario_id, estado, creado_en);

CREATE TABLE decision_precio (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    alerta_id       BIGINT        NOT NULL,
    producto_id     BIGINT        NOT NULL,
    accion          VARCHAR(20)   NOT NULL,
    precio_anterior DECIMAL(14,2) NULL,
    precio_final    DECIMAL(14,2) NULL,
    motivo          VARCHAR(500)  NULL,
    decidido_en     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_decision_precio PRIMARY KEY (id),
    -- Una alerta se decide una sola vez
    CONSTRAINT uk_decision_alerta UNIQUE (alerta_id),
    CONSTRAINT fk_decision_alerta FOREIGN KEY (alerta_id) REFERENCES alerta (id) ON DELETE CASCADE,
    CONSTRAINT fk_decision_producto FOREIGN KEY (producto_id) REFERENCES producto (id) ON DELETE CASCADE,
    CONSTRAINT ck_decision_accion CHECK (accion IN ('ACEPTAR', 'AJUSTAR', 'DESCARTAR'))
);
