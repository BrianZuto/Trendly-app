"""Utilidades comunes de los Page Objects."""
import os
import time

from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

URL_BASE = os.environ.get("TRENDLY_URL", "https://trendlyapp.vercel.app").rstrip("/")
PAUSA = float(os.environ.get("E2E_PAUSA", "0.6"))
ESPERA = 20


def pausa(factor=1.0):
    """Pausa solo cosmetica para que se vea bien en video. No sincroniza nada."""
    if PAUSA > 0:
        time.sleep(PAUSA * factor)


class PaginaBase:
    def __init__(self, driver):
        self.driver = driver
        self.espera = WebDriverWait(driver, ESPERA)

    def abrir(self, ruta):
        self.driver.get(f"{URL_BASE}{ruta}")
        pausa()

    def esperar_visible(self, localizador):
        return self.espera.until(EC.visibility_of_element_located(localizador))

    def esperar_ruta(self, fragmento):
        self.espera.until(lambda d: fragmento in d.current_url)

    def ruta_actual(self):
        return self.driver.current_url.replace(URL_BASE, "")

    def clic(self, localizador):
        elemento = self.espera.until(EC.element_to_be_clickable(localizador))
        self.driver.execute_script("arguments[0].scrollIntoView({block:'center'})", elemento)
        pausa(0.5)
        elemento.click()
        pausa()
        return elemento

    def escribir(self, localizador, texto):
        campo = self.esperar_visible(localizador)
        self.driver.execute_script("arguments[0].scrollIntoView({block:'center'})", campo)
        campo.clear()
        campo.send_keys(texto)
        pausa(0.5)
        return campo

    def texto_visible(self, texto):
        """Espera a que algun elemento visible contenga el texto."""
        from selenium.webdriver.common.by import By

        return self.esperar_visible((By.XPATH, f"//*[contains(normalize-space(.), {_xp(texto)}) and not(.//*[contains(normalize-space(.), {_xp(texto)})])]"))


def _xp(texto):
    return "'" + texto.replace("'", "") + "'"
