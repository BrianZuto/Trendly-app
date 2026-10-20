-- SCRUM-36: identificador de la publicación vigilada por URL (MCO-… en MercadoLibre, número del ítem en AliExpress).
-- Con él se detecta el competidor repetido aunque la URL cambie (parámetros, título, subdominio).
-- Los monitoreos por palabra clave lo dejan en NULL, y MySQL permite varios NULL en un índice único.

ALTER TABLE monitoreo ADD COLUMN id_publicacion VARCHAR(60) NULL;

ALTER TABLE monitoreo
    ADD CONSTRAINT uk_monitoreo_publicacion UNIQUE (producto_id, marketplace, id_publicacion);
