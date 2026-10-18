# Trendly · Sprint 2: Base técnica y usuarios

**Fechas:** 23/09/2026 – 07/10/2026 · **Historias:** 9 · **Estimación:** 33 puntos · **Jira:** espacio Trendly (SCRUM)

**Objetivo del sprint:** repositorio, pipeline CI, modelo de datos, registro e inicio de sesión con JWT y roles, y registro del producto propio.

## Resumen

| Clave | Historia | Responsable | Pts | Depende de |
|---|---|---|---|---|
| SCRUM-27 | Configurar repositorio GitHub, ramas y convenciones | Brian | 2 | — |
| SCRUM-28 | Pipeline CI en GitHub Actions | Brian | 5 | 27 |
| SCRUM-29 | Modelo de datos y script MySQL | Raquel | 5 | 27 |
| SCRUM-30 | Registro aceptando la política de datos | Raquel | 3 | 29 |
| SCRUM-31 | Inicio de sesión con JWT según el rol | Brian | 5 | 29 |
| SCRUM-32 | Pantallas de registro e inicio de sesión (React) | Juan David | 3 | 30, 31 |
| SCRUM-33 | Registrar producto con costo, precio y margen | Raquel | 3 | 29, 31 |
| SCRUM-34 | Formularios y listado de productos (React) | Juan David | 5 | 32, 33 |
| SCRUM-35 | Despliegue inicial del frontend en Vercel | Juan David | 2 | 27, 32 |

**Carga:** Brian 12 pts · Raquel 11 pts · Juan David 10 pts.

## Historias de usuario

### SCRUM-27 · Configurar repositorio GitHub, ramas y convenciones de código

**Responsable:** Brian · 2 pts · Épica: Calidad, CI/CD y despliegue

**Objetivo**

Tener el repositorio base donde todo el equipo trabajará con las mismas reglas.

**Qué hacer**

- Crear el repositorio `Trendly-app` en GitHub con 3 carpetas: `/backend` (Spring Boot 4, Java 21, Maven), `/frontend` (React + Vite) y `/docs`.
- Crear las ramas `main` (producción) y `develop` (integración), y protegerlas: solo se cambian por pull request, con 1 aprobación de otro integrante.
- Nombrar las ramas de trabajo así: `feature/SCRUM-XX-descripcion-corta`. Ejemplo: `feature/SCRUM-30-registro-usuario`.
- Escribir los commits con la clave de Jira: `SCRUM-30: agrega endpoint de registro`.
- Agregar `README.md` (cómo correr el proyecto), `.gitignore`, `.editorconfig` y una plantilla de pull request.
- Conectar GitHub con Jira (pestaña **Desarrollo**) para que los commits y los PR aparezcan en cada historia.
- Invitar a Raquel y a Juan David como colaboradores.

**Criterios de aceptación**

- [ ] Los 3 integrantes pueden clonar el repositorio y crear ramas.
- [ ] No se puede hacer push directo a `main` ni a `develop`.
- [ ] Un commit con "SCRUM-27" aparece en la historia en Jira.

**Depende de:** nada. Es la primera tarea del sprint.

---

### SCRUM-28 · Pipeline CI en GitHub Actions: compilación, pruebas y cobertura

**Responsable:** Brian · 5 pts · Épica: Calidad, CI/CD y despliegue

**Objetivo**

Que cada pull request se compile y se pruebe automáticamente antes de integrarse.

**Qué hacer**

- Crear el workflow `.github/workflows/ci.yml`, que se ejecute en cada PR hacia `develop` y `main`.
- **Backend:** `mvn verify` con pruebas y reporte de cobertura con JaCoCo.
- **Frontend:** `npm ci`, lint, pruebas con Vitest y `npm run build`.
- Guardar en caché las dependencias de Maven y npm para que el pipeline sea rápido.
- Configurar el umbral de cobertura en **70 %**, que es la meta del documento. Se deja configurado desde ya, aunque al inicio haya poco código.
- Hacer que el check del pipeline sea **obligatorio** para poder hacer merge.
- Poner el badge del estado del pipeline en el README.

