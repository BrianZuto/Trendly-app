# Trendly · Sprint 4: Análisis y Proceso 3

**Fechas:** 22/10/2026 – 04/11/2026 · **Historias:** 8 · **Estimación:** 32 puntos · **Jira:** espacio Trendly (SCRUM)

**Objetivo del sprint:** precio sugerido, detección de cambios, alertas por correo y push, registro de decisiones, reportes y app móvil.

## Resumen

| Clave | Historia | Responsable | Pts | Depende de |
|---|---|---|---|---|
| SCRUM-45 | Validar dato, reintentos y marcar para revisión | Raquel | 3 | 40, 41, 42 |
| SCRUM-46 | Precio y margen sugeridos | Brian | 5 | 42 |
| SCRUM-47 | Detectar cambios según umbral | Brian | 3 | 42, 46 |
| SCRUM-48 | Alertas por correo | Brian | 3 | 47 |
| SCRUM-49 | Bandeja de alertas y decisión de precio | Juan David | 5 | 46, 47 |
| SCRUM-50 | Reportes en Excel y PDF | Raquel | 5 | 42, 46, 49 |
| SCRUM-51 | App móvil: login y dashboards | Juan David | 5 | 31, 42 |
| SCRUM-52 | Notificaciones push | Juan David | 3 | 48, 51 |

**Carga:** Brian 11 pts · Raquel 8 pts · Juan David 13 pts.

## Historias de usuario

### SCRUM-45 · Validar dato extraído, reintentos y marcar producto para revisión

**Responsable:** Raquel · 3 pts · Épica: Recolección y análisis de precios (Proceso 2)

**Objetivo**

Que un dato malo o un fallo del sitio no contamine el histórico ni genere alertas falsas. Son las ramas de error del Proceso 2.

**Qué hacer**

- **Reintentos** con Resilience4j Retry: hasta 3 intentos con espera exponencial (2 s, 4 s y 8 s), solo para timeout, errores 5xx y 429.
- **Validar el dato** antes de guardarlo:
  - el precio es numérico y mayor que 0;
  - la moneda es la esperada;
  - están los campos obligatorios;
  - la variación frente al dato anterior no supera ±70 %. Si la supera, se marca como **sospechoso** y se descarta.
- Cuando se agotan los reintentos o el dato se descarta, se registra en `incidencia_scraping` con su tipo: TIMEOUT, BLOQUEO, NO_ENCONTRADO, ESTRUCTURA o DATO_INVALIDO.
- Tras 3 ciclos seguidos con fallo, el monitoreo pasa a estado **ERROR** para que lo revise el administrador.
- Crear `GET /api/v1/admin/incidencias`, solo para ADMIN.
- Si en un ciclo fallan más del 10 % de los monitoreos, registrar una advertencia y avisar al administrador.

**Criterios de aceptación**

- [ ] Un timeout se reintenta 3 veces antes de registrarse como incidencia.
- [ ] Un precio de 0 o con una variación del 90 % no entra al histórico y queda como incidencia.
- [ ] El administrador ve las incidencias y los monitoreos en ERROR.

**Depende de:** SCRUM-40, 41 y 42.

---

### SCRUM-46 · Calcular precio y margen sugeridos comparando plataformas

**Responsable:** Brian · 5 pts · Épica: Recolección y análisis de precios (Proceso 2)

**Objetivo**

Convertir el histórico en una recomendación de precio que respete el margen objetivo del vendedor.

**Qué hacer**

- Escuchar el evento **PrecioActualizado** (SCRUM-42) de forma asíncrona.
- Verificar que haya **histórico suficiente**: al menos 2 capturas de la competencia en los últimos 7 días. Si no las hay, el análisis queda **pendiente** hasta el próximo ciclo.
- Calcular, en COP: precio mínimo, promedio y mediana de la competencia.
- **Precio mínimo rentable** = costo ÷ (1 − margen objetivo − comisión del marketplace). La comisión de cada marketplace la configura el administrador.
- **Regla del precio sugerido:**
  - Si el mínimo de la competencia es mayor o igual al precio mínimo rentable, sugerir el mínimo de la competencia × 0,99: el más barato sin perder margen.
  - Si no, sugerir el precio mínimo rentable y marcar "no competitivo con el margen objetivo".
- Calcular el margen resultante y la posición del producto: más barato, en rango o más caro.
- Guardar en `sugerencia_precio` y crear `GET /api/v1/productos/{id}/sugerencia`. Los precios se manejan con IVA incluido.
- Escribir pruebas unitarias con una tabla de casos: competencia barata, competencia cara, sin datos y margen imposible.

