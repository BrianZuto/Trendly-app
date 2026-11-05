# Prueba de usabilidad SUS (SCRUM-55)

Mide la usabilidad de Trendly con la escala SUS (System Usability Scale). La meta del objetivo específico 3 es un puntaje promedio de **al menos 75**.

## Protocolo

- **Participantes:** al menos 5 personas con perfil de vendedor, o compañeros que hagan de vendedor. Ninguna debe haber usado Trendly antes.
- **Versión probada:** la versión desplegada, o la local con los datos de ejemplo del manual de usuario.
- **Sesión (unos 20 minutos):** la persona sigue las 4 tareas sin ayuda. Quien modera solo lee la tarea, anota si la completó, cuánto tardó y dónde dudó. Al terminar, la persona responde el cuestionario.
- **Manual de usuario:** no se entrega antes de la sesión, para medir si la interfaz se entiende sola.

### Tareas guiadas

| # | Tarea | Se considera completada cuando… |
|---|---|---|
| T1 | Crear una cuenta e iniciar sesión | Llega al Panel con su cuenta |
| T2 | Registrar el producto «Mouse inalámbrico» (costo 25.000, precio de venta 59.900, margen objetivo 35 %) y agregarle un competidor de MercadoLibre | El producto aparece en Productos con su competidor |
| T3 | En el Panel, decir cuál es el precio más bajo de la competencia para «Audífonos Bluetooth Pro» y descargar el reporte de 30 días en Excel | Dice el precio correcto y el archivo .xlsx queda descargado |
| T4 | Atender la alerta nueva de «Audífonos Bluetooth Pro»: revisar el precio sugerido y ajustar el precio a 115.900 | La alerta queda cerrada con la decisión «Ajustaste el precio» |

### Cuestionario

Cada afirmación se responde de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo):

1. Creo que me gustaría usar este sistema con frecuencia.
2. Encontré el sistema innecesariamente complejo.
3. Pensé que el sistema era fácil de usar.
4. Creo que necesitaría el apoyo de una persona técnica para poder usar este sistema.
5. Encontré que las diversas funciones de este sistema estaban bien integradas.
6. Pensé que había demasiada inconsistencia en este sistema.
7. Imagino que la mayoría de las personas aprenderían a usar este sistema muy rápidamente.
8. Encontré el sistema muy engorroso de usar.
9. Me sentí muy seguro/a usando el sistema.
10. Necesité aprender muchas cosas antes de poder empezar a usar este sistema.

### Cálculo

- **Preguntas impares (1, 3, 5, 7, 9):** respuesta − 1.
- **Preguntas pares (2, 4, 6, 8, 10):** 5 − respuesta.
- **Puntaje de la persona:** la suma de los diez valores × 2,5 (de 0 a 100).
- **Puntaje final:** el promedio de todas las personas. La meta es al menos 75.

Ejemplo: las respuestas 4, 2, 4, 1, 4, 2, 5, 1, 4, 2 dan (3 + 3 + 3 + 4 + 3 + 3 + 4 + 4 + 3 + 3) × 2,5 = 82,5.

## Resultados con usuarios reales

> Pendiente: se llena con las sesiones de las 5 personas.

| # | Participante (perfil) | Fecha | T1 | T2 | T3 | T4 | Respuestas (1–10) | Puntaje SUS |
|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | |
| P2 | | | | | | | | |
| P3 | | | | | | | | |
| P4 | | | | | | | | |
| P5 | | | | | | | | |
| | | | | | | | **Promedio** | |

**¿Se alcanzó la meta de 75?** Pendiente.

### Observaciones

Pendiente.

### Qué se mejoraría

Pendiente.

## Piloto simulado (no cuenta para la meta)

Antes de las sesiones reales hicimos un piloto con 5 perfiles simulados por IA, que recorrieron las mismas 4 tareas a partir de las capturas del manual. Sirve para ajustar las tareas y encontrar problemas de usabilidad evidentes. **No reemplaza a los usuarios reales y su puntaje no se usa para la meta.**

Limitación: los perfiles vieron capturas estáticas, no la aplicación funcionando. Por eso varias quejas («no veo el botón», «no veo la confirmación») vienen de que la captura no muestra la pantalla completa o el paso siguiente, y no necesariamente de la aplicación.

