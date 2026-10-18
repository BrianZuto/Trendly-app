# Trendly · Sprint 3: Proceso 1 y recolección

**Fechas:** 08/10/2026 – 21/10/2026 · **Historias:** 9 · **Estimación:** 33 puntos · **Jira:** espacio Trendly (SCRUM)

**Objetivo del sprint:** competidores por URL y palabra clave, job programado en Azure, scrapers de MercadoLibre y AliExpress, e histórico de precios.

## Resumen

| Clave | Historia | Responsable | Pts | Depende de |
|---|---|---|---|---|
| SCRUM-36 | Agregar competidor por URL (ML o AliExpress) | Raquel | 5 | 33 |
| SCRUM-37 | Monitorear producto por palabra clave | Brian | 3 | 36 |
| SCRUM-38 | Validar URL y palabra clave (pantalla de competidores) | Juan David | 2 | 36, 37 |
| SCRUM-39 | Job programado cada 6 h en Azure Functions | Brian | 3 | 36, 40 |
| SCRUM-40 | Scraper de MercadoLibre | Brian | 5 | 36, 37 |
| SCRUM-41 | Scraper de AliExpress | Raquel | 5 | 40 |
| SCRUM-42 | Persistir histórico de precios (con TRM) | Raquel | 3 | 40, 41 |
| SCRUM-43 | Tablero con gráfica de evolución de precios | Juan David | 5 | 42 |
| SCRUM-44 | SonarCloud como quality gate | Juan David | 2 | 28 |

**Carga:** Brian 11 pts · Raquel 13 pts · Juan David 9 pts.

## Historias de usuario

### SCRUM-36 · Como vendedor quiero agregar un competidor por URL de MercadoLibre o AliExpress

**Responsable:** Raquel · 5 pts · Épica: Registro de productos a monitorear (Proceso 1)

**Objetivo**

Asociar a cada producto propio las publicaciones de la competencia que se quieren vigilar. Cada una queda como un **monitoreo** de tipo URL.

**Qué hacer**

- Crear los endpoints del monitoreo:
- Rutas:
  - `POST /api/v1/productos/{id}/monitoreos` con `{ "tipo": "URL", "valor": "https://...", "frecuenciaHoras": 6 }`
  - `GET /api/v1/productos/{id}/monitoreos`
  - `PATCH /api/v1/monitoreos/{id}` para pausar o reactivar
  - `DELETE /api/v1/monitoreos/{id}`
- Reconocer el marketplace por el dominio:
  - `mercadolibre.com.co` → MERCADOLIBRE
  - `aliexpress.com` y `es.aliexpress.com` → ALIEXPRESS
  - Cualquier otro dominio → **400** con el mensaje "Marketplace no soportado".
- Extraer y guardar el identificador de la publicación: el código `MCO-…` en MercadoLibre y el número del ítem en AliExpress. Si el producto ya tiene ese mismo competidor, responder **409**.
- Frecuencia: 6 horas por defecto. Solo el plan Pro puede bajarla, con un mínimo de 1 hora.
- Crear el monitoreo con estado **ACTIVO** y la próxima ejecución en el momento de crearlo.
- Solo el dueño del producto puede crear, ver o borrar sus monitoreos.
- Escribir pruebas unitarias y de integración.

**Criterios de aceptación**

- [ ] Una URL válida de MercadoLibre o de AliExpress crea el monitoreo con el marketplace correcto.
- [ ] Una URL de otro sitio responde 400, y un competidor repetido responde 409.
- [ ] Un vendedor no puede ver ni borrar los monitoreos de otro.

**Depende de:** SCRUM-33 (productos) y la tabla `monitoreo` de SCRUM-29.

---

### SCRUM-37 · Como vendedor quiero monitorear un producto por palabra clave

**Responsable:** Brian · 3 pts · Épica: Registro de productos a monitorear (Proceso 1)

**Objetivo**

Vigilar el mercado a partir de una búsqueda, sin conocer una publicación puntual. Esto también alimenta el ranking de tendencias del S5.

**Qué hacer**

