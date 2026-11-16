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
| Móvil | React Native con Expo SDK 58: Expo Router, expo-secure-store para el JWT, react-native-gifted-charts, Jest | Login, productos, detalle y alertas (SCRUM-51); notificaciones push con expo-notifications y perfil (SCRUM-52) |
| Scraping | Jsoup (Selenium solo para AliExpress si es necesario), adaptadores por marketplace (patrón Strategy/Adapter), Resilience4j para reintentos y limitador de tasa | Pendiente (Sprint 3) |
| Job programado | Azure Functions (timer cada 6 horas) que llama a un endpoint interno del backend | Desplegado (SCRUM-39) |
| Despliegue | Backend en Azure Container Apps con MySQL Flexible Server; frontend en Vercel | Desplegado; un merge a `main` publica el backend solo (SCRUM-54) |
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
├── mobile/                  # App React Native + Expo (SCRUM-51)
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
- Expo Go en el celular (Android o iOS) para la app móvil
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
| `SMTP_HOST` | Servidor SMTP para las alertas | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USERNAME` | Usuario SMTP | `usuario@smtp-brevo.com` |
| `SMTP_PASSWORD` | Clave SMTP | `cambia-esto` |
| `SMTP_FROM` | Remitente verificado; sin él no se envían correos | `alertas@ejemplo.com` |
| `FRONTEND_URL` | Base de los enlaces del correo | `https://trendlyapp.vercel.app` |
| `PUSH_HABILITADO` | `false` para no enviar notificaciones push (las alertas quedan pendientes) | `true` |
| `EXPO_ACCESS_TOKEN` | Token de acceso de Expo; solo si el proyecto activó "enhanced push security" | vacío |
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

# App móvil
cd mobile && npm test         # Jest
cd mobile && npm run coverage # Jest con reporte en mobile/coverage/
cd mobile && npm run lint     # ESLint (expo lint)
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

## App móvil (SCRUM-51)

App de Expo (React Native) en `mobile/` para consultar Trendly desde el celular. Usa el mismo API y la misma cuenta de la web.

```bash
cd mobile
npm install
npx expo start
```

Se escanea el código QR con **Expo Go** (en iOS, con la cámara). El celular y el computador deben estar en la misma red wifi; si la red no lo permite, `npx expo start --tunnel`. No hace falta publicarla en las tiendas.

| Pantalla | Qué muestra | API |
|---|---|---|
| Login | Correo y contraseña de la cuenta web | `POST /auth/login`, `GET /auth/me` |
| Mis productos | Precio de venta y margen frente al objetivo; se recarga deslizando hacia abajo | `GET /productos` |
| Detalle | Gráfica de 30 días con el precio más bajo de la competencia por día frente a tu precio, y el precio sugerido con su margen y posición | `GET /productos/{id}`, `/sugerencia`, `/monitoreos`, `GET /monitoreos/{id}/historico` |
| Alertas | Alertas con filtro por estado y contador de nuevas en la pestaña; tocar una abre su detalle | `GET /alertas?estado=` |
| Detalle de alerta | Qué cambió, el competidor, el precio antes y ahora, el precio sugerido con su margen y la decisión si ya se tomó; al abrirla queda leída (SCRUM-52) | `GET /alertas/{id}`, `PATCH /alertas/{id}/leida` |
| Perfil | Datos de la cuenta, interruptor de notificaciones push y cerrar sesión (SCRUM-52) | `GET` y `PUT /usuarios/me/reglas-alerta` |

- **Sesión:** el JWT se guarda cifrado con `expo-secure-store` (Keychain en iOS, Keystore en Android) y viaja como `Authorization: Bearer`. La app vuelve al login con el aviso "Tu sesión venció" si el token ya venció al abrirla, al llegar su hora de vencimiento, al volver a la app con el token vencido o si el API responde 401.
- **Backend:** por defecto apunta al API desplegado en Azure. Para usar un backend local, copia `mobile/.env.example` como `mobile/.env` y pon la IP del computador en `EXPO_PUBLIC_API_URL` (en el celular, `localhost` es el propio teléfono). La app no necesita CORS.
- **Pruebas:** Jest con `jest-expo` y Testing Library. Montan la app completa con Expo Router y reemplazan la red con un adaptador de axios (`mobile/test/apiFalso.js`). El job `mobile` del CI corre el lint y las pruebas, y SonarCloud analiza `mobile/src` con su cobertura.

### Notificaciones push (SCRUM-52)

Cada alerta llega al celular como notificación, en el mismo momento que el correo de SCRUM-48: al terminar cada ciclo de recolección.

