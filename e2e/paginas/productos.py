from selenium.webdriver.common.by import By

from .base import PaginaBase


class PaginaProductos(PaginaBase):
    def abrir_pagina(self):
        self.abrir("/productos")
        self.titulo()

    def titulo(self):
        return self.esperar_visible((By.XPATH, "//h1[normalize-space()='Productos']"))

    def pulsar_nuevo(self):
        self.clic((By.XPATH, "//button[contains(., 'Nuevo producto')]"))
        self.esperar_ruta("/productos/nuevo")
        self.esperar_visible((By.XPATH, "//h1[normalize-space()='Nuevo producto']"))

    def aparece(self, nombre):
        """Espera a que el producto salga en la lista (tabla o tarjetas)."""
        self.esperar_ruta("/productos")
        return self.esperar_visible((By.XPATH, f"//a[contains(normalize-space(.), '{nombre}')]"))

    def esta_en_lista(self, nombre):
        return any(e.is_displayed() for e in self.driver.find_elements(By.XPATH, f"//a[contains(normalize-space(.), '{nombre}')]"))


class AsistenteNuevoProducto(PaginaBase):
    """Pantalla /productos/nuevo. Con el backend real salta el paso de proveedor."""

    def llenar_datos(self, nombre, sku, costo, precio, margen):
        self.escribir((By.NAME, "nombre"), nombre)
        self.escribir((By.NAME, "sku"), sku)
        self.escribir((By.NAME, "costo"), str(costo))
        self.escribir((By.NAME, "precioVenta"), str(precio))
        self.escribir((By.NAME, "margenObjetivo"), str(margen))

    def siguiente(self):
        self.clic((By.XPATH, "//button[@type='submit' and normalize-space()='Siguiente']"))

    def esperar_paso_reventa(self):
        return self.esperar_visible((By.XPATH, "//h2[contains(., 'comparar tu precio de reventa')]"))

    def crear(self):
        self.clic((By.XPATH, "//button[@type='submit' and contains(., 'Crear producto')]"))

    def error_de_campo(self, texto):
        return self.esperar_visible((By.XPATH, f"//p[@role='alert' and contains(., '{texto}')]")).text

    def error_general(self, texto):
        return self.esperar_visible((By.XPATH, f"//*[@role='alert' or contains(@class,'mensaje')][contains(., '{texto}')]")).text
