from selenium.webdriver.common.by import By

from .base import PaginaBase


class BarraPrincipal(PaginaBase):
    """Barra superior de la zona privada."""

    def ir_a(self, nombre):
        self.clic((By.XPATH, f"//nav[@aria-label='Principal']//a[starts-with(normalize-space(.), '{nombre}')]"))

    def cerrar_sesion(self):
        self.clic((By.CSS_SELECTOR, "button[aria-label='Cerrar sesión']"))
