# Sprints de Trendly

Scrum con sprints de 2 semanas. El semestre termina el 09/11/2026, por eso el S5 dura 5 días.
Jira: https://uqvirtual-team-q8za891n.atlassian.net/jira/software/projects/SCRUM/boards/1

| Sprint | Fechas | Objetivo | Historias | Pts | Estado |
|---|---|---|---|---|---|
| [S1 · Definición del proyecto](sprint-1-definicion-proyecto.md) | 10/09 – 23/09 | Documento Definición del Proyecto | SCRUM-1 a 20, 56, 57 | 36 | ✅ Completado |
| [S2 · Base técnica y usuarios](sprint-2-base-tecnica-usuarios.md) | 23/09 – 07/10 | Repositorio, CI, modelo de datos, registro y login con JWT, registro de producto | SCRUM-27 a 35 | 33 | 🔄 En curso |
| [S3 · Proceso 1 y recolección](sprint-3-proceso1-recoleccion.md) | 08/10 – 21/10 | Competidores, job en Azure, scrapers, histórico, tablero, SonarCloud | SCRUM-36 a 44 | 33 | Planeado |
| [S4 · Análisis y Proceso 3](sprint-4-analisis-proceso3.md) | 22/10 – 04/11 | Validación, precio sugerido, alertas (correo y push), decisiones, reportes, app móvil | SCRUM-45 a 52 | 32 | Planeado |
| [S5 · Cierre](sprint-5-cierre.md) | 05/11 – 09/11 | Tendencias, despliegue en Azure, pruebas de aceptación, manual, prueba SUS | SCRUM-53 a 55 | 10 | Planeado |

## Nomenclatura

**Sprints.** En Jira y en los documentos se nombran `S<n> · <Nombre corto>`, sin fechas en el nombre (las fechas van en los campos del sprint). El archivo del sprint usa el mismo nombre en minúsculas: `sprint-<n>-<nombre-corto>.md`.

| Sprint | Nombre en Jira | Archivo |
|---|---|---|
| 1 | `S1 · Definición del proyecto` | `sprint-1-definicion-proyecto.md` |
| 2 | `S2 · Base técnica y usuarios` | `sprint-2-base-tecnica-usuarios.md` |
| 3 | `S3 · Proceso 1 y recolección` | `sprint-3-proceso1-recoleccion.md` |
| 4 | `S4 · Análisis y Proceso 3` | `sprint-4-analisis-proceso3.md` |
| 5 | `S5 · Cierre` | `sprint-5-cierre.md` |

**Códigos.** Cada elemento tiene un código del proyecto, que se antepone al título en Jira, y además la clave que asigna Jira (`SCRUM-XX`). En ramas y commits se sigue usando la clave de Jira.

| Tipo | Formato | Ejemplo | Rango |
|---|---|---|---|
| Épica | `EP-<nn>` | `EP-02 · Gestión de usuarios y seguridad` | EP-01 a EP-07 |
| Historia de usuario | `HU-<nn>` | `HU-05 · Como vendedor quiero iniciar sesión con JWT según mi rol` | HU-01 (SCRUM-27) a HU-29 (SCRUM-55) |
| Subtarea | `HU-<nn>.<n> [ÁREA] Verbo + qué` | `HU-05.4 [BE] Endpoint POST /api/v1/auth/login` | Se numera dentro de cada historia |

Las HU se numeran en el orden de las claves de Jira (HU = SCRUM − 26). Las actividades del S1 (SCRUM-1 a 20, 56 y 57) no llevan código HU porque son tareas del documento, no del producto. Cada subtarea la hace el responsable de su historia, salvo que se reasigne en Jira.

| Área | Significado |
|---|---|
| `[BE]` | Backend (Spring Boot) |
| `[FE]` | Frontend (React) |
| `[DB]` | Base de datos y migraciones |
| `[OPS]` | Repositorio, CI/CD, despliegue e infraestructura |
| `[QA]` | Pruebas |
| `[DOC]` | Documentación |

## Épicas

| Código | Clave | Épica | Responsable |
|---|---|---|---|
| EP-01 | SCRUM-7 | Definición del Proyecto Trendly · Sprint 1 | Equipo |
| EP-02 | SCRUM-21 | Gestión de usuarios y seguridad | Juan David |
| EP-03 | SCRUM-22 | Registro de productos a monitorear (P1) | Raquel |
| EP-04 | SCRUM-23 | Recolección y análisis de precios (P2) | Raquel |
| EP-05 | SCRUM-24 | Alertas, reportes y toma de decisiones (P3) | Brian |
| EP-06 | SCRUM-25 | Tablero web y aplicación móvil | Brian |
| EP-07 | SCRUM-26 | Calidad, CI/CD y despliegue | Juan David |

Carga total de desarrollo (S2–S5): Brian 37 pts · Raquel 37 pts · Juan David 34 pts (108 pts).
