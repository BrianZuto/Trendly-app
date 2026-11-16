# Pruebas E2E con Selenium

Pruebas de punta a punta de Trendly con **pytest + Selenium WebDriver (Python)** y Page Objects (`paginas/`).

## Qué cubre

Los casos van en orden y comparten una sesión de navegador:

1. RN-02 (Ley 1581): `/registro` no se completa sin aceptar la política; con ella sí.
2. Rutas privadas: sin sesión, `/productos` redirige a `/login`.
3. Inicio de sesión con la cuenta recién creada: llega al Panel.
4. Registrar un producto (P1: «Mouse inalámbrico») y verlo en la lista.
5. Validación: costo 0 muestra «El costo debe ser mayor que 0».
6. Preferencias de aviso en `/alertas`: umbral, interruptor «Alertas por correo» y Cancelar.
7. Cerrar sesión y volver a la pantalla pública.
8. RN-01: con 10 productos (plan Gratuito) el 11.º muestra «Alcanzó el límite de su plan». El relleno se crea y se borra por API; al final la cuenta queda sin productos.

Cada corrida crea una cuenta nueva con el correo `kaosakrier112+e2e<fecha>@gmail.com` (alias real de Gmail).

## Instalar

Requiere Python 3 y Google Chrome. Selenium Manager descarga el chromedriver solo.

```bash
cd e2e
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Correr

```bash
pytest                                               # producción, navegador visible
E2E_HEADLESS=1 pytest                                # sin ventana
TRENDLY_URL=http://localhost:5173 pytest             # contra local
```

Variables: `TRENDLY_URL` (por defecto `https://trendlyapp.vercel.app`), `TRENDLY_API` (backend usado para el relleno de RN-01; contra local usa `TRENDLY_API=http://localhost:8080/api/v1`), `E2E_PAUSA` (segundos de pausa cosmética, por defecto 0,6; `0` la quita) y `E2E_HEADLESS`.

Si una prueba falla, la captura queda en `e2e/capturas/` (ignorada por git). Tarda cerca de 50 s.
