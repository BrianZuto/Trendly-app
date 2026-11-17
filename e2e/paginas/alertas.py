from selenium.webdriver.common.by import By

from .base import PaginaBase

DIALOGO = (By.CSS_SELECTOR, "[role='dialog']")


class PaginaAlertas(PaginaBase):
    def abrir_pagina(self):
        self.abrir("/alertas")
        self.esperar_visible((By.XPATH, "//button[contains(., 'Preferencias de aviso')]"))

    def abrir_preferencias(self):
        self.clic((By.XPATH, "//button[contains(., 'Preferencias de aviso')]"))
        return self.esperar_visible(DIALOGO)

    def campo_umbral(self):
        return self.esperar_visible((By.NAME, "umbralPct"))

    def interruptor_correo(self):
        return self.esperar_visible((By.XPATH, "//input[@role='switch' and @id=//label[normalize-space()='Alertas por correo']/@for]"))

    def cancelar(self):
        self.clic((By.XPATH, "//*[@role='dialog']//button[normalize-space()='Cancelar']"))
        self.espera.until_not(lambda d: any(e.is_displayed() for e in d.find_elements(*DIALOGO)))
