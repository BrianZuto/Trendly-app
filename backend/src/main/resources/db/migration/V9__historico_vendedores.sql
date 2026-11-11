-- SCRUM-53: ranking de tendencias.

-- Cuántos vendedores ofrecen el mismo producto de catálogo en el momento de la captura (la competencia del ranking).
-- Solo lo traen las búsquedas por palabra clave de MercadoLibre; NULL en las demás capturas y en las anteriores
ALTER TABLE historico_precio ADD COLUMN vendedores INT NULL;
