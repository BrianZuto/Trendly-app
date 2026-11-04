-- SCRUM-48: el vendedor puede dejar de recibir los correos de alertas (Ley 1581 de 2012).
ALTER TABLE regla_alerta ADD COLUMN recibir_correos BOOLEAN NOT NULL DEFAULT TRUE;
