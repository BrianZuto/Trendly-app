# Trendly

Plataforma web (con extensión móvil) de análisis de precios y productos para comercio electrónico y dropshipping en Colombia y Latinoamérica.

[![CI](https://github.com/BrianZuto/Trendly-app/actions/workflows/ci.yml/badge.svg)](https://github.com/BrianZuto/Trendly-app/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=BrianZuto_Trendly-app&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=BrianZuto_Trendly-app)

**Aplicación publicada:** https://trendlyapp.vercel.app (producción, se actualiza con cada cambio en `main`)

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
| Despliegue | Backend en Azure App Service con MySQL; frontend en Vercel | Frontend en Vercel (SCRUM-35); backend pendiente (Sprint 5) |
| Calidad | GitHub Actions (CI), JaCoCo (cobertura ≥ 70 %), SonarCloud (quality gate) | CI y JaCoCo configurados (SCRUM-28); SonarCloud configurado (SCRUM-44) |

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
├── functions/               # Azure Function: dispara la recolección cada 6 h (SCRUM-39)
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
| `CORS_ALLOWED_ORIGINS` | Orígenes del frontend permitidos, separados por comas | `http://localhost:5173` |
| `ML_CLIENT_ID` | App ID de la aplicación de MercadoLibre (developers.mercadolibre.com.co) | `1234567890123456` |
| `ML_CLIENT_SECRET` | Secret Key de esa aplicación | `cambia-esto` |
| `RECOLECCION_API_KEY` | Clave que la Azure Function envía en `X-Api-Key` para disparar el job | salida de `openssl rand -hex 32` |
| `TRENDLY_SCHEDULER_LOCAL` | `true` para correr el job en local cada 6 h, sin Azure | `false` |
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

### 6. Despliegue del frontend (Vercel)

El frontend se publica en Vercel desde la carpeta `frontend/`. La configuración vive en `frontend/vercel.json`, que tiene la regla de reescritura para que rutas como `/login` o `/productos` no den 404 al recargar la página.

| Rama | Qué se despliega | URL |
|---|---|---|
| `main` | Producción | https://trendlyapp.vercel.app |
| Cada pull request | Vista previa | Vercel comenta la URL en el PR |

Variables de entorno, en Vercel → Settings → Environment Variables:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | URL del API. Mientras el backend no esté en Azure (Sprint 5), apunta al entorno de pruebas. |
| `VITE_USE_MOCK` | `true` mientras no haya backend publicado (la app funciona con datos simulados); `false` cuando el API esté arriba. |

Las variables `VITE_` se leen al compilar: después de cambiarlas hay que volver a desplegar (Deployments → Redeploy). No hace falta tocar el código.

## API de monitoreos (contrato)

Todas las rutas exigen `Authorization: Bearer <token>` y solo el dueño del producto ve sus monitoreos (si no, 404). Los errores tienen la forma `{ "status", "error", "message", "path" }`; el frontend muestra `message`.

### Crear un monitoreo: `POST /api/v1/productos/{id}/monitoreos`

| Tipo | Cuerpo | Reglas |
|---|---|---|
| Por URL (SCRUM-36) | `{ "tipo": "URL", "valor": "https://…", "frecuenciaHoras": 6 }` | MercadoLibre: **solo productos de catálogo** (`mercadolibre.com.co/…/p/MCO…`); la oferta que se estaba viendo se toma del `wid` de la URL. AliExpress: `aliexpress.com/item/<número>.html`. |
| Por palabra clave (SCRUM-37) | `{ "tipo": "PALABRA_CLAVE", "valor": "redmi buds", "marketplace": "MERCADOLIBRE", "topN": 5 }` | Palabra de 3 a 80 caracteres (se quitan espacios de más), `marketplace` obligatorio y solo `MERCADOLIBRE`, `topN` de 1 a 10 (5 si no se envía). |

`frecuenciaHoras` es opcional (6 por defecto); solo el plan Pro puede bajarla, hasta 1 hora. Máximo 10 monitoreos por producto.

Respuesta `201`:

```json
{ "id": 12, "productoId": 3, "tipo": "PALABRA_CLAVE", "valor": "redmi buds", "idPublicacion": null,
  "marketplace": "MERCADOLIBRE", "topN": 5, "frecuenciaHoras": 6, "estado": "ACTIVO",
  "proximaEjecucion": "2026-10-22T15:00:00Z", "ultimaCaptura": null, "creadoEn": "2026-10-22T15:00:00Z" }
```

| Código | Cuándo |
|---|---|
| `400` | Tipo desconocido; URL inválida, de otro sitio o de MercadoLibre sin catálogo; palabra vacía, de menos de 3 o más de 80 caracteres; falta el marketplace o no se soporta; palabra clave en AliExpress; `topN` fuera de 1–10; frecuencia no permitida. |
| `404` | El producto no existe o es de otro vendedor. |
| `409` | Ya se vigila esa publicación, o esa misma palabra clave en ese marketplace, en el producto. |
| `422` | El producto ya tiene 10 monitoreos. |

Las demás rutas: `GET /api/v1/productos/{id}/monitoreos` (lista), `PATCH /api/v1/monitoreos/{id}` con `{ "estado": "PAUSADO" | "ACTIVO" }` y `DELETE /api/v1/monitoreos/{id}`.

### Contrato con los scrapers

Cada marketplace implementa `MarketplaceScraper.obtener(Monitoreo)`, que **nunca lanza excepciones** y devuelve un `ResultadoScraping`:

- `OK` con la lista de `PublicacionCapturada` (`idPublicacion`, `titulo`, `vendedor`, `posicion`, `precio`, `moneda`, `disponible`). En modo URL es una sola publicación (`posicion` en `null`); en modo palabra clave son las N primeras, con `posicion` desde 1.
- `FALLO` con `tipoFallo` (`TIMEOUT`, `BLOQUEO`, `NO_ENCONTRADO`, `ESTRUCTURA`, `DATO_INVALIDO`) y el `motivo`.

El histórico (SCRUM-42) guarda cada publicación como un punto ligado al monitoreo y a su `idPublicacion`, así se compara la misma publicación entre capturas. Se consulta en `GET /api/v1/monitoreos/{id}/historico`.

**Limitaciones de MercadoLibre:** su HTML tiene verificación anti-bots, así que se usa la API oficial con las credenciales `ML_CLIENT_ID` y `ML_CLIENT_SECRET`. Con el token de la aplicación solo se leen ofertas de otros vendedores a través del catálogo; por eso solo se aceptan URLs de catálogo, y la palabra clave funciona con búsquedas específicas ("redmi buds"): en búsquedas genéricas los primeros productos del catálogo no tienen ofertas y la captura sale como `FALLO` (`NO_ENCONTRADO`).

## Job de recolección (SCRUM-39)

Cada 6 horas (00:00, 06:00, 12:00 y 18:00 UTC) la Azure Function de `functions/` llama a `POST /api/v1/interno/recoleccion/ejecutar` con la clave en `X-Api-Key`. El backend:

1. Responde de inmediato: `202` (ciclo iniciado), `200` (ya hay un ciclo en curso: el disparo se ignora), `401` (clave inválida) o `503` (falta `RECOLECCION_API_KEY`).
2. En segundo plano toma los monitoreos `ACTIVO` cuya próxima ejecución ya venció, por lotes de 20, y los captura con el scraper de su marketplace.
3. Guarda cada resultado en el histórico y reprograma el monitoreo para ahora + su frecuencia. Una captura fallida suma un fallo seguido (el paso a `ERROR` es de SCRUM-45) y no detiene el ciclo.
4. Registra en el log el inicio y el fin de cada ciclo con los procesados, exitosos, fallidos y puntos nuevos.

Como cada monitoreo queda reprogramado al procesarlo, dos disparos seguidos no lo capturan dos veces.

**En local, sin Azure:** `TRENDLY_SCHEDULER_LOCAL=true` corre el mismo ciclo con `@Scheduled` (`TRENDLY_SCHEDULER_CRON` cambia la frecuencia), o se dispara a mano:

```bash
curl -X POST http://localhost:8080/api/v1/interno/recoleccion/ejecutar -H "X-Api-Key: $RECOLECCION_API_KEY"
```

**La Function:** `cd functions && npm ci && npm test`. En Azure necesita las variables `BACKEND_URL` (URL pública del backend) y `RECOLECCION_API_KEY` (la misma del backend).

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
