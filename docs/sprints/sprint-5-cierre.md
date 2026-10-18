# Trendly · Sprint 5: Cierre

**Fechas:** 05/11/2026 – 09/11/2026 (5 días) · **Historias:** 3 · **Estimación:** 10 puntos · **Jira:** espacio Trendly (SCRUM)

**Objetivo del sprint:** tendencias, despliegue en Azure, pruebas de aceptación, manual de usuario y prueba SUS.

> **Ojo:** este sprint dura 5 días porque el semestre termina el lunes 09/11. Lo que no quede listo al 04/11 (fin del S4) debe resolverse en los primeros días.

## Resumen

| Clave | Historia | Responsable | Pts | Depende de |
|---|---|---|---|---|
| SCRUM-53 | Ranking de productos en tendencia | Raquel | 5 | 37, 42 |
| SCRUM-54 | Despliegue en Azure y pruebas de aceptación | Brian | 3 | Todo el backend |
| SCRUM-55 | Manual de usuario y prueba SUS | Juan David | 2 | 54 |

**Carga:** Brian 3 pts · Raquel 5 pts · Juan David 2 pts.

## Historias de usuario

### SCRUM-53 · Ranking de productos en tendencia (demanda, competencia y margen)

**Responsable:** Raquel · 5 pts · Épica: Tablero web y aplicación móvil

**Objetivo**

Ayudar al vendedor a escoger productos nuevos con datos, no por intuición (objetivo específico 6: al menos 3 variables).

**Qué hacer**

- Usar los resultados de los monitoreos por **palabra clave** (SCRUM-37).
- Calcular 3 variables normalizadas de 0 a 100:
  - **Demanda:** a partir de las ventas visibles en MercadoLibre ("+500 vendidos") y de las reseñas.
  - **Competencia:** cantidad de vendedores con el mismo producto; entre menos, mejor.
  - **Margen potencial:** precio de venta en MercadoLibre frente al costo en AliExpress (en COP).
- Puntaje = 0,4 × demanda + 0,3 × margen + 0,3 × (100 − competencia).
- Crear `GET /api/v1/tendencias?top=20` y una tabla sencilla **Tendencias** en el tablero, coordinada con Juan David, con el puntaje y cada variable.

**Criterios de aceptación**

- [ ] El ranking muestra al menos 20 productos ordenados por puntaje.
- [ ] Cada producto muestra sus 3 variables y el puntaje.
- [ ] El cálculo está explicado en el README.

**Depende de:** SCRUM-37 (palabra clave) y SCRUM-42 (histórico).

---

### SCRUM-54 · Despliegue del backend en Azure y pruebas de aceptación

**Responsable:** Brian · 3 pts · Épica: Calidad, CI/CD y despliegue

**Objetivo**

Dejar Trendly funcionando en la nube y comprobar que cumple lo prometido en los 3 procesos.

**Qué hacer**

- Crear el `Dockerfile` del backend.
- Desplegarlo en **Azure App Service** (Linux, contenedor) con Azure for Students. La base de datos va en **Azure Database for MySQL – Flexible Server**, o en un contenedor MySQL si el crédito no alcanza.
- Configurar los secretos en Azure (JWT, base de datos, SMTP, API key del job). Ninguno va en el código.
- Agregar al pipeline un job de **CD** que despliegue al hacer merge a `main`.
- Actualizar `VITE_API_URL` en Vercel con la URL de Azure.
- **Pruebas de aceptación:** recorrer en producción los criterios de P1, P2 y P3 (registro, producto, competidor, captura, sugerencia, alerta, decisión y reporte). Anotar el resultado (pasa / falla) en `/docs/pruebas-aceptacion.md`.

**Criterios de aceptación**

- [ ] La web de Vercel funciona contra el backend en Azure.
- [ ] Un merge a `main` despliega solo.
- [ ] La tabla de pruebas de aceptación está completa y los fallos quedan corregidos o documentados.

**Depende de:** Todo el backend (S2 a S4).

---

### SCRUM-55 · Manual de usuario y prueba SUS con 5 usuarios

**Responsable:** Juan David · 2 pts · Épica: Calidad, CI/CD y despliegue

**Objetivo**

Documentar el uso del sistema y medir su usabilidad (objetivo específico 3: SUS de al menos 75).

**Qué hacer**

- **Manual de usuario** en PDF, con capturas: registro e inicio de sesión, productos, competidores, tablero, alertas y decisiones, reportes y app móvil.
- **Prueba SUS** (System Usability Scale):
  - al menos 5 usuarios con perfil de vendedor o compañeros que hagan de vendedor;
  - cada uno sigue 4 tareas guiadas y responde las 10 preguntas estándar del SUS, de 1 a 5;
  - cálculo por persona: en las preguntas impares se resta 1 a la respuesta; en las pares, la respuesta se resta de 5; la suma se multiplica por 2,5;
  - el puntaje final es el promedio; la meta es de al menos 75.
- Guardar los resultados y las observaciones en `/docs/sus.md`.

**Criterios de aceptación**

- [ ] El manual cubre todas las funciones y tiene capturas actualizadas.
- [ ] Hay al menos 5 cuestionarios SUS con el puntaje calculado.
- [ ] Se documenta si se alcanzó la meta de 75 y qué se mejoraría.

**Depende de:** SCRUM-54 (usar la versión desplegada).

---

## Orden sugerido

1. **05/11:** despliegue en Azure (Brian), ranking (Raquel) y borrador del manual (Juan David).
2. **06/11:** pruebas de aceptación en producción (Brian) y tabla de tendencias en el tablero (Raquel con Juan David).
3. **07–08/11:** sesiones SUS con 5 usuarios, correcciones y manual final.
4. **09/11:** demo final, completar el sprint en Jira y retrospectiva.

## Definición de Hecho

- [ ] El código está en `develop` por medio de un pull request.
- [ ] El pipeline está en verde, y desde este sprint también el quality gate de SonarCloud.
- [ ] Se cumplen sus criterios de aceptación.