- Usar el mismo endpoint de SCRUM-36 con `{ "tipo": "PALABRA_CLAVE", "valor": "audífonos bluetooth", "marketplace": "MERCADOLIBRE", "topN": 5 }`.
- Validar los datos:
  - Palabra clave de 3 a 80 caracteres.
  - El marketplace es obligatorio.
  - `topN` entre 1 y 10; por defecto, 5.
- Definir el contrato con los scrapers (SCRUM-40 y 41): en modo palabra clave, el scraper devuelve las **N primeras publicaciones** de la búsqueda, cada una con su identificador, título, precio, vendedor y posición.
- Cada resultado se guarda en el histórico ligado al monitoreo y al identificador de la publicación. Así se puede comparar la misma publicación entre capturas.
- Escribir pruebas del endpoint y de las validaciones.

**Criterios de aceptación**

- [ ] Se crea un monitoreo por palabra clave, con su marketplace y su `topN`.
- [ ] Una palabra clave vacía o de más de 80 caracteres responde 400.
- [ ] El contrato del modo palabra clave queda documentado en el README (o en OpenAPI) para Brian y Raquel.

**Depende de:** SCRUM-36, porque comparten el endpoint y la entidad Monitoreo.

---

### SCRUM-38 · Validar formato de URL y palabra clave con mensajes de error

**Responsable:** Juan David · 2 pts · Épica: Registro de productos a monitorear (Proceso 1)

**Objetivo**

Construir en la web la sección de competidores de cada producto, validando los datos antes de enviarlos al API.

**Qué hacer**

- Reemplazar el espacio "Competidores (próximamente)" de SCRUM-34 por la sección **Competidores** del producto.
- Formulario con dos pestañas: **Por URL** y **Por palabra clave**. La segunda incluye el selector de marketplace y el Top N.
- Validar en el navegador:
  - La URL debe ser válida y de `mercadolibre.com.co` o `aliexpress.com`.
  - La palabra clave debe tener de 3 a 80 caracteres.
  - Los mensajes deben ser claros, por ejemplo: "Solo se admiten publicaciones de MercadoLibre o AliExpress".
- Lista de monitoreos con: marketplace (etiqueta de color), tipo, estado (Activo / Pausado / Error), frecuencia y última captura. Botones para pausar, reactivar y eliminar.
- Mostrar los errores del API: 409 (competidor repetido), 400 (marketplace no soportado) y 422 (cupo del plan).

**Criterios de aceptación**

- [ ] Una URL mal escrita o de otro sitio se rechaza antes de llamar al API.
- [ ] Los monitoreos creados aparecen en la lista con su estado, y se pueden pausar y eliminar.
- [ ] Los errores del backend se muestran junto al formulario.

**Depende de:** SCRUM-36 y SCRUM-37 (endpoints). Mientras tanto se puede trabajar con datos simulados.

---

### SCRUM-39 · Job programado cada 6 h en Azure Functions

**Responsable:** Brian · 3 pts · Épica: Recolección y análisis de precios (Proceso 2)

**Objetivo**

Disparar automáticamente la recolección de precios de todos los monitoreos activos. Es el inicio del Proceso 2.

**Qué hacer**

- Crear en Azure (suscripción Azure for Students) una **Azure Function con disparador de temporizador** y la expresión `0 0 */6 * * *` (cada 6 horas).
- La función llama al endpoint interno del backend `POST /api/v1/interno/recoleccion/ejecutar`, protegido con una API key en el encabezado `X-Api-Key`. La key se guarda en una variable de entorno.
- El backend:
  - busca los monitoreos **ACTIVOS** cuya próxima ejecución ya venció;
  - los procesa por lotes de 20 con el scraper de cada marketplace;
  - actualiza la próxima ejecución: ahora + frecuencia.
- Evitar ejecuciones simultáneas con un bloqueo "en ejecución": si llega otro disparo mientras corre uno, se ignora.
- Registrar cada ciclo: inicio, fin, monitoreos procesados, exitosos y fallidos.
- Para desarrollo local, dejar una propiedad `trendly.scheduler.local=true` que active un `@Scheduled` equivalente, sin depender de Azure.

**Criterios de aceptación**

- [ ] Al invocar el endpoint manualmente se procesan los monitoreos vencidos.
- [ ] En Azure, la función se ejecuta cada 6 horas y se ve en su historial de ejecuciones.
- [ ] Dos disparos seguidos no procesan dos veces el mismo monitoreo.