**Criterios de aceptación**

- [ ] Con datos de prueba, el precio sugerido coincide con el cálculo a mano.
- [ ] Con menos de 2 capturas, el análisis queda pendiente.
- [ ] El endpoint devuelve el sugerido, el margen resultante y la posición.

**Depende de:** SCRUM-42 (histórico y evento).

---

### SCRUM-47 · Detectar cambios de precio o disponibilidad según umbral

**Responsable:** Brian · 3 pts · Épica: Alertas, reportes y toma de decisiones (Proceso 3)

**Objetivo**

Decidir cuándo un cambio del mercado merece una alerta. Es el inicio del Proceso 3.

**Qué hacer**

- Crear las reglas de alerta de cada vendedor: umbral de variación en % (5 % por defecto) y si quiere avisos de cambios de disponibilidad. Endpoint `PUT /api/v1/usuarios/me/reglas-alerta`.
- Después de cada captura nueva, comparar con la anterior de la misma publicación.
- Si la variación absoluta es mayor o igual al umbral, o cambió la disponibilidad:
  - crear una **alerta** de tipo BAJA_PRECIO, SUBIDA_PRECIO, AGOTADO o DISPONIBLE;
  - la alerta incluye el precio anterior, el nuevo, la variación y el precio sugerido de SCRUM-46;
  - su relevancia es **ALTA** si la variación es de al menos el doble del umbral.
- Evitar duplicados: máximo 1 alerta por monitoreo en cada ciclo.
- Pruebas con casos: variación por debajo del umbral, exactamente igual al umbral, agotado y otra vez disponible.

**Criterios de aceptación**

- [ ] Una variación por debajo del umbral no genera alerta.
- [ ] Un cambio igual o mayor al umbral genera la alerta con su tipo y su relevancia.
- [ ] El vendedor puede cambiar su umbral y se aplica en el siguiente ciclo.

**Depende de:** SCRUM-42 y SCRUM-46.

---

### SCRUM-48 · Enviar alertas por correo al vendedor

**Responsable:** Brian · 3 pts · Épica: Alertas, reportes y toma de decisiones (Proceso 3)

**Objetivo**

Avisarle al vendedor por correo en menos de 5 minutos cuando algo importante cambia.

**Qué hacer**

- Configurar **JavaMailSender** con un SMTP gratuito (Brevo, o Gmail con contraseña de aplicación). Las credenciales van en variables de entorno.
- Plantilla HTML con Thymeleaf: producto, competidor, precio antes y ahora, variación, precio sugerido y botón "Ver en Trendly".
- Enviar de forma asíncrona (`@Async`) para no frenar el ciclo de recolección, y guardar la fecha de envío en la alerta.
- Respetar la preferencia del vendedor: puede **desactivar los correos** (Ley 1581 de 2012).
- Si varias alertas del mismo ciclo son para el mismo vendedor, agruparlas en un solo correo.

**Criterios de aceptación**

- [ ] Una alerta nueva llega al correo en menos de 5 minutos.
- [ ] Un vendedor que desactivó los correos no los recibe.
- [ ] Las credenciales del SMTP no están en el repositorio.

**Depende de:** SCRUM-47 (alertas).

---

### SCRUM-49 · Bandeja de alertas y registro de la decisión de precio

**Responsable:** Juan David · 5 pts · Épica: Alertas, reportes y toma de decisiones (Proceso 3)

**Objetivo**

Que el vendedor atienda las alertas y registre qué hizo. Con esto se cierra el ciclo que actualiza el precio del Proceso 1.

**Qué hacer**

- Endpoints; se pueden hacer en pareja con Brian:
  - `GET /api/v1/alertas?estado=`
  - `PATCH /api/v1/alertas/{id}/decision` con `{ "accion": "ACEPTAR | AJUSTAR | DESCARTAR", "precioFinal": …, "motivo": … }`
- Al aceptar o ajustar, actualizar el **precio de venta** del producto y guardar el registro en `decision_precio`.
- Página **/alertas** con filtros por estado y relevancia, y un contador de alertas nuevas en el menú.
- Detalle de la alerta: precio anterior y nuevo, mini gráfica, precio sugerido con su margen, y botones **Aceptar sugerido**, **Ajustar precio** y **Descartar** (con motivo).

**Criterios de aceptación**

