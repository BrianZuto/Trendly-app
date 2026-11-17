"""Fixtures de la suite E2E de Trendly (pytest + Selenium)."""
import os
import time
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

CAPTURAS = Path(__file__).parent / "capturas"
HEADLESS = os.environ.get("E2E_HEADLESS", "0") == "1"
API_URL = os.environ.get(
    "TRENDLY_API",
    "https://trendly-api.prouddune-5a774dac.eastus2.azurecontainerapps.io/api/v1",
).rstrip("/")


@pytest.fixture(scope="session")
def driver():
    opciones = Options()
    if HEADLESS:
        opciones.add_argument("--headless=new")
    opciones.add_argument("--window-size=1366,850")
    opciones.add_argument("--lang=es-CO")
    opciones.add_experimental_option("excludeSwitches", ["enable-automation"])
    opciones.add_experimental_option("prefs", {"credentials_enable_service": False, "profile.password_manager_enabled": False})
    navegador = webdriver.Chrome(options=opciones)
    navegador.implicitly_wait(0)
    yield navegador
    navegador.quit()


@pytest.fixture(scope="session")
def cuenta():
    """Cuenta nueva por corrida, sobre un alias real de Gmail (nunca rebota)."""
    marca = time.strftime("%Y%m%d%H%M%S")
    return {
        "nombre": f"QA Selenium {marca}",
        "email": f"kaosakrier112+e2e{marca}@gmail.com",
        "password": "Trendly2026qa",
    }


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    resultado = (yield).get_result()
    if resultado.when == "call" and resultado.failed:
        navegador = item.funcargs.get("driver")
        if navegador:
            CAPTURAS.mkdir(exist_ok=True)
            ruta = CAPTURAS / f"{time.strftime('%H%M%S')}_{item.name}.png"
            navegador.save_screenshot(str(ruta))
            print(f"\nCaptura guardada: {ruta}")