**Depende de:** SCRUM-36 (monitoreos). Mientras SCRUM-40 y 41 no estén listas, puede usar un scraper simulado.

---

### SCRUM-40 · Scraper de MercadoLibre (precio y disponibilidad)

**Responsable:** Brian · 5 pts · Épica: Recolección y análisis de precios (Proceso 2)

**Objetivo**

Obtener el precio, la disponibilidad y los datos de las publicaciones de MercadoLibre. También se define la interfaz común de los scrapers.

**Qué hacer**

- Definir la interfaz común `MarketplaceScraper` con el método `ResultadoScraping obtener(Monitoreo m)`. Cada marketplace tiene su propia implementación (patrón Strategy/Adapter). Si un sitio cambia su HTML, solo se toca su clase.
- `ResultadoScraping` lleva: estado (OK / FALLO), lista de publicaciones (identificador, título, precio, moneda, disponible, vendedor, posición) y el motivo del fallo.
- Implementación para MercadoLibre con **Jsoup**:
  - **Modo URL:** leer la publicación y tomar el precio, la moneda, la disponibilidad, el título y el vendedor. Primero del JSON-LD o de las etiquetas meta de la página, luego del HTML.
  - **Modo palabra clave:** leer `listado.mercadolibre.com.co/<palabra>` y tomar las N primeras.
- Buenas prácticas: User-Agent identificable, timeout de 10 s, límite de 1 petición cada 2 s (Resilience4j RateLimiter) y respetar robots.txt.
- Guardar 3 páginas reales como **fixtures** en `src/test/resources`, para que las pruebas no dependan de internet.

**Criterios de aceptación**

- [ ] Con 3 URLs reales se obtiene el precio correcto (se compara a mano con la página).
- [ ] El modo palabra clave devuelve N resultados con su posición.
- [ ] Un timeout o una página inexistente devuelve FALLO con el motivo, sin romper el ciclo.
- [ ] Las pruebas con fixtures pasan en el pipeline.

**Depende de:** SCRUM-36 y SCRUM-37 (tipos de monitoreo). Terminar la interfaz en los primeros días, porque Raquel la usa en SCRUM-41.

---

### SCRUM-41 · Scraper de AliExpress (precio y disponibilidad)

**Responsable:** Raquel · 5 pts · Épica: Recolección y análisis de precios (Proceso 2)

**Objetivo**

Obtener el precio y la disponibilidad de AliExpress, que es la fuente de costos para dropshipping.

**Qué hacer**

- Implementar `MarketplaceScraper` (interfaz de SCRUM-40) para AliExpress.
- Las páginas de AliExpress cargan los datos con JavaScript. Primero se intenta leer el JSON que viene dentro del HTML (en las etiquetas `<script>`) con Jsoup y un parser JSON.
- Si no es posible, usar **Selenium en modo headless** como alternativa, solo para AliExpress.
- Extraer precio (en **USD**), stock o disponibilidad, título y tienda. El precio se guarda en su moneda original; la conversión a pesos se hace en SCRUM-42.
- Aplicar las mismas buenas prácticas y fixtures de prueba que en SCRUM-40.

**Criterios de aceptación**

- [ ] Con 3 URLs reales de AliExpress se obtiene el precio en USD y la disponibilidad.
- [ ] Si AliExpress bloquea o cambia la página, se devuelve FALLO con el motivo.
- [ ] Las pruebas con fixtures pasan en el pipeline.

**Depende de:** SCRUM-40 (interfaz común).

---

### SCRUM-42 · Persistir histórico de precios por producto y plataforma

**Responsable:** Raquel · 3 pts · Épica: Recolección y análisis de precios (Proceso 2)

**Objetivo**

Guardar cada captura como un punto del histórico, en pesos colombianos, y avisar que hay un precio nuevo.

**Qué hacer**

