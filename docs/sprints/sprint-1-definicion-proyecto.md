# Trendly · Sprint 1: Definición del proyecto

**Fechas:** 10/09/2026 – 23/09/2026 · **Actividades:** 18 · **Estimación:** 36 puntos · **Estado:** ✅ completado

**Objetivo del sprint:** entregar el documento Definición del Proyecto (hoja de control, secciones 1 a 5, BPMN de P1–P3 y cronograma en Jira).

## Resultado

- **Entregable:** documento Definición del Proyecto v0100 (23 páginas). El PDF va en `docs/definicion-proyecto/` (pendiente de copiar).
- **Contenido del documento:**
  - hoja de control;
  - introducción, alcance y objetivos;
  - caso de estudio y glosario;
  - solución propuesta, con sus actores y workers;
  - 3 procesos de negocio encadenados, cada uno con su tabla de 14 ítems y su diagrama BPMN 2.0;
  - cronograma en Jira.
- **Diagramas BPMN editables:** `docs/definicion-proyecto/bpmn/`. Se abren en bpmn.io o en Camunda Modeler.
- **Jira:** espacio "Trendly" (clave SCRUM) con 7 épicas, 5 sprints de 2 semanas y 29 historias de desarrollo estimadas y asignadas.

## Procesos de negocio definidos

| Proceso | Entrada | Salida |
|---|---|---|
| P1 · Registro de usuarios y productos a monitorear | Solicitud del vendedor (JSON + JWT) | Producto registrado, con costo, precio, margen y competidores |
| P2 · Monitoreo, recolección y análisis de precios | Productos registrados + disparo cada 6 h | Histórico actualizado y sugerencia de precio y margen |
| P3 · Alertas, reportes y toma de decisiones | Sugerencia generada | Alerta atendida y decisión registrada, que actualiza el precio del producto de P1 |

## Actividades (SCRUM-1 a SCRUM-20, SCRUM-56 y SCRUM-57)

- Configurar Jira y el sprint.
- Definir roles y actores.
- Redactar la introducción y revisar los objetivos.
- Comprobar la coherencia del caso de estudio con el alcance.
- Elaborar y describir los diagramas BPMN de P1, P2 y P3.
- Completar el cronograma.
- Integrar y revisar la versión final.
- Corregir los diagramas BPMN.
- Actualizar las capturas y el enlace de Jira.
