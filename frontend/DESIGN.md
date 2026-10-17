# Diseño de Trendly · Tablero de plaza

La interfaz toma su lenguaje de la plaza de mercado: una pizarra verde donde se escriben los precios y etiquetas amarillas que marcan el precio vigente. Es lo que hace Trendly: mirar los precios del mercado y escribir el tuyo.

## Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--pizarra` | `#12352b` | Barra pública, pizarra de la landing, panel de acceso, botón principal |
| `--pizarra-clara` | `#1a4637` | Tablero de precios sobre la pizarra |
| `--pizarra-hondo` | `#0b241d` | Repisa de registro, hover del botón principal |
| `--tiza` / `--tiza-suave` | `#f3f1e9` / `#b9c7bf` | Texto sobre la pizarra |
| `--etiqueta` | `#ffd23f` | Etiquetas de precio, CTA sobre pizarra, foco, selección |
| `--tinta` | `#16130d` | Texto sobre la etiqueta |
| `--papel` / `--blanco` | `#f4f6f1` / `#ffffff` | Fondo de la app y de las secciones claras |
| `--texto` / `--texto-suave` | `#17241f` / `#4d5c55` | Texto sobre papel |

Estrategia: la pizarra cubre las zonas de decisión (primer pantallazo, acceso) y el amarillo aparece solo donde hay un precio o una acción.

## Tipografía

Archivo (Google Fonts, eje de ancho variable). Los titulares y las cifras usan el ancho condensado (`font-stretch: 70–80%`, peso 800–850), como las letras de una pizarra de precios. El texto corrido va en ancho normal. Las cifras usan `.cifra` (números tabulares).

## Componentes propios

- **`.etiqueta`**: etiqueta de precio con perforación (`--agujero` = color del fondo). Partes: `.etiqueta-titulo`, `.etiqueta-precio`, `.etiqueta-nota`.
- **Tablero de precios**: tabla escrita en tiza, con filas separadas por líneas punteadas; el precio actual se tacha y la etiqueta lo reemplaza.
- **Riel**: los pasos cuelgan de una línea continua; en móvil la línea pasa a ser vertical.

## Movimiento

- Curva base `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- Botones: `scale(0.97)` al presionar, 160 ms. Hover solo con `@media (hover: hover) and (pointer: fine)`.
- Único momento orquestado: al cargar la landing, el precio actual se tacha (280 ms) y la etiqueta cuelga (480 ms), con `@starting-style`. Si el navegador no lo soporta, todo aparece en su estado final.
- Mensajes: entran con opacidad y 4 px de desplazamiento, 200 ms.
- `prefers-reduced-motion`: sin desplazamientos; se mantienen opacidad y color.