1. **Registro:** al iniciar sesión (o al abrir la app con la sesión guardada), la app pide permiso, obtiene su token de Expo Push y lo registra en el backend. Si el vendedor niega el permiso, la app funciona igual.
2. **Envío:** el backend manda una notificación por alerta y por celular con la [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/) (`trendly.push.url`), con la ruta de la alerta en `data.url`. Lo que no se pudo enviar queda pendiente para el próximo ciclo durante 24 h. Si Expo responde `DeviceNotRegistered`, el celular se olvida.
3. **Al tocarla:** se abre el detalle de esa alerta (`/alerta/{id}`), con la app abierta o cerrada. Si la sesión había vencido, se abre después de iniciar sesión.
4. **Desactivarlas:** en *Perfil* → *Notificaciones push*. Al cerrar sesión el celular se quita del servidor y deja de recibir las alertas de esa cuenta.

| Endpoint | Qué hace |
|---|---|
| `POST /api/v1/usuarios/me/dispositivos` | Registra el celular: `{ "token": "ExponentPushToken[...]", "plataforma": "IOS | ANDROID" }` → 204. Es idempotente; si otra cuenta inicia sesión en el mismo celular, el token pasa a ser suyo. |
| `DELETE /api/v1/usuarios/me/dispositivos?token=` | Quita el celular al cerrar sesión → 204. Un token de otro vendedor no se toca. |
| `PUT /api/v1/usuarios/me/reglas-alerta` | Acepta además `recibirPush` (opcional: si no viene, se conserva el valor; la web no lo envía). |
| `GET /api/v1/alertas/{id}` | Detalle de una alerta propia; una ajena responde 404. |

- **Expo Go y development build:** según la documentación de Expo, desde el SDK 53 Expo Go **no recibe notificaciones push en Android**; para Android hace falta un *development build* (`npx eas-cli build --profile development`) con credenciales de FCM. La app está vinculada al proyecto de Expo `@trendlyproject/trendly` (`extra.eas.projectId` en `mobile/app.json`), que es lo que pide el token.
- **Base de datos:** migración `V8__notificaciones_push.sql`: tabla `dispositivo_push`, columna `regla_alerta.recibir_push` y columna `alerta.enviada_push_en`.
- **Pruebas:** el backend prueba el cliente contra un servidor HTTP local que hace de Expo y el envío con un doble de `ClienteExpoPush`; la app reemplaza `expo-notifications` en `jest.setup.js` y simula el toque de una notificación.

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

## Precio sugerido (SCRUM-46)

`GET /api/v1/productos/{id}/sugerencia` (JWT; un producto ajeno responde `404`). Se recalcula con cada precio nuevo y al consultarlo.

| Campo | Significado |
|---|---|
| `estado` | `CALCULADA`, o `PENDIENTE` si no hay al menos 2 capturas de la competencia en 7 días o nada está disponible. Con `PENDIENTE` los demás campos van en `null`. |
| `precioSugerido`, `margenResultante` | Margen después de la comisión. Van en `null` si margen objetivo + comisión llegan al 100 %. |
| `posicion` | Precio de venta actual frente a la competencia: `MAS_BARATO` (menor que el mínimo), `MAS_CARO` (mayor que el máximo) o `EN_RANGO`. |
| `competitivo` | `false` = "no competitivo con el margen objetivo". |
| `precioMinimoRentable`, `minimoCompetencia`, `promedioCompetencia`, `medianaCompetencia` | En COP. |

- **Competencia:** lo disponible en la última captura de cada monitoreo no pausado.
- **Precio mínimo rentable** = costo ÷ (1 − margen objetivo − comisión). Se usa la comisión del marketplace de la publicación más barata.
- **Sugerido:** si el mínimo de la competencia alcanza el mínimo rentable, ese mínimo × 0,99 sin bajar del mínimo rentable. Si no, el mínimo rentable, con `competitivo: false`.
- **Comisiones (solo ADMIN):** `GET /api/v1/admin/comisiones` y `PUT /api/v1/admin/comisiones/{marketplace}` con `{ "comisionPct": 15 }`.

## Alertas por cambios de precio (SCRUM-47)

Después de cada captura se compara cada publicación con su captura anterior, en COP. Se crea una alerta en estos casos:

| Tipo | Cuándo |
|---|---|
| `BAJA_PRECIO`, `SUBIDA_PRECIO` | La variación absoluta es mayor o igual al umbral del vendedor y la publicación está disponible. |
| `AGOTADO`, `DISPONIBLE` | Cambió la disponibilidad y el vendedor pidió esos avisos. Manda sobre el cambio de precio. |

