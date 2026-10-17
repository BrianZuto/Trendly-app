# Diseño de Trendly · Tablero de llegadas

Las páginas públicas (landing, login y registro) toman su lenguaje del tablero de paletas giratorias de las estaciones y plazas: los precios caen paleta por paleta, como cuando el mercado cambia. Lo clásico es el tablero; lo moderno es la cuadrícula de mosaicos llenos con un solo acento amarillo.

## Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--noche` | `#0c1411` | Fondo de las páginas públicas |
| `--mosaico` / `--mosaico-alto` | `#15211c` / `#1d2d26` | Mosaicos sobre la noche |
| `--paleta` / `--paleta-luz` | `#101614` / `#1a2320` | Mitad de abajo y de arriba de cada paleta |
| `--tiza` / `--tiza-suave` | `#f3f1e9` / `#b9c7bf` | Texto sobre fondos oscuros |
| `--etiqueta` | `#ffd23f` | Precio sugerido, acción principal, foco y selección |
| `--verde` / `--verde-hondo` | `#2f6b55` / `#24543f` | Calculadora del primer pantallazo |
| `--papel` | `#f4f6f1` | Mosaico del nombre y del formulario de acceso |

Los tokens públicos viven en `src/core/layout/Tablero.css`. El resto de la app sigue usando los de `src/index.css`.

## Tipografía

Archivo con eje de ancho variable. Titulares y paletas en ancho condensado (`font-stretch: 62–78%`, peso 800–900). Texto corrido en ancho normal. Cifras con números tabulares.

## Composición

- Cuadrícula de 12 columnas con 8 px de separación. Cada mosaico es un rectángulo lleno, sin borde ni sombra, con un solo radio (10 px).
- La barra pública también son mosaicos: marca, enlaces y una sola acción.
- En el teléfono cada página es una sola columna con su propio orden.

## Componentes propios

- **`Paletas`** (`src/shared/components/Paletas.jsx`): escribe un texto en paletas giratorias. Props: `texto`, `largo`, `alinear` (`izq` o `der` para cifras), `acento`, `retraso`. Expone el texto como `role="img"` con `aria-label`.
- **Tablero 3D** (`.tablero-3d`): inclinado en perspectiva; el canto son dos planos girados 90°, así tiene grosor sin sombra. En la landing se inclina hacia el puntero.
- **Tambor de "Cómo funciona"**: prisma de tres caras que gira con el scroll (registrar, recoger, decidir). Cada paso también se puede tocar.
- **Marca en bloques**: el cierre arma TRENDLY con bloques de distinta altura que se voltean al entrar en pantalla.

## Movimiento

- Curvas: `--ease-out` para entradas y `--ease-suave` para el tablero.
- Firma: las paletas giran pasando por los caracteres intermedios (máximo 7 pasos, 55 ms por medio giro).
- Entradas por mosaico escalonadas 80 ms. Botones con `scale(0.97)` al presionar; hover solo con puntero fino.
- `prefers-reduced-motion`: las paletas muestran el texto de una vez, el tambor se convierte en tres tarjetas en columna y los bloques no se voltean.