**Criterios de aceptación**

- [ ] Un PR con una prueba que falla queda bloqueado.
- [ ] Un PR correcto muestra el check en verde.
- [ ] El reporte de cobertura queda disponible como artefacto del workflow.

**Depende de:** SCRUM-27.

---

### SCRUM-29 · Modelo de datos inicial y script de base de datos MySQL

**Responsable:** Raquel · 5 pts · Épica: Gestión de usuarios y seguridad

**Objetivo**

Definir la estructura de datos de todo el sistema y crear la base de datos con migraciones versionadas.

**Qué hacer**

- Diseñar el **diagrama entidad-relación** y guardarlo en `/docs/modelo-datos.png`.
- Crear las migraciones con **Flyway** (`V1__esquema_inicial.sql`) con estas tablas:
  - `usuario`: id, nombre, email (único), password_hash, rol (ADMIN / VENDEDOR), acepta_politica_datos, fecha_aceptacion, plan_id, activo, creado_en.
  - `plan`: id, nombre, max_productos, precio_simulado.
  - `producto`: id, usuario_id, nombre, sku, costo, precio_venta, margen_objetivo, creado_en.
  - `monitoreo`: id, producto_id, tipo (URL / PALABRA_CLAVE), valor, marketplace (MERCADOLIBRE / ALIEXPRESS), frecuencia_horas, estado (ACTIVO / PAUSADO / ERROR).
  - `historico_precio`: id, monitoreo_id, precio, moneda, precio_cop, disponible, capturado_en.
  - `sugerencia_precio`, `alerta`, `decision_precio` e `incidencia_scraping`: se dejan creadas con sus campos básicos para los sprints 3 y 4.
- Crear `docker-compose.yml` con MySQL 8 para desarrollo local.
- Crear los datos iniciales: 2 planes (Gratuito: 10 productos; Pro: 100 productos) y un usuario administrador.

**Criterios de aceptación**

- [ ] Con `docker compose up`, el backend arranca y Flyway crea todas las tablas sin errores.
- [ ] Las llaves foráneas y los índices únicos (email y SKU por usuario) están creados.
- [ ] El diagrama entidad-relación está en el repositorio.

**Depende de:** SCRUM-27. Hay que terminarla pronto: SCRUM-30, 31 y 33 la necesitan.

---

### SCRUM-30 · Como vendedor quiero registrarme aceptando la política de datos

**Responsable:** Raquel · 3 pts · Épica: Gestión de usuarios y seguridad

**Objetivo**

Que un vendedor cree su cuenta de forma segura y deje constancia de su autorización de tratamiento de datos (Ley 1581 de 2012).

**Qué hacer**

- Crear el endpoint `POST /api/v1/auth/registro`, que recibe:
  ```json
  { "nombre": "...", "email": "...", "password": "...", "aceptaPolitica": true }
  ```
- Aplicar estas validaciones:
  - Email con formato válido y no repetido. Si ya existe, responder **409**.
  - Contraseña de al menos 8 caracteres, con letras y números. Si no cumple, responder **400**.
  - `aceptaPolitica` debe ser `true`. Si no, responder **400** con el mensaje "Debe aceptar la política de tratamiento de datos".
- Guardar la contraseña cifrada con **BCrypt**. Nunca en texto plano.
- Asignar el rol VENDEDOR y el plan Gratuito por defecto, y guardar la fecha de aceptación de la política.
- Responder **201** con los datos del usuario, sin la contraseña.
- Escribir pruebas unitarias del servicio y una prueba de integración del endpoint.

**Criterios de aceptación**

- [ ] El registro válido responde 201 y el usuario aparece en la base de datos con la contraseña cifrada.
- [ ] Un email repetido responde 409, y una contraseña débil o sin aceptar la política responde 400.
- [ ] Las pruebas pasan en el pipeline.