- **Relevancia:** `ALTA` si la variación es de al menos el doble del umbral; si no, `NORMAL`.
- **Sin duplicados:** máximo 1 alerta por monitoreo en cada captura. Se guarda la más importante: primero la relevancia alta y luego la mayor variación.
- **Contenido:** publicación, precio anterior y nuevo, variación y precio sugerido de SCRUM-46 (`null` si la sugerencia está pendiente o no hay precio posible).
- **Reglas del vendedor:** `GET` y `PUT /api/v1/usuarios/me/reglas-alerta` con `{ "umbralPct": 5, "avisarDisponibilidad": true, "recibirCorreos": true }`. Sin configurar, valen esos mismos valores. El cambio se aplica desde la siguiente captura.

### Correo de alertas (SCRUM-48)

Al terminar un ciclo que guardó precios nuevos, cada vendedor recibe un solo correo con todas sus alertas pendientes. El envío va en segundo plano y no frena la recolección.

- **Preferencia:** con `recibirCorreos: false` no se envía nada (Ley 1581 de 2012).
- **Fallos:** si el SMTP falla, la alerta queda pendiente y se reintenta en el siguiente ciclo. Después de 24 horas ya no se envía.
- **Configuración:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` y `FRONTEND_URL`. Sin `SMTP_FROM` no se envían correos y la API funciona igual.

### Bandeja de alertas y decisión de precio (SCRUM-49)

Cada vendedor solo ve sus alertas; una alerta ajena responde 404. La página `/alertas` del frontend las muestra con filtros, y el menú lleva un contador de alertas nuevas.

| Endpoint | Qué hace |
|---|---|
| `GET /api/v1/alertas?estado=&relevancia=` | Lista las alertas, la más reciente primero. `estado`: `NUEVA`, `LEIDA` o `CERRADA`; `relevancia`: `NORMAL` o `ALTA`. Los dos filtros son opcionales. Cada alerta trae el producto con su precio y margen, el competidor, el cambio, el precio sugerido con su margen y, si está cerrada, la decisión. |
| `PATCH /api/v1/alertas/{id}/leida` | Pasa una alerta `NUEVA` a `LEIDA`. El frontend lo llama al abrirla. |
| `PATCH /api/v1/alertas/{id}/decision` | Registra la decisión en `decision_precio` y cierra la alerta. Cuerpo: `{ "accion": "ACEPTAR \| AJUSTAR \| DESCARTAR", "precioFinal": 104900, "motivo": "..." }`. |

- **ACEPTAR:** pone como precio de venta el precio sugerido de la alerta. Si la alerta no tiene sugerido, responde 400.
- **AJUSTAR:** exige `precioFinal` mayor que cero y lo pone como precio de venta.
- **DESCARTAR:** exige `motivo` y no cambia el precio.
- Una alerta se decide una sola vez: la segunda decisión responde 409. Al cambiar el precio se recalcula la sugerencia del producto.

## Reportes en Excel y PDF (SCRUM-50)

`GET /api/v1/reportes?formato=xlsx|pdf&productoId=&desde=&hasta=` descarga el reporte de un producto propio; uno ajeno responde 404. `desde` y `hasta` son opcionales y se escriben como en el histórico; sin ellos, cubre los últimos 30 días. En el tablero, el botón **Descargar reporte** usa el producto y el rango elegidos.

- **Excel (Apache POI):** tres hojas. **Resumen** con las métricas, **Histórico** con cada captura del periodo y **Alertas y decisiones**. Los precios y las fechas son números y fechas de Excel, no texto.
- **PDF (OpenPDF):** logo, resumen, histórico con una fila por día y fecha de generación. El detalle de cada captura solo va en el Excel: con todas, el PDF tendría cientos de páginas.
- **Métricas:** el mínimo, el promedio, la diferencia y la variación usan las mismas fórmulas que el tablero (`CalculoCompetencia.java` y `tablero.js`). Si cambia una, debe cambiar la otra. El mínimo y el promedio miran la última captura con stock de cada publicación en los 90 días anteriores a `hasta`, aunque el periodo sea más corto.
- **Fechas:** en hora de Colombia.

## Ranking de tendencias (SCRUM-53)

`GET /api/v1/tendencias?top=20` responde los productos mejor puntuados del vendedor, del puntaje más alto al más bajo (`top` va de 1 a 50). En el tablero es la tabla **Tendencias**.

**De dónde salen los productos.** De las búsquedas por palabra clave en MercadoLibre de los productos del vendedor (SCRUM-37). Entra cada producto que salió en la última captura de la búsqueda, con stock. Si el mismo producto sale en dos búsquedas, queda una vez, con su mejor puntaje. Con el Top N por defecto (5), hacen falta al menos 4 búsquedas para llegar a 20 productos.

**Las tres variables**, cada una de 0 a 100:

| Variable | Cómo se calcula | Ejemplo |
|---|---|---|
| **Demanda** | `(11 − puesto promedio) × 10 × presencia`. El puesto es el de la búsqueda en los últimos 30 días (el 1 vale 100 y el 10 vale 10) y la presencia es la fracción de las capturas en que el producto apareció. | Puesto promedio 2,5 en todas las capturas → 85 |
| **Margen** | `(precio en MercadoLibre − costo) ÷ precio × 100`, sin bajar de 0. El costo es el precio más bajo con stock de los monitoreos de AliExpress del producto, en COP con la TRM; si el producto no vigila AliExpress, es el costo registrado. | Se vende a $64.900 y cuesta $28.400 → 56,2 |
| **Competencia** | `vendedores × 5`, hasta 100. Son los vendedores que ofrecen el mismo producto de catálogo en MercadoLibre; desde 20 vale 100. Entre menos, mejor. | 8 vendedores → 40 |

**Puntaje** `= 0,4 × demanda + 0,3 × margen + 0,3 × (100 − competencia)`. Con el ejemplo: 0,4 × 85 + 0,3 × 56,2 + 0,3 × 60 = **68,9**. Las variables se redondean a un decimal antes de combinarlas, así que el puntaje se puede comprobar con lo que muestra la tabla.

- **Por qué la demanda no usa ventas ni reseñas:** la API de MercadoLibre no las entrega a una aplicación (responde 403) y su HTML bloquea los rastreadores. Se estima con el orden de relevancia de la búsqueda, que MercadoLibre arma en buena parte con las ventas.
- **Vendedores:** se guardan en `historico_precio.vendedores` (migración `V9`) al capturar una búsqueda. Las capturas anteriores a SCRUM-53 no traen el dato: un producto entra al ranking cuando su búsqueda se vuelve a capturar (máximo 6 horas).
- Las fórmulas están en `CalculoTendencia.java`; los datos simulados del frontend (`tendenciasSimuladas.js`) usan las mismas.

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

### Validación, reintentos e incidencias (SCRUM-45)

En cada ciclo, un dato malo o un fallo del sitio no llega al histórico ni genera alertas:

- **Reintentos:** timeout, 5xx y 429 se reintentan 3 veces, con esperas de 2, 4 y 8 s. Lo demás (403, 404, página cambiada) no se reintenta.
- **Validación antes de guardar:** identificador y título presentes, precio mayor que 0, moneda esperada (COP en MercadoLibre, USD en AliExpress) y variación de máximo ±70 % frente a la captura anterior de la misma publicación, comparada en su moneda original.
- **Incidencias:** lo que falla tras los reintentos o se descarta queda en `incidencia_scraping`, con su tipo: `TIMEOUT`, `BLOQUEO`, `NO_ENCONTRADO`, `ESTRUCTURA` o `DATO_INVALIDO`.
- **Estado ERROR:** tras 3 ciclos seguidos con fallo, el monitoreo pasa a `ERROR` y el job deja de capturarlo hasta que se reactive (`PATCH /api/v1/monitoreos/{id}` con `{ "estado": "ACTIVO" }`). Un ciclo cuenta como fallo si falló la captura o si se descartó todo lo capturado.
- **Aviso:** si en un ciclo falla más del 10 % de los monitoreos, queda una advertencia en el log y se envía un correo a los usuarios ADMIN activos (requiere `SMTP_FROM`).

**`GET /api/v1/admin/incidencias?tipo=&limite=100`** (solo ADMIN) responde `{ monitoreosEnError: [...], incidencias: [...] }`, con las incidencias de la más reciente a la más antigua. `tipo` es opcional y `limite` admite hasta 500.

## Despliegue del backend (SCRUM-54)

Cuando el CI de `main` termina en verde, [`cd.yml`](.github/workflows/cd.yml) compila el jar, publica la imagen en Azure Container Registry con el commit como etiqueta, actualiza la Container App `trendly-api` y comprueba que la revisión nueva quede sana. Si no arranca, el trabajo queda en rojo y el tráfico sigue en la revisión anterior. También se puede lanzar a mano desde **Actions → CD → Run workflow**, sobre `develop`.

- **Acceso a Azure:** sin contraseñas guardadas. Usa OIDC con la identidad `trendly-github`, con rol Contributor solo sobre `trendly-rg` y credencial federada de la rama `develop`.
- **Secrets de GitHub:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` y `AZURE_SUBSCRIPTION_ID`.
- **Migraciones:** Flyway las aplica al arrancar. Una imagen anterior no arranca sobre una base con migraciones más nuevas, así que para revertir hay que corregir hacia adelante o restaurar la base.

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