- Crear `HistoricoService.guardar(resultado)`, que inserta en `historico_precio`: precio, moneda, **precio en COP**, disponible, fecha de captura en UTC y fuente.
- Convertir de USD a COP con la **TRM del día** del conjunto de datos abierto de la Superintendencia Financiera en datos.gov.co. Se guarda en caché por 24 horas; si falla, se usa la última TRM guardada.
- Evitar duplicados: una sola captura por publicación y monitoreo en la misma ventana de 1 hora.
- Actualizar la **última captura** del monitoreo.
- Crear `GET /api/v1/monitoreos/{id}/historico?desde=&hasta=` para la gráfica de SCRUM-43.
- Publicar el evento interno **PrecioActualizado** (Spring ApplicationEvent). En el S4 lo escuchan el cálculo del precio sugerido y las alertas.

**Criterios de aceptación**

- [ ] Después de un ciclo, cada monitoreo tiene su nuevo registro con el precio en COP.
- [ ] Si el ciclo se ejecuta dos veces seguidas, no se duplica la captura.
- [ ] El endpoint del histórico devuelve los puntos ordenados por fecha.

**Depende de:** SCRUM-40 y SCRUM-41 (resultados de los scrapers).

---

### SCRUM-43 · Tablero web con gráfica de evolución de precios

**Responsable:** Juan David · 5 pts · Épica: Tablero web y aplicación móvil

**Objetivo**

Que el vendedor vea cómo cambian los precios de su competencia frente al suyo.

**Qué hacer**

- Página **/dashboard** con selector de producto.
- Gráfica de líneas con **Recharts**: una línea por competidor o plataforma y una línea punteada con el precio propio.
- Filtro de rango: 7, 30 y 90 días. El tooltip muestra fecha, precio y plataforma.
- Tarjetas de resumen: precio mínimo de la competencia, promedio, mi precio y diferencia porcentual.
- Estado vacío: "Aún no hay capturas; la primera llega en máximo 6 horas".
- El tablero debe verse bien en el celular (responsive).

**Criterios de aceptación**

- [ ] Con datos del histórico, la gráfica muestra las líneas por competidor y el precio propio.
- [ ] Los filtros de rango cambian los datos sin recargar la página.
- [ ] Las tarjetas de resumen coinciden con los datos del API.

**Depende de:** SCRUM-42 (endpoint del histórico). Mientras tanto se puede trabajar con datos simulados.

---

### SCRUM-44 · Análisis estático con SonarCloud como quality gate

**Responsable:** Juan David · 2 pts · Épica: Calidad, CI/CD y despliegue

**Objetivo**

Medir automáticamente la calidad del código en cada pull request (bugs, vulnerabilidades, duplicación y cobertura).

**Qué hacer**

- Crear la organización y el proyecto en **SonarCloud**, vinculados al repositorio de GitHub.
- Agregar el análisis al pipeline de SCRUM-28. En el backend, importar el reporte de JaCoCo; en el frontend, el `lcov` de Vitest.
- Configurar el **quality gate**:
  - 0 bugs y 0 vulnerabilidades críticas;
  - cobertura del código nuevo de al menos 70 %;
  - duplicación menor al 3 %.
- Activar los comentarios de SonarCloud en los PR y hacer que el quality gate sea un **check obligatorio** para el merge.
- Poner el badge del quality gate en el README.

**Criterios de aceptación**

- [ ] Cada PR muestra el resultado de SonarCloud.
- [ ] Un PR que no cumple el quality gate no se puede integrar.
- [ ] El badge del README muestra el estado actual.

**Depende de:** SCRUM-28 (pipeline CI). SonarCloud es gratuito solo para repositorios públicos. Si el repositorio es privado, hay que hacerlo público o usar SonarQube Community en local.

---

## Orden sugerido

1. **Días 1–3:** SCRUM-36 (Raquel) y 37 (Brian) en el backend; SCRUM-40 (Brian) empieza por la interfaz común; SCRUM-44 (Juan David).
2. **Días 4–8:** SCRUM-40 (Brian), 41 y 42 (Raquel), 39 (Brian) y 38 (Juan David).
3. **Días 9–12:** SCRUM-43 (Juan David) y prueba de punta a punta: job → scrapers → histórico → gráfica.
4. **Días 13–14:** pruebas, revisión de pull requests y demo del sprint.

## Definición de Hecho

- [ ] El código está en `develop` por medio de un pull request.
- [ ] El pipeline está en verde, y desde este sprint también el quality gate de SonarCloud.
- [ ] Se cumplen sus criterios de aceptación.