- [ ] El vendedor ve sus alertas nuevas y las puede filtrar.
- [ ] Aceptar o ajustar cambia el precio del producto y deja registrada la decisión.
- [ ] Descartar pide un motivo, y la alerta queda cerrada.

**Depende de:** SCRUM-46 y SCRUM-47.

---

### SCRUM-50 · Exportar reportes en Excel y PDF

**Responsable:** Raquel · 5 pts · Épica: Alertas, reportes y toma de decisiones (Proceso 3)

**Objetivo**

Entregarle al vendedor un reporte descargable con las métricas de su negocio.

**Qué hacer**

- Crear `GET /api/v1/reportes?formato=xlsx|pdf&productoId=&desde=&hasta=`.
- **Excel** con Apache POI, con 3 hojas:
  - **Resumen**, con al menos 5 métricas: precio actual, mínimo y promedio de la competencia, margen actual frente al objetivo, alertas del periodo, decisiones aceptadas y variación del periodo;
  - **Histórico**;
  - **Alertas y decisiones**.
- **PDF** con OpenPDF: logo, tablas del resumen y del histórico, y fecha de generación.
- Botón **Descargar reporte** en el tablero, con selector de formato y rango.
- Meta: un reporte de 90 días se genera en menos de 3 segundos (objetivo específico 7).

**Criterios de aceptación**

- [ ] El Excel abre con sus 3 hojas y las métricas coinciden con el tablero.
- [ ] El PDF se descarga con el formato correcto.
- [ ] Un reporte de 90 días se genera en menos de 3 segundos.

**Depende de:** SCRUM-42, 46 y 49.

---

### SCRUM-51 · App móvil React Native: login y consulta de dashboards

**Responsable:** Juan David · 5 pts · Épica: Tablero web y aplicación móvil

**Objetivo**

Que el vendedor consulte Trendly desde el celular.

**Qué hacer**

- Crear la app con **Expo** (React Native) dentro de `/mobile` en el mismo repositorio.
- Pantallas: **Login**, **Mis productos**, **Detalle** (gráfica del histórico y precio sugerido) y **Alertas**.
- Usar el mismo API y el mismo JWT. El token se guarda en `expo-secure-store`.
- Gráfica con una librería compatible con React Native, como `react-native-gifted-charts`.
- Para la demo, se usa en el celular con **Expo Go**; no hace falta publicarla en las tiendas.

**Criterios de aceptación**

- [ ] Se inicia sesión en la app con la misma cuenta de la web.
- [ ] Se ven los productos, su gráfica y las alertas.
- [ ] Si el token vence, la app vuelve al login.

**Depende de:** SCRUM-31 (login) y SCRUM-42 (histórico).

---

### SCRUM-52 · Notificaciones push en la app móvil

**Responsable:** Juan David · 3 pts · Épica: Alertas, reportes y toma de decisiones (Proceso 3)

**Objetivo**

Avisarle al vendedor en el celular al mismo tiempo que llega el correo.

**Qué hacer**

- Usar **Expo Notifications**: al iniciar sesión, la app pide permiso y registra su token de push con `POST /api/v1/usuarios/me/dispositivos`.
- Cuando se crea una alerta, el backend envía la notificación con la **Expo Push API**, junto con el correo de SCRUM-48.
- Al tocar la notificación, se abre el detalle de la alerta en la app.
- El vendedor puede desactivar las notificaciones push desde su perfil.

**Criterios de aceptación**

- [ ] Una alerta nueva llega como notificación al celular.
- [ ] Tocar la notificación abre la alerta correcta.
- [ ] Con las notificaciones desactivadas no llega nada.

**Depende de:** SCRUM-48 (alertas) y SCRUM-51 (app).

---

## Orden sugerido

1. **Días 1–4:** SCRUM-45 (Raquel), 46 (Brian) y 51 (Juan David).
2. **Días 5–8:** SCRUM-47 y 48 (Brian), 50 (Raquel) y 49 (Juan David).
3. **Días 9–12:** SCRUM-52 (Juan David) y prueba de punta a punta del Proceso 2 al 3: captura → sugerencia → alerta → decisión → reporte.
4. **Días 13–14:** pruebas, revisión de pull requests y demo del sprint.

## Definición de Hecho

- [ ] El código está en `develop` por medio de un pull request.
- [ ] El pipeline está en verde, y desde este sprint también el quality gate de SonarCloud.
- [ ] Se cumplen sus criterios de aceptación.
