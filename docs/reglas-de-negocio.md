# Reglas de negocio implementadas

_Trendly · Avance del proyecto (S2–S3) · 23/10/2026_

Este documento especifica las reglas de negocio que el sistema ya hace cumplir. Las dos primeras (RN-01 y RN-02) son las que se presentan en la entrega; al final hay una lista de las demás reglas implementadas.

---

## RN-01 · Cupo de productos según el plan del vendedor

| Campo | Detalle |
|---|---|
| **Identificador** | RN-01 |
| **Proceso** | P1 · Registro de usuarios y productos a monitorear |
| **Historia** | SCRUM-33 · Registrar producto con costo, precio y margen objetivo |
| **Actor** | Vendedor autenticado |
| **Descripción** | Cada vendedor puede tener registrados, como máximo, tantos productos como permita su plan. El plan **Gratuito** permite **10** productos y el plan **Pro** permite **100**. Al registrarse, todo vendedor queda en el plan Gratuito. |
| **Justificación** | El plan define el costo de operar el monitoreo: cada producto genera capturas periódicas en los marketplaces. El cupo limita esa carga y es la base del modelo de suscripción. |
| **Precondición** | El vendedor tiene una sesión válida (JWT) y un plan asignado. |
| **Disparador** | `POST /api/v1/productos` |

**Especificación**

```
SI  productos_registrados(vendedor) >= plan(vendedor).max_productos
ENTONCES  rechazar el registro con HTTP 422 y el mensaje "Alcanzó el límite de su plan"
          y no crear el producto (ni sus monitoreos de reventa)
SI NO     registrar el producto
```

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Dentro del cupo | Vendedor Gratuito con 9 productos registra uno más | `201 Created`; queda con 10 |
| Cupo lleno | Vendedor Gratuito con 10 productos registra otro | `422 Unprocessable Content`, `"Alcanzó el límite de su plan"`; sigue con 10 |
| Plan Pro | Vendedor Pro con 10 productos registra otro | `201 Created` (su cupo es 100) |
| Con reventa | Cupo lleno y el alta trae `reventa` | `422`; no se crea el producto ni ningún monitoreo |

**Implementación**

- Datos: tabla `plan` (`max_productos`) con los planes cargados en `V2__datos_iniciales.sql`; `usuario.plan_id`.
- Regla: `ProductoService.crear` compara `ProductoRepository.countByUsuarioId(...)` con `Plan.getMaxProductos()` y lanza `LimitePlanException`.
- Respuesta: `ManejadorErrores` convierte la excepción en `422` con el JSON `{ status, error, message, path }`; el frontend muestra el mensaje junto al formulario.

**Evidencia**

- `ProductoServiceTest.alLlegarAlCupoDelPlanNoCrea`
- `ProductoControllerTest.alSuperarElCupoDelPlanResponde422`
- Prueba funcional contra el backend real: el producto número 11 de un vendedor Gratuito responde `422`.

---

## RN-02 · Autorización de tratamiento de datos personales (Ley 1581 de 2012)

| Campo | Detalle |
|---|---|
| **Identificador** | RN-02 |
| **Proceso** | P1 · Registro de usuarios y productos a monitorear |
| **Historia** | SCRUM-30 · Registro aceptando la política de datos |
| **Actor** | Visitante que crea su cuenta de vendedor |
| **Descripción** | Nadie puede crear una cuenta sin aceptar de forma expresa la política de tratamiento de datos personales. Al aceptarla, el sistema guarda la constancia: que la aceptó y la fecha y hora exactas. |
| **Justificación** | La Ley 1581 de 2012 (Habeas Data) y el Decreto 1377 de 2013 exigen autorización previa, expresa e informada del titular, y que el responsable pueda demostrar que la obtuvo. |
| **Precondición** | El visitante llenó el formulario de registro con nombre, email y contraseña. |
| **Disparador** | `POST /api/v1/auth/registro` |

**Especificación**

```
SI  aceptaPolitica != true   (falso o ausente)
ENTONCES  rechazar el registro con HTTP 400 y el mensaje
          "Debe aceptar la política de tratamiento de datos" y no crear la cuenta
SI NO     crear la cuenta con acepta_politica_datos = true y fecha_aceptacion = ahora (UTC)
```

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Acepta la política | `aceptaPolitica: true` | `201 Created`; el usuario queda con `acepta_politica_datos = true` y la fecha de aceptación |
| No la acepta | `aceptaPolitica: false` | `400 Bad Request`, `"Debe aceptar la política de tratamiento de datos"`; no se crea la cuenta |
| Campo ausente | Sin `aceptaPolitica` | `400 Bad Request` con el mismo mensaje |

**Implementación**

- Validación en dos capas: `RegistroRequest` (`@NotNull` + `@AssertTrue`) y `RegistroService.registrar`, que vuelve a verificarlo antes de crear la cuenta.
- Constancia: columnas `usuario.acepta_politica_datos` y `usuario.fecha_aceptacion`, que llena `Usuario.nuevoVendedor`.
- Frontend: la casilla "Acepto la política de tratamiento de datos" es obligatoria en `/registro` y enlaza al texto de la política en `/politica-datos`.

**Evidencia**

- `RegistroServiceTest.creaUnVendedorConPlanGratuitoYConstanciaDeLaPolitica`
- `RegistroServiceTest.sinAceptarLaPoliticaNoSeRegistra`
- `RegistroControllerTest.sinAceptarLaPoliticaResponde400ConElMensaje`
- Prueba funcional contra el backend real: el registro sin aceptar responde `400` con el mensaje.

---

## Otras reglas implementadas

| Id | Regla | Dónde |
|---|---|---|
| RN-03 | El SKU es único por vendedor (dos vendedores pueden usar el mismo SKU): `409` si se repite. | `ProductoService`, índice `uk_producto_usuario_sku` |
| RN-04 | Un vendedor solo ve y modifica sus propios productos y monitoreos: los ajenos responden `404`. | `ProductoService`, `MonitoreoService.buscarPropio` |
| RN-05 | Máximo 10 competidores (monitoreos) por producto: `422` al superarlo. | `MonitoreoService.MAX_POR_PRODUCTO` |
| RN-06 | La frecuencia de monitoreo es de 6 h; solo el plan Pro puede bajarla, hasta 1 h. | `MonitoreoService.frecuenciaPermitida` |
| RN-07 | En MercadoLibre solo se vigilan productos de catálogo (`/p/MCO…`), que es lo que la API oficial permite leer. | `PublicacionUrl.esCatalogoMercadoLibre` |
| RN-08 | Los precios en dólares se guardan también en pesos con la TRM del día (datos.gov.co). | `HistoricoService`, `TrmService` |
| RN-09 | Una misma publicación no se guarda dos veces en el histórico dentro de una hora. | `HistoricoService.VENTANA_SIN_DUPLICADOS` |
| RN-10 | La contraseña tiene al menos 8 caracteres, con letras y números, y se guarda cifrada con BCrypt. | `RegistroRequest`, `PasswordEncoder` |