| Perfil simulado | T1 | T2 | T3 | T4 | Respuestas (1–10) | Puntaje |
|---|---|---|---|---|---|---|
| Valentina, 22 años, estudiante que revende gadgets, muy digital | Con dificultad | Con dificultad | Sí | Con dificultad | 3, 2, 4, 2, 4, 2, 4, 2, 3, 2 | 70,0 |
| Carolina, 35 años, emprendedora de accesorios para el hogar | Con dificultad | Con dificultad | Sí | Con dificultad | 3, 2, 4, 2, 4, 2, 4, 2, 3, 2 | 70,0 |
| Andrés, 28 años, dropshipper con 60 productos | Con dificultad | Con dificultad | Con dificultad | Sí | 3, 3, 3, 2, 4, 2, 4, 3, 3, 2 | 62,5 |
| Marta, 45 años, vendedora con poca experiencia digital | Con dificultad | Con dificultad | Sí | Con dificultad | 3, 3, 3, 3, 3, 3, 3, 3, 3, 3 | 50,0 |
| Jorge, 58 años, tendero que empezó a vender en línea | Con dificultad | Con dificultad | Sí | Con dificultad | 2, 4, 2, 4, 3, 2, 2, 3, 2, 4 | 35,0 |
| | | | | | **Promedio simulado** | **57,5** |

### Problemas que se repitieron

| Problema | Pantalla | Perfiles | Mejora propuesta |
|---|---|---|---|
| El precio sugerido baja el precio aunque el margen ya supera el objetivo, sin explicar por qué | Detalle de alerta | 4 de 5 | Mostrar el motivo junto al sugerido, por ejemplo «1 % más barato que la oferta más baja; tu margen sigue sobre el objetivo» |
| Términos que no se entienden: SKU, Costos extra, Margen objetivo, el paso Proveedor de AliExpress | Nuevo producto | 5 de 5 | Ayudas cortas junto a cada campo y marcar cuáles son opcionales |
| No es claro cómo conseguir la «URL de catálogo /p/MCO…» de MercadoLibre | Agregar competidor | 5 de 5 | Poner primero la búsqueda por palabra clave y explicar con un ejemplo de dónde sale la URL |
| El campo Precio final aparece como número crudo (112860), sin $ ni separador de miles | Ajustar precio | 4 de 5 | Formato de pesos mientras se escribe |
| No hay confirmación visible de que el reporte se descargó | Panel | 5 de 5 | Mensaje «Reporte descargado» al terminar |
| El banner patrocinado ocupa la parte principal del Panel y las cifras tipo tablero de aeropuerto se leen peor que un número plano | Panel | 4 de 5 | Banner más pequeño o al final; cifras planas en las tarjetas de resumen |
| «Diferencia +5,2 %» en rojo no dice si es bueno o malo | Panel | 3 de 5 | Texto explícito: «Estás 5,2 % más caro que el más barato» |

### Mejoras aplicadas antes de las sesiones reales

Corregimos los cuatro problemas más baratos de resolver. Las sesiones con usuarios reales se hacen sobre esta versión.

| Problema del piloto | Cambio en el tablero web |
|---|---|
| No se entendía por qué se sugiere bajar el precio | El detalle de la alerta explica la regla del precio sugerido y, si bajar es opcional, lo dice con el margen que quedaría |
| El precio final era un número crudo | El campo **Precio final** muestra el signo $ y el separador de miles mientras se escribe |
| No había confirmación de la descarga | Al descargar aparece «Reporte descargado» con el nombre del archivo |
| Jerga en Nuevo producto | Ayudas cortas debajo de SKU, Costo y Margen objetivo, y un texto más claro cuando no hay proveedor en AliExpress |

Quedan para después: poner primero la búsqueda por palabra clave al agregar un competidor, achicar el banner patrocinado del Panel y aclarar el texto de la diferencia de precio.

### Ajustes al protocolo antes de las sesiones reales

- Las tareas se entienden y cubren las funciones principales; se mantienen.
- La persona debe usar la aplicación funcionando, no capturas, para que pueda ver los mensajes de confirmación.
- Conviene incluir al menos una persona con poca experiencia digital: los dos perfiles con menos experiencia dieron los puntajes más bajos.