**Depende de:** SCRUM-29.

---

### SCRUM-31 · Como vendedor quiero iniciar sesión con JWT según mi rol

**Responsable:** Brian · 5 pts · Épica: Gestión de usuarios y seguridad

**Objetivo**

Autenticar a los usuarios y proteger la API según el rol (administrador o vendedor).

**Qué hacer**

- Crear el endpoint `POST /api/v1/auth/login` con `{ email, password }`, que devuelve un **JWT** con vigencia de 1 hora. El token lleva el id del usuario y su rol.
- Configurar Spring Security:
  - Rutas públicas: solo `/api/v1/auth/**`. Todas las demás exigen el token.
  - `/api/v1/admin/**` es solo para ADMIN.
- Crear `GET /api/v1/auth/me`, que devuelve los datos del usuario autenticado.
- Leer la clave secreta del JWT de una **variable de entorno**; nunca va escrita en el código.
- Respuestas de error:
  - Credenciales inválidas → **401**.
  - Token vencido o ausente → **401**.
  - Rol sin permiso → **403**.
- Configurar CORS para el frontend (localhost y Vercel).
- Escribir pruebas de login, de token inválido y de acceso por rol.

**Criterios de aceptación**

- [ ] El login correcto devuelve el token, y con ese token `/auth/me` responde 200.
- [ ] Un vendedor que entra a `/admin/**` recibe 403.
- [ ] La clave del JWT no aparece en el repositorio.

**Depende de:** SCRUM-29. Coordinar con SCRUM-30, porque comparten la entidad Usuario.

---

### SCRUM-32 · Pantallas de registro e inicio de sesión en React

**Responsable:** Juan David · 3 pts · Épica: Gestión de usuarios y seguridad

**Objetivo**

Que el vendedor pueda registrarse y entrar a Trendly desde la web.

**Qué hacer**

- Crear la página **/registro**:
  - Campos: nombre, email, contraseña y confirmar contraseña.
  - Checkbox obligatorio "Acepto la política de tratamiento de datos", con enlace a la página **/politica-datos** (texto de la política).
  - Las validaciones deben ser las mismas del backend.
- Crear la página **/login**: email y contraseña. Si entra bien, guarda el token y redirige a **/dashboard**.
- Crear un **interceptor de Axios** que envíe `Authorization: Bearer <token>` en cada petición y mande a /login cuando la API responda 401.
- Crear **rutas protegidas**: sin sesión no se puede entrar a /dashboard ni a /productos.
- Agregar un botón **Cerrar sesión**.
- Mostrar los errores de la API: "Email ya registrado", "Credenciales inválidas", etc.
- Mientras SCRUM-30 y SCRUM-31 no estén listas, trabajar con datos simulados que respeten el mismo contrato JSON.

**Criterios de aceptación**

- [ ] Un usuario nuevo se registra, inicia sesión y llega al dashboard.
- [ ] Sin sesión, al entrar a /dashboard se redirige a /login.
- [ ] Los mensajes de error del backend se muestran en el formulario.

**Depende de:** SCRUM-30 y SCRUM-31 (el contrato del API).

---

### SCRUM-33 · Como vendedor quiero registrar mi producto con costo, precio y margen objetivo

**Responsable:** Raquel · 3 pts · Épica: Registro de productos a monitorear (Proceso 1)

**Objetivo**

Que el vendedor registre sus productos propios con los datos que luego usa el cálculo del precio sugerido.

**Qué hacer**

- Crear el CRUD `/api/v1/productos` (solo para usuarios autenticados): `POST` crear, `GET` listar los propios, `GET /{id}` consultar, `PUT /{id}` editar y `DELETE /{id}` eliminar.
- Validar los campos:
  - nombre obligatorio;
  - SKU único por vendedor;
  - costo > 0 y precioVenta > 0;
  - margenObjetivo entre 0 y 100 %.
