# Trendly

Plataforma web (con extensión móvil) de análisis de precios y productos para comercio electrónico y dropshipping en Colombia y Latinoamérica.

[![CI](https://github.com/BrianZuto/Trendly-app/actions/workflows/ci.yml/badge.svg)](https://github.com/BrianZuto/Trendly-app/actions/workflows/ci.yml)
<!-- SonarCloud: badge pendiente (Sprint 3) -->

## Problema y solución

Los vendedores fijan precios con revisiones manuales, lentas y desactualizadas de la competencia, lo que les hace perder margen y ventas. Trendly automatiza ese seguimiento y convierte los datos en sugerencias de precio.

**Funcionalidades principales**

- Monitoreo programado de precio y disponibilidad de publicaciones de MercadoLibre y AliExpress (scraping).
- Histórico de precios por producto y competidor.
- Precio y margen sugeridos a partir del costo y el margen objetivo del vendedor.
- Alertas por correo y push cuando la competencia cambia de precio o de stock.
- Ranking de productos en tendencia.
- Reportes en Excel y PDF.

**Procesos de negocio.** Los tres procesos están encadenados: la salida de uno es la entrada del siguiente.

| # | Proceso | Salida |
|---|---|---|
| 1 | Registro de usuarios y productos a monitorear | Producto registrado con costo, precio, margen objetivo y competidores (por URL o palabra clave) |
| 2 | Monitoreo, recolección y análisis de precios | Histórico actualizado y sugerencia de precio y margen |
| 3 | Alertas, reportes y toma de decisiones | Alerta atendida y decisión de precio registrada, que actualiza el precio del producto del Proceso 1 |

Roles del sistema: `ADMIN` y `VENDEDOR`.

## Arquitectura

| Componente | Tecnología | Estado |
|---|---|---|
| Backend | API REST con Spring Boot 4.1.1, Java 21, Maven. Spring Web MVC, Spring Security, Bean Validation, Spring Data JPA, Flyway, Lombok, Actuator. Paquete base `co.trendly`; rutas versionadas con `/api/v1` | Proyecto base creado |
| Autenticación | JWT con jjwt | Pendiente (Sprint 2) |
| Base de datos | MySQL 8 en desarrollo y producción; H2 solo para pruebas | Local con Docker y migraciones Flyway (SCRUM-29) |
| Frontend | SPA con React 19 + Vite 8, ESLint | Proyecto base creado |
| Frontend (librerías) | Axios, Recharts (gráficas), Vitest (pruebas) | Vitest configurado; Axios y Recharts pendientes |
| Móvil | React Native con Expo y notificaciones push | Pendiente (Sprint 4) |
| Scraping | Jsoup (Selenium solo para AliExpress si es necesario), adaptadores por marketplace (patrón Strategy/Adapter), Resilience4j para reintentos y limitador de tasa | Pendiente (Sprint 3) |
| Job programado | Azure Functions (timer cada 6 horas) que llama a un endpoint interno del backend | Pendiente (Sprint 3) |
| Despliegue | Backend en Azure App Service con MySQL; frontend en Vercel | Pendiente |
| Calidad | GitHub Actions (CI), JaCoCo (cobertura ≥ 70 %), SonarCloud (quality gate) | CI y JaCoCo configurados (SCRUM-28); SonarCloud pendiente (Sprint 3) |

### Estructura del monorepo

```
trendly/
├── backend/                 # API REST (Spring Boot)
│   ├── pom.xml
│   ├── mvnw, mvnw.cmd       # Maven Wrapper
│   └── src/
│       ├── main/java/co/trendly/
│       ├── main/resources/  # application.properties, db/migration (Flyway)
│       └── test/java/co/trendly/
├── frontend/                # SPA (React + Vite)
│   ├── package.json
│   └── src/
├── mobile/                  # App React Native + Expo (pendiente, Sprint 4)
├── docs/                    # BPMN, modelo de datos, pruebas de aceptación, resultados SUS
├── .github/                 # Plantilla de PR y workflows de CI
├── .env.example
├── .editorconfig
└── .gitignore
```

## Requisitos

- Java 21
- Maven 3.9+ (o el wrapper incluido `./mvnw`, que no requiere instalar Maven)
- Node.js 20+ y npm
- Docker Desktop (para MySQL local)
- Git

## Cómo correr el proyecto en local

### 1. Base de datos

Primero crea el `.env` (paso 2) con `DB_PASSWORD` y `DB_ROOT_PASSWORD`; el contenedor los lee de ahí. Luego:

```bash
docker compose up -d
```

Levanta MySQL 8 en el puerto 3306. Las tablas las crea **Flyway** al arrancar el backend (`backend/src/main/resources/db/migration`), junto con los planes Gratuito y Pro y el administrador `admin@trendly.co` / `Trendly123`. El modelo de datos está en [`docs/modelo-datos.md`](docs/modelo-datos.md). Para borrar la base y empezar de cero: `docker compose down -v`.

### 2. Variables de entorno

Copia la plantilla y completa los valores:

```bash
cp .env.example .env
```

Las variables del frontend van en `frontend/.env`, porque Vite solo lee archivos `.env` de su propia carpeta y solo expone las variables con prefijo `VITE_`.

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_URL` | URL JDBC de MySQL | `jdbc:mysql://localhost:3306/trendly` |
| `DB_USERNAME` | Usuario de la base de datos | `trendly` |
| `DB_PASSWORD` | Contraseña de la base de datos | `cambia-esto` |
| `DB_ROOT_PASSWORD` | Contraseña de root del contenedor MySQL | `cambia-esto-tambien` |
| `DB_PORT` | Puerto local de MySQL en `docker-compose.yml` | `3306` |
| `JWT_SECRET` | Clave para firmar los tokens JWT (mínimo 256 bits) | salida de `openssl rand -base64 64` |
| `JWT_EXPIRATION_MS` | Vigencia del token en milisegundos | `3600000` (1 h) |
| `MAIL_HOST` | Servidor SMTP para las alertas | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USERNAME` | Usuario SMTP | `alertas@ejemplo.com` |
| `MAIL_PASSWORD` | Contraseña o contraseña de aplicación SMTP | `cambia-esto` |
| `VITE_API_URL` | URL base del API para el frontend | `http://localhost:8080/api/v1` |

Para generar `JWT_SECRET`:

```bash
openssl rand -base64 64
```

### 3. Backend

```bash
cd backend
./mvnw spring-boot:run
```

Disponible en http://localhost:8080.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en http://localhost:5173.

### 5. Pruebas y calidad

```bash
# Backend: pruebas y verificación
cd backend && ./mvnw verify

# Frontend
cd frontend && npm test       # Vitest
cd frontend && npm run coverage  # Vitest con reporte en frontend/coverage/
cd frontend && npm run lint   # ESLint
```

`./mvnw verify` también genera el reporte de cobertura de JaCoCo en `backend/target/site/jacoco/index.html` y falla si la cobertura de líneas baja del 70 %. El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta lo mismo en cada PR y publica los reportes como artefactos.

## Flujo de trabajo con Git

1. **Toma una historia en Jira** y muévela a "En curso". Anota su clave, por ejemplo `SCRUM-30`.
2. **Crea la rama desde `develop` actualizado:**
   ```bash
   git switch develop
   git pull origin develop
   git switch -c feature/SCRUM-30-registro-usuario
   ```
3. **Haz commits pequeños** con la clave de la historia:
   ```bash
   git add .
   git commit -m "SCRUM-30: agrega entidad Usuario y migración inicial"
   ```
4. **Sube la rama y abre el PR hacia `develop`:**
   ```bash
   git push -u origin feature/SCRUM-30-registro-usuario
   gh pr create --base develop --fill   # o desde la interfaz de GitHub
   ```
   Completa la plantilla del PR (historia, qué cambia, cómo probarlo, evidencias, checklist).
5. **Revisión:** el pipeline debe quedar en verde (checks `backend` y `frontend`, obligatorios). Pedir revisión a otro integrante es recomendable, pero no obligatorio.
6. **Merge a `develop`** y borra la rama. Mueve la historia a "Hecho" cuando cumpla la Definición de Hecho.
7. **Al final de cada sprint**, `develop` se integra en `main`.

## Convenciones

| Tema | Convención | Ejemplo |
|---|---|---|
| Ramas | `main`: producción, protegida<br>`develop`: integración, rama por defecto, protegida<br>`feature/SCRUM-XX-descripcion-corta`: una por historia | `feature/SCRUM-30-registro-usuario` |
| Commits | `SCRUM-XX: mensaje en español e imperativo`. La clave enlaza el commit con la historia en Jira | `SCRUM-31: agrega endpoint de login con JWT` |
| Pull requests | Siempre hacia `develop`. Requieren el pipeline en verde; la aprobación de otro integrante es opcional | — |
| API | Rutas versionadas bajo `/api/v1` | `/api/v1/productos` |
| Formato | Definido en `.editorconfig`: UTF-8, LF, 4 espacios en Java/XML, 2 en JS/JSON/CSS/YAML/Markdown | — |

**Secretos:** nunca se suben al repositorio. Van en variables de entorno o en un archivo `.env` (ignorado por Git): `JWT_SECRET`, credenciales de la base de datos y SMTP, y `VITE_API_URL` en el frontend. Solo se versiona `.env.example`, sin valores reales.

### Definición de Hecho

Una historia está terminada cuando:

- [ ] Su PR fue integrado a `develop`.
- [ ] El pipeline de CI está en verde (y el quality gate de SonarCloud desde el Sprint 3).
- [ ] Cumple todos sus criterios de aceptación.

## Gestión del proyecto

Scrum en Jira Software, espacio **Trendly** (clave `SCRUM`): [tablero del proyecto](https://uqvirtual-team-q8za891n.atlassian.net/jira/software/projects/SCRUM/boards/1).

Sprints de 2 semanas:

| Sprint | Fechas | Objetivo |
|---|---|---|
| S1 | 10/09 – 23/09 | Definición del proyecto |
| S2 | 23/09 – 07/10 | Base técnica y usuarios |
| S3 | 08/10 – 21/10 | Proceso 1 y recolección |
| S4 | 22/10 – 04/11 | Análisis y Proceso 3 |
| S5 | 05/11 – 09/11 | Cierre |

## Equipo

| Integrante | Rol Scrum | Enfoque |
|---|---|---|
| Brian Zuleta Tobón | Scrum Master / desarrollador | Backend: seguridad (JWT), scraping, alertas, CI/CD |
| Raquel López Aristizábal | Product Owner / desarrolladora | Modelo de datos, catálogo de productos, análisis de precios, reportes |
| Juan David Martínez Valencia | Desarrollador | Frontend React, tablero, app móvil, pruebas de aceptación |

## Contexto académico

Proyecto del curso **Ingeniería de Software III**, Universidad del Quindío, semestre 2026-2. Docente: Cristian David Henao Hoyos.
