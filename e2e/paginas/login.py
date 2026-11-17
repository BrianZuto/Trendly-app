from selenium.webdriver.common.by import By

from .base import PaginaBase


class PaginaLogin(PaginaBase):
    def abrir_pagina(self):
        self.abrir("/login")
        self.titulo()

    def titulo(self):
        return self.esperar_visible((By.XPATH, "//h1[normalize-space()='Iniciar sesión']"))

    def mensaje_exito(self):
        return self.esperar_visible((By.XPATH, "//*[contains(., 'Cuenta creada')]")).text

    def iniciar_sesion(self, email, password):
        self.escribir((By.NAME, "email"), email)
        self.escribir((By.NAME, "password"), password)
        self.clic((By.XPATH, "//button[@type='submit' and contains(., 'Iniciar sesión')]"))

    def esperar_panel(self):
        self.esperar_ruta("/dashboard")
        return self.esperar_visible((By.XPATH, "//h1[contains(., 'Tablero de precios')]"))
