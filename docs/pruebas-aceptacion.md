# Pruebas de aceptación en producción (SCRUM-54)

Recorrido de los criterios de los procesos P1, P2 y P3 sobre la versión desplegada.

- **Fecha:** 15/11/2026, de 19:17 a 19:25 (hora de Colombia).
- **Backend:** Azure Container Apps, `https://trendly-api.prouddune-5a774dac.eastus2.azurecontainerapps.io`, imagen `trendly-api:56697997bfe5` (commit `5669799` de `main`), base Azure Database for MySQL Flexible Server con las migraciones V1 a V8.
- **Web:** Vercel, `https://trendlyapp.vercel.app`.
- **Cuenta de prueba:** una cuenta nueva del plan Gratuito, creada en la prueba A-02, con un alias del correo remitente para que ningún aviso rebote. Para A-19 se creó una segunda cuenta.
- **Cómo se ejecutó:** llamadas al API de producción con el mismo token JWT que usa la web. La captura (A-20 a A-24) es un ciclo real de recolección contra MercadoLibre, lanzado con el endpoint que llama la Azure Function cada 6 horas.

**Resultado: 30 de 30 pruebas pasan.** P3 tiene dos criterios que no se pueden provocar en producción a voluntad. Están explicados en [Alertas y decisión de precio](#alertas-y-decisión-de-precio).

## Criterios de la historia

| Criterio | Resultado | Evidencia |
|---|---|---|
| La web de Vercel funciona contra el backend en Azure | Pasa | El bundle publicado (`index-CxCyQWhn.js`) llama al API de Azure, y el API responde al preflight CORS con `Access-Control-Allow-Origin: https://trendlyapp.vercel.app`. El 11/11 se recorrió la web en producción con el navegador: inicio de sesión, Panel, botón «Descargar reporte» y diálogo «Preferencias de aviso», sin errores HTTP. |
| Un merge a `main` despliega solo | Pasa | El merge del PR #46 a `main` (10/11, 01:40 UTC) disparó el workflow **CD** (01:41, success). El workflow publicó la imagen `trendly-api:56697997bfe5` y creó la revisión `trendly-api--0000005` (01:43). |
| La tabla de pruebas de aceptación está completa y los fallos quedan corregidos o documentados | Pasa | La tabla está abajo. No hubo fallos. |

## P1 · Usuarios, política de datos y productos

| # | Prueba | Esperado | Obtenido | Resultado |
|---|---|---|---|---|
| A-01 | Registro sin aceptar la política de datos (RN-02) | 400 con el mensaje de la política | 400 «Debe aceptar la política de tratamiento de datos» | Pasa |
| A-02 | Registro aceptando la política de datos | 201 y el usuario con plan Gratuito | 201, plan Gratuito (10 productos) | Pasa |
| A-03 | Registro con un correo ya usado | 409 | 409 | Pasa |
| A-04 | Inicio de sesión con contraseña incorrecta | 401 | 401 | Pasa |
| A-05 | Inicio de sesión correcto | 200 con token JWT | 200 con token | Pasa |
| A-06 | Consultar productos sin token | 401 | 401 | Pasa |
| A-07 | Registrar un producto con costo, costos extra, precio y margen objetivo | 201 con el producto | 201 | Pasa |
| A-08 | Registrar un producto con costo 0 | 400 | 400 «El costo debe ser mayor que 0» | Pasa |
| A-09 | Plan Gratuito: registrar el producto 11 (RN-01) | 422 por el cupo de 10 | 422 «Alcanzó el límite de su plan» | Pasa |
| A-10 | Eliminar un producto libera el cupo (RN-01) | 204 al eliminar y 201 al registrar otro | 204 y 201 | Pasa |
| A-11 | Listar los productos del vendedor | 200 solo con sus productos | 200, 1 producto | Pasa |
| A-19 | Otro vendedor consulta un producto ajeno | 404 | 404 | Pasa |

## P2 · Competidores y recolección de precios

| # | Prueba | Esperado | Obtenido | Resultado |
|---|---|---|---|---|
| A-12 | Agregar un competidor por URL de catálogo de MercadoLibre (`/p/MCO65122176`) | 201 con frecuencia de 6 h | 201, frecuencia 6 h | Pasa |
| A-13 | Agregar la misma publicación dos veces | 409 | 409 | Pasa |
| A-14 | Agregar una búsqueda por palabra clave («audifonos bluetooth», top 10) | 201 | 201 | Pasa |
| A-15 | Agregar una URL de MercadoLibre que no es de catálogo | 400 | 400 «No encontramos el identificador de la publicación en la URL» | Pasa |
| A-20 | El job de recolección con la API key | 202 y el ciclo en segundo plano | 202. Log: «Procesados 4, exitosos 4, fallidos 0, puntos nuevos 11» | Pasa |
| A-21 | El job de recolección con una API key inválida | 401 | 401 | Pasa |
| A-22 | Captura del competidor por URL | Histórico con el precio en COP | 1 punto: «Audífonos Inalámbricos Maxell Fly Bluetooth…», $49.900 | Pasa |
| A-23 | Captura de la búsqueda por palabra clave | Histórico con hasta 10 publicaciones y su posición | 2 puntos | Pasa |
| A-24 | El monitoreo queda con estado y fecha de la última captura | ACTIVO con `ultimaCaptura` | ACTIVO, 16/11 00:19 y 00:20 UTC | Pasa |

## P3 · Análisis, sugerencia, alertas y reportes

| # | Prueba | Esperado | Obtenido | Resultado |
|---|---|---|---|---|
| A-25 | Precio sugerido después de la captura | 200 con el sugerido según la fórmula | 200: sugerido $108.333,34, margen 25 %. Costo total 65.000 × 100 / (100 − 25 − 15) = 108.333,33; la competencia está más barata, así que manda el mínimo rentable | Pasa |
| A-16 | Consultar las preferencias de aviso | 200 con umbral 5 % y correos activos | 200, umbral 5 %, correos y push activos | Pasa |
| A-17 | Cambiar el umbral de alerta a 0,5 % | 200 con el umbral nuevo | 200, umbral 0,5 % | Pasa |
| A-18 | Umbral fuera de rango (0) | 400 | 400 | Pasa |
| A-26 | Descargar el reporte del producto en Excel | 200 con un .xlsx válido | 200, 6.151 bytes, firma `PK` de .xlsx | Pasa |
| A-27 | Descargar el reporte del producto en PDF | 200 con un PDF válido | 200, 7.614 bytes, firma `%PDF` | Pasa |
| A-28 | La web publicada usa el API de Azure | El bundle apunta a Azure | `index-CxCyQWhn.js` apunta a `…azurecontainerapps.io/api/v1` | Pasa |
| A-29 | CORS acepta la web de Vercel | `Access-Control-Allow-Origin` con el dominio de Vercel | `https://trendlyapp.vercel.app` | Pasa |
| A-30 | Alerta de cambio de precio, correo y decisión | Ver la nota de abajo | Probado con la misma versión en el ambiente de QA | Pasa (en QA) |

### Alertas y decisión de precio

Una alerta solo aparece cuando un competidor real cambia su precio entre dos capturas, y entre captura y captura pasan 6 horas. En producción eso no se puede provocar a voluntad sin alterar datos.

- **Lo que se probó en producción:** la regla de alerta se puede consultar y cambiar (A-16 a A-18), y la cuenta de prueba quedó con umbral de 0,5 % y dos monitoreos activos, así que el próximo cambio real de precio genera la alerta. El 9/11 llegó el correo automático al administrador cuando falló una captura, lo que confirma que el SMTP de producción envía correos.
- **Lo que se probó en el ambiente de QA**, con la misma imagen y forzando el precio anterior en la base, según el libro de casos ejecutados del 10/11 (55 de 55 casos pasan):
  - 7.1 y 7.2: sin alerta bajo el umbral y con alerta desde el umbral;
  - 7.3: cambio del umbral;
  - 7.4 a 7.6: correo de alerta y desactivación de los correos;
  - 8.1 a 8.6: bandeja, filtro, aceptar el sugerido, ajustar el precio y descartar con o sin motivo.
- **Pruebas automáticas:** las mismas reglas se cubren en el pipeline de cada PR (backend 352 pruebas, web 182 y móvil 34).

## Fallos y pendientes

- **Ningún fallo** en el recorrido.
- **Observación (no es un fallo del sistema):** el administrador creado por la migración V2 tiene el correo `admin@trendly.co`, que no existe, y los avisos de incidencias que se le envían rebotan. Hay que cambiar ese correo por uno real en la base de producción.
- **SCRUM-53 (ranking de tendencias)** está en `develop` y llega a producción con el próximo merge a `main`. Allí se comprueba `GET /api/v1/tendencias`.
