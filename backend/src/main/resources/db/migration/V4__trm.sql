-- SCRUM-42: TRM (tasa representativa del mercado, COP por 1 USD) de la Superintendencia Financiera (datos.gov.co).
-- Se guarda cada TRM consultada: si datos.gov.co no responde, se usa la última guardada.
-- La TRM del fin de semana cubre varios días (vigencia_desde → vigencia_hasta).

CREATE TABLE trm (
    vigencia_desde DATE          NOT NULL,
    vigencia_hasta DATE          NOT NULL,
    valor          DECIMAL(10,2) NOT NULL,
    consultada_en  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_trm PRIMARY KEY (vigencia_desde),
    CONSTRAINT ck_trm_valor CHECK (valor > 0),
    CONSTRAINT ck_trm_vigencia CHECK (vigencia_hasta >= vigencia_desde)
);
