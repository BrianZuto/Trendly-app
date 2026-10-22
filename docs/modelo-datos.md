# Modelo de datos de Trendly

_SCRUM-29 · Responsable: Raquel López._ El esquema se crea con Flyway en [`backend/src/main/resources/db/migration`](../backend/src/main/resources/db/migration): `V1__esquema_inicial.sql` (tablas) y `V2__datos_iniciales.sql` (planes y administrador). Imagen: [`modelo-datos.png`](modelo-datos.png).

```mermaid
erDiagram
    plan ||--o{ usuario : "tiene"
    usuario ||--o{ producto : "registra"
    producto ||--o{ monitoreo : "vigila con"
    monitoreo ||--o{ historico_precio : "captura"
    monitoreo ||--o{ incidencia_scraping : "registra fallos"
    producto ||--o{ sugerencia_precio : "recibe"
    monitoreo ||--o{ alerta : "dispara"
    usuario ||--o{ alerta : "recibe"
    alerta ||--o| decision_precio : "se resuelve con"
    producto ||--o{ decision_precio : "actualiza precio"

    plan {
        BIGINT id PK
        VARCHAR nombre UK
        INT max_productos
        DECIMAL precio_simulado
    }
    usuario {
        BIGINT id PK
        VARCHAR nombre
        VARCHAR email UK
        VARCHAR password_hash "BCrypt"
        VARCHAR rol "ADMIN | VENDEDOR"
        BOOLEAN acepta_politica_datos
        DATETIME fecha_aceptacion
        BIGINT plan_id FK
        BOOLEAN activo
        DATETIME creado_en
    }
    producto {
        BIGINT id PK
        BIGINT usuario_id FK
        VARCHAR nombre
        VARCHAR sku "único por usuario"
        DECIMAL costo "mayor a 0"
        DECIMAL precio_venta "mayor a 0"
        DECIMAL margen_objetivo "0 a 100"
        DATETIME creado_en
    }
    monitoreo {
        BIGINT id PK
        BIGINT producto_id FK
        VARCHAR tipo "URL | PALABRA_CLAVE"
        VARCHAR valor
        VARCHAR marketplace "MERCADOLIBRE | ALIEXPRESS"
        INT top_n "1 a 10"
        INT frecuencia_horas
        VARCHAR estado "ACTIVO | PAUSADO | ERROR"
        INT fallos_consecutivos
        DATETIME proxima_ejecucion
        DATETIME ultima_captura
        DATETIME creado_en
    }
    historico_precio {
        BIGINT id PK
        BIGINT monitoreo_id FK
        VARCHAR publicacion_id
        VARCHAR titulo
        VARCHAR vendedor
        INT posicion
        DECIMAL precio
        CHAR moneda
        DECIMAL precio_cop
        BOOLEAN disponible
        VARCHAR fuente
        DATETIME capturado_en
    }
    incidencia_scraping {
        BIGINT id PK
        BIGINT monitoreo_id FK
        VARCHAR tipo "TIMEOUT | BLOQUEO | NO_ENCONTRADO | ESTRUCTURA | DATO_INVALIDO"
        VARCHAR detalle
        INT intentos
        DATETIME ocurrido_en
    }
    sugerencia_precio {
        BIGINT id PK
        BIGINT producto_id FK
        DECIMAL precio_min_competencia
        DECIMAL precio_prom_competencia
        DECIMAL precio_mediana_competencia
        DECIMAL precio_minimo_rentable
        DECIMAL precio_sugerido
        DECIMAL margen_resultante
        VARCHAR posicion "MAS_BARATO | EN_RANGO | MAS_CARO"
        BOOLEAN competitivo
        VARCHAR estado "CALCULADA | PENDIENTE"
        DATETIME calculado_en
    }
    alerta {
        BIGINT id PK
        BIGINT monitoreo_id FK
        BIGINT usuario_id FK
        VARCHAR tipo "BAJA_PRECIO | SUBIDA_PRECIO | AGOTADO | DISPONIBLE"
        VARCHAR relevancia "NORMAL | ALTA"
        DECIMAL precio_anterior
        DECIMAL precio_nuevo
        DECIMAL variacion_pct
        DECIMAL precio_sugerido
        VARCHAR estado "NUEVA | LEIDA | CERRADA"
        DATETIME enviada_correo_en
        DATETIME creado_en
    }
    decision_precio {
        BIGINT id PK
        BIGINT alerta_id FK "UK"
        BIGINT producto_id FK
        VARCHAR accion "ACEPTAR | AJUSTAR | DESCARTAR"
        DECIMAL precio_anterior
        DECIMAL precio_final
        VARCHAR motivo
        DATETIME decidido_en
    }
```

## Decisiones de diseño

- **Enumerados como `VARCHAR` + `CHECK`**, no `ENUM` de MySQL: se mapean directo con `@Enumerated(EnumType.STRING)` y agregar un valor solo exige una migración nueva que cambie el `CHECK`.
- **Montos en `DECIMAL(14,2)`** (nunca `FLOAT`), en COP. `historico_precio` guarda también el precio y la moneda originales. Los porcentajes (`margen_objetivo`, `variacion_pct`) van de 0 a 100.
- **Fechas en UTC** con `DATETIME(6)`. El contenedor de MySQL y Hibernate están configurados en UTC.
- **Borrado en cascada** desde `usuario` y `producto`: al borrar un producto se van sus monitoreos, histórico, alertas y decisiones.
- `alerta.usuario_id` está desnormalizado (se podría llegar por monitoreo → producto → usuario) para que la bandeja del vendedor (`GET /alertas?estado=`) sea una sola consulta con índice.
- `decision_precio.alerta_id` es único: cada alerta se decide una sola vez.
- **Índices** para las consultas frecuentes: monitoreos vencidos (`estado, proxima_ejecucion`), histórico por monitoreo y fecha, y alertas por usuario y estado.

## Pendiente para migraciones futuras

No van en V1 porque sus historias aún no definen los campos. Cada una se agrega como `V3__...`, `V4__...` (nunca se edita una migración ya integrada):

- Ciclos de recolección (SCRUM-39): inicio, fin, procesados, exitosos y fallidos.
- Reglas de alerta por vendedor (SCRUM-47): umbral de variación (5 % por defecto) y avisos de disponibilidad.
- Comisión por marketplace, configurable por el administrador (SCRUM-46).
- Dispositivos para notificaciones push (SCRUM-52).
- Caché de la TRM (SCRUM-42).

## Datos iniciales

| Tabla | Datos |
|---|---|
| `plan` | Gratuito (10 productos, $0) y Pro (100 productos, $49.900 simulado) |
| `usuario` | `admin@trendly.co` / `Trendly123`, rol ADMIN, plan Pro. Es el mismo del API simulado del frontend. |
