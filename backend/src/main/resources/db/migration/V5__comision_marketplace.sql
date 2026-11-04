-- SCRUM-46: comisión que cobra cada marketplace, para calcular el precio mínimo rentable.
-- La configura el administrador (PUT /api/v1/admin/comisiones/{marketplace}).

CREATE TABLE comision_marketplace (
    marketplace    VARCHAR(20)  NOT NULL,
    comision_pct   DECIMAL(5,2) NOT NULL,
    actualizado_en DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_comision_marketplace PRIMARY KEY (marketplace),
    CONSTRAINT ck_comision_marketplace CHECK (marketplace IN ('MERCADOLIBRE', 'ALIEXPRESS')),
    CONSTRAINT ck_comision_pct CHECK (comision_pct >= 0 AND comision_pct < 100)
);

INSERT INTO comision_marketplace (marketplace, comision_pct) VALUES
    ('MERCADOLIBRE', 15.00),
    ('ALIEXPRESS', 8.00);
