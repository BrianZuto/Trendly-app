# Estado del proyecto Trendly

_Actualizado: 28/09/2026 (S2 en curso)._ Este archivo resume qué está hecho y qué falta. El detalle de cada historia está en [`sprints/`](sprints/README.md).

## Enlaces

- **Repositorio:** https://github.com/BrianZuto/Trendly-app. Rama por defecto: `develop`.
- **Jira:** https://uqvirtual-team-q8za891n.atlassian.net/jira/software/projects/SCRUM/boards/1 (espacio "Trendly", clave SCRUM).
- **Definición del proyecto:** [`definicion-proyecto/`](definicion-proyecto/). Contiene los diagramas BPMN editables. Falta copiar ahí el PDF v0100 entregado.

## Equipo

| Integrante | Rol | Enfoque |
|---|---|---|
| Brian Zuleta Tobón (BT) | Scrum Master / dev | Backend: seguridad JWT, scraping, alertas, CI/CD |
| Raquel López Aristizábal (RA) | Product Owner / dev | Modelo de datos, catálogo, análisis de precios, reportes |
| Juan David Martínez Valencia (JV) | Dev | Frontend React, tablero, app móvil, pruebas de aceptación |

Docente: Cristian David Henao Hoyos. El usuario `yrivera` está como Lector en Jira.

## Stack real (lo que hay en el repositorio)

| Parte | Tecnología |
|---|---|
| Backend (`backend/`) | **Spring Boot 4.1.1**, Java 21 y Maven Wrapper. Initializr trajo la versión 4; algunas guías dicen 3. Incluye Web, Security, Validation, Data JPA, MySQL, Flyway, Lombok, Actuator y H2. Paquete `co.trendly`. |
| Frontend (`frontend/`) | React 19, Vite 8, ESLint y Vitest 5 (jsdom, Testing Library, cobertura v8). |
| Base de datos | MySQL 8. Para desarrollo local, `docker-compose.yml` (pendiente, SCRUM-29). |
| Infraestructura planeada | Azure Functions (job cada 6 h), Azure App Service + MySQL (S5), Vercel (frontend). |
| Calidad | GitHub Actions + JaCoCo (≥ 70 %), SonarCloud (S3). |

## Convenciones (acordadas)

- Ramas: `main` (producción) y `develop` (integración y rama por defecto), las dos **protegidas**. Solo se cambian por PR con los checks `backend` y `frontend` en verde, y la regla no se puede saltar. Desde el 28/09/2026, por decisión del equipo, la aprobación de otro integrante ya no es obligatoria (antes se exigía 1). Las ramas de trabajo se llaman `feature/SCRUM-XX-descripcion`.
- Commits: `SCRUM-XX: mensaje`.
- Los PR van siempre a `develop`. Al final de cada sprint, `develop` se pasa a `main`.
- Definición de Hecho: PR integrado a `develop`, pipeline en verde (y quality gate de SonarCloud desde el S3), y criterios de aceptación cumplidos.
- Secretos solo en `.env` (ignorado por Git). Plantilla en `.env.example`. El JWT vence en **1 hora** (3600000 ms).

## Estado por sprint

| Sprint | Estado |
|---|---|
| S1 · Definición del proyecto (10/09–23/09) | ✅ Completado. Documento v0100 entregado. |
| S2 · Base técnica y usuarios (23/09–07/10) | 🔄 En curso. Ver el detalle abajo. |
| S3 · Proceso 1 y recolección (08/10–21/10) | Planeado. Historias SCRUM-36 a 44 creadas en Jira. |
| S4 · Análisis y Proceso 3 (22/10–04/11) | Planeado. Historias SCRUM-45 a 52 creadas en Jira. |
| S5 · Cierre (05/11–09/11) | Planeado. Historias SCRUM-53 a 55 creadas en Jira. |

## Detalle del S2

