# Guion para moderar las sesiones SUS (SCRUM-55)

Guía para quien dirige cada una de las 5 sesiones de la prueba de usabilidad descrita en [sus.md](sus.md). Una sesión dura unos 20 minutos.

## Antes de las sesiones (una sola vez)

1. Encender el backend y el frontend locales con los datos de ejemplo del manual.
2. Comprobar que `http://localhost:5173` abre la página de inicio de Trendly.
3. Tener a mano el archivo `sus-cuentas-prueba.txt` con las cuentas P1 a P5. Cada participante usa la suya en las tareas 2 a 4. Las 5 cuentas tienen los mismos productos y alertas, así que todas las sesiones parten del mismo estado.
4. Abrir el formulario **Sesiones SUS** en el mismo computador. Ahí se anotan las tareas y la persona responde el cuestionario.

## Antes de cada sesión

- Abrir Trendly en una **ventana privada** del navegador, para que no quede ninguna sesión iniciada.
- En el formulario, elegir la pestaña del participante (P1, P2…).
- Anotar el perfil y el rango de edad. **No escribir el nombre completo** de la persona.
- Tener el manual de usuario guardado: no se entrega durante la sesión.

## Presentación (leer en voz alta)

> Gracias por ayudarnos. Vamos a probar Trendly, una aplicación para vendedores que vigila los precios de la competencia. Estamos evaluando la aplicación, no a ti: si algo no sale, es un problema de la aplicación.
>
> Te voy a leer 4 tareas. Hazlas como lo harías en tu casa y, si puedes, piensa en voz alta. Durante las tareas no puedo ayudarte ni contestar preguntas sobre cómo hacerlas.
>
> Al final te pediré responder 10 preguntas cortas. No guardamos tu nombre; solo un código y tu perfil. ¿Estás de acuerdo en participar?

Si la persona no está de acuerdo, no se hace la sesión.

## Durante las tareas

- Leer cada tarea **tal cual está escrita** en el formulario y pulsar **Iniciar**. Pulsar **Detener** cuando la persona diga que terminó o se rinda.
- No señalar la pantalla, no dar pistas y no corregir. Si pregunta algo, responder: «¿Qué harías si estuvieras solo?».
- Si lleva más de **3 minutos** sin avanzar, marcar **No completó** y pasar a la siguiente.
- Marcar **Con dificultad** si terminó pero se equivocó de camino, dudó mucho o tuvo que volver atrás.
- En la nota, escribir dónde dudó y lo que dijo con sus palabras.

| # | Tarea (leer tal cual) | Se considera completada cuando… |
|---|---|---|
| T1 | Crea una cuenta nueva en Trendly e inicia sesión con ella. | Llega al Panel con su cuenta. Usa un correo inventado, por ejemplo `p1.registro@prueba.co`. |
| T2 | Registra el producto «Mouse inalámbrico»: costo 25.000, precio de venta 59.900 y margen objetivo 35 %. Luego agrégale un competidor de MercadoLibre. | El producto aparece en Productos con su competidor. En el backend local el competidor queda sin precios todavía (no hay capturas reales): eso no cuenta como fallo. |
| T3 | En el Panel, dime cuál es el precio más bajo de la competencia para «Audífonos Bluetooth Pro» y descarga el reporte de 30 días en Excel. | Dice **$108.900** (ELECTRO_HOGAR) y el archivo `.xlsx` queda descargado. |
| T4 | Atiende la alerta nueva de «Audífonos Bluetooth Pro»: revisa el precio sugerido y ajusta tu precio a 115.900. | La alerta queda cerrada con la decisión «Ajustaste el precio». |

**Entre la tarea 1 y la 2:** cerrar la sesión de la cuenta que creó la persona e iniciar sesión con la cuenta del participante (P1 con `p1.sus@prueba.trendly.co`, y así). Lo hace quien modera, sin que la persona vea la contraseña.

## Cuestionario

1. Entregar el computador y decir: «Responde las 10 preguntas de 1 a 5. No hay respuestas buenas ni malas: marca lo primero que pienses».
2. Alejarse de la pantalla mientras responde.
3. Pedir que conteste también las dos preguntas abiertas (lo más difícil y qué cambiaría).
4. Revisar que no falte ninguna respuesta y pulsar **Guardar sesión**. El puntaje aparece en Resultados.

## Cierre

> Eso es todo. Muchas gracias: tus respuestas nos sirven para mejorar Trendly.

Después de cada sesión: cerrar la ventana privada y no compartir capturas de la pantalla de la persona.

## Al terminar las 5 sesiones

1. En el formulario, pulsar **Copiar resumen** y pasar el texto a quien llena [sus.md](sus.md), o pedir a Claude que lea el registro.
2. Llenar en `sus.md` la tabla de resultados reales, el promedio y si se alcanzó la meta de 75.
3. Borrar `sus-cuentas-prueba.txt`. Las cuentas de prueba solo existen en la base local.
