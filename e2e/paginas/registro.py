from selenium.webdriver.common.by import By

from .base import PaginaBase

POLITICA = (By.NAME, "aceptaPolitica")


class PaginaRegistro(PaginaBase):
    def abrir_pagina(self):
        self.abrir("/registro")
        self.esperar_visible((By.XPATH, "//h1[normalize-space()='Crear cuenta']"))

    def llenar(self, nombre, email, password):
        self.escribir((By.NAME, "nombre"), nombre)
        self.escribir((By.NAME, "email"), email)
        self.escribir((By.NAME, "password"), password)
        self.escribir((By.NAME, "confirmar"), password)

    def marcar_politica(self):
        self.clic(POLITICA)

    def politica_marcada(self):
        return self.driver.find_element(*POLITICA).is_selected()

    def enviar(self):
        self.clic((By.XPATH, "//button[@type='submit' and contains(., 'Crear cuenta')]"))

    def error_politica(self):
        return self.esperar_visible((By.XPATH, "//p[@role='alert' and contains(., 'política')]")).text