| Historia | Resp. | Estado | Hecho | Falta |
|---|---|---|---|---|
| SCRUM-27 Repositorio y convenciones | BT | ✅ Finalizado | Repositorio `BrianZuto/Trendly-app` creado con `backend/`, `frontend/` y `docs/`. Commit inicial `a8e4116` en `main` y `develop`. `develop` es la rama por defecto. Protección de `main` y `develop` probada (el push directo fue rechazado). README, `.gitignore`, `.editorconfig`, `.env.example` y plantilla de PR hechos. Raquel (`raquellopez7928`) y Juan David (`JuanDaM01`) aceptaron la invitación. Jira conectado con GitHub ("GitHub for Jira"): ramas, commits y PR aparecen en la pestaña Desarrollo. Documentación de planeación integrada con el PR #1. | — |
| SCRUM-28 Pipeline CI | BT | ✅ Finalizado | `.github/workflows/ci.yml` con los jobs `backend` (`./mvnw -B verify`, JaCoCo con cobertura de líneas ≥ 70 %) y `frontend` (`npm ci`, lint, Vitest con cobertura y build), con caché de Maven y npm. Reportes de cobertura publicados como artefactos (`cobertura-backend`, `cobertura-frontend`). Vitest 5 con jsdom y Testing Library, y la prueba mínima `App.test.jsx`. Badge del CI en el README. Integrado con el PR #2. Checks `backend` y `frontend` obligatorios en `develop` y `main`. Bloqueo verificado con el PR #3 (prueba que falla, cerrado sin integrar). | — |
| SCRUM-29 Modelo de datos y MySQL | RA | En revisión | Diagrama ER en [`modelo-datos.md`](modelo-datos.md) y `modelo-datos.png`. Flyway `V1__esquema_inicial.sql` (9 tablas, FK, únicos de email y SKU por usuario, índices) y `V2__datos_iniciales.sql` (planes Gratuito/Pro y admin). `docker-compose.yml` con MySQL 8.4. Perfil `test` con H2 en modo MySQL y pruebas del esquema. Probado en MySQL real. | Integrar el PR. |
| SCRUM-30 Registro con política de datos | RA | Por hacer | — | `POST /api/v1/auth/registro`. |
| SCRUM-31 Login JWT y roles | BT | Por hacer | — | jjwt 0.12.6, `JwtService`, `JwtAuthFilter`, `SecurityConfig`, `AuthController` (`/login` y `/me`), manejo de 401/403 y pruebas con perfil `test` en H2. Hay que coordinar con Raquel la entidad `Usuario`. |
| SCRUM-32 Pantallas de registro y login | JV | Por hacer | — | — |
| SCRUM-33 CRUD de productos | RA | Por hacer | — | — |
| SCRUM-34 Pantalla de productos | JV | Por hacer | — | — |
| SCRUM-35 Despliegue en Vercel | JV | Por hacer | — | — |

## Pendientes y riesgos

1. **Herramientas locales de Brian:** falta **Docker Desktop** (`brew install --cask docker`), necesario para el MySQL de SCRUM-29. **GitHub CLI** es opcional (`brew install gh`). Ya están Java 21, Maven, Node 26 y Git.
2. **SonarCloud (S3) es gratis solo si el repositorio es público.** Hoy lo es; no cambiarlo a privado.
3. **Sin confirmar:** si el curso exige, además, un **SAD (C4 niveles 1–2 + ADRs)** y un **plan de SQA con ISO/IEC 25010 y un catálogo de 30 RNF**. Otro equipo del curso los tiene en su Sprint 1. Si aplica, crear dos épicas nuevas en Jira.
4. **Agregar al docente Cristian Henao como Lector en Jira**, si se tiene su correo.
5. **Alcance frente a tiempo:** si el ritmo no alcanza, lo primero que se saca es la app móvil y las notificaciones push (SCRUM-51 y 52) y el ranking de tendencias (SCRUM-53).
6. **Guías en PDF para el equipo** (fuera del repositorio): `~/Downloads/Trendly - Sprint N - Descripción de tareas.pdf`, de N = 2 a 5.