- Controlar el **cupo del plan**: si el vendedor ya tiene el máximo de productos de su plan, responder **422** con el mensaje "Alcanzó el límite de su plan".
- Hacer que cada vendedor **solo vea y edite sus propios productos**. Si pide un producto ajeno, responder 404.
- Devolver también el **margen actual** calculado: (precio − costo) / precio.
- Escribir pruebas unitarias y de integración.

**Criterios de aceptación**

- [ ] El vendedor crea, lista, edita y elimina sus productos.
- [ ] Un vendedor no puede ver ni editar productos de otro.
- [ ] Al superar el cupo del plan responde 422.

**Depende de:** SCRUM-29 y SCRUM-31 (necesita el usuario autenticado).

---

### SCRUM-34 · Formularios de productos y listado de productos monitoreados (React)

**Responsable:** Juan David · 5 pts · Épica: Registro de productos a monitorear (Proceso 1)

**Objetivo**

La pantalla donde el vendedor administra sus productos.

**Qué hacer**

- Crear la página **/productos** con una tabla de columnas: nombre, SKU, costo, precio de venta, margen objetivo, margen actual y acciones.
- Botón **Nuevo producto**, que abre un formulario (modal) con validaciones iguales a las del backend.
- Editar desde la fila (abre el mismo formulario con los datos cargados) y eliminar con un mensaje de confirmación.
- Resaltar en rojo el margen actual cuando esté por debajo del margen objetivo.
- Estados de la pantalla:
  - Lista vacía: "Aún no tienes productos, agrega el primero".
  - Mientras carga: indicador de carga.
  - Errores de la API, incluido el cupo del plan alcanzado.
- Dejar el espacio "Competidores (próximamente)" en cada producto; se completa en el S3 con SCRUM-36.

**Criterios de aceptación**

- [ ] Se puede crear, editar y eliminar un producto desde la interfaz, y los cambios se ven sin recargar la página.
- [ ] El margen actual se calcula y se resalta correctamente.
- [ ] Al llegar al cupo del plan se muestra el mensaje de la API.

**Depende de:** SCRUM-33 y SCRUM-32 (sesión y rutas protegidas).

---

### SCRUM-35 · Despliegue inicial del frontend en Vercel

**Responsable:** Juan David · 2 pts · Épica: Calidad, CI/CD y despliegue

**Objetivo**

Tener el frontend publicado y actualizándose solo con cada cambio.

**Qué hacer**

- Conectar el repositorio de GitHub a **Vercel**, con directorio raíz `/frontend`.
- **Producción:** se despliega desde `main`. **Vista previa:** se genera una URL por cada pull request.
- Configurar la variable de entorno `VITE_API_URL` con la URL del API. El backend se despliega en Azure hasta el S5, así que por ahora apunta al entorno de pruebas o queda lista para cambiarla.
- Agregar `vercel.json` con la regla de reescritura para las rutas de React: sin ella, /login y /productos dan error 404 al recargar la página.
- Poner la URL pública en el README.

**Criterios de aceptación**

- [ ] La URL de Vercel carga la aplicación, y al recargar /login no aparece un 404.
- [ ] Cada PR genera su propia URL de vista previa.
- [ ] La URL de la API se cambia desde las variables de Vercel, sin tocar el código.

**Depende de:** SCRUM-27 y SCRUM-32.

---

## Orden sugerido

1. **Días 1–2:** SCRUM-27 (Brian) y SCRUM-29 (Raquel). Son la base de todo.
2. **Días 3–7:** SCRUM-28 y 31 (Brian), SCRUM-30 y 33 (Raquel), SCRUM-32 (Juan David, con datos simulados).
3. **Días 8–12:** SCRUM-34 y 35 (Juan David) y ajustes de integración.
4. **Días 13–14:** pruebas, revisión de pull requests y demo del sprint.

## Definición de Hecho

- [ ] El código está en `develop` por medio de un pull request.
- [ ] El pipeline está en verde.
- [ ] Se cumplen sus criterios de aceptación.
