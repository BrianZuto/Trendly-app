"""Flujo principal de Trendly de punta a punta. Los casos van en orden y comparten sesion de navegador."""
import pytest
from selenium.webdriver.common.by import By

from paginas.alertas import PaginaAlertas
from paginas.base import pausa
from paginas.login import PaginaLogin
from paginas.panel import BarraPrincipal
from paginas.productos import AsistenteNuevoProducto, PaginaProductos
from paginas.registro import PaginaRegistro

PRODUCTO = {"nombre": "Mouse inalámbrico", "sku": "MOU-01", "costo": 25000, "precio": 59900, "margen": 35}


def test_01_rn02_registro_exige_aceptar_la_politica(driver, cuenta):
    """RN-02 (Ley 1581): sin aceptar la politica no se crea la cuenta; al aceptarla, si."""
    registro = PaginaRegistro(driver)
    registro.abrir_pagina()
    registro.llenar(cuenta["nombre"], cuenta["email"], cuenta["password"])
    assert not registro.politica_marcada()
    registro.enviar()

    assert "política de tratamiento de datos" in registro.error_politica()
    assert registro.ruta_actual() == "/registro", "No debia salir de /registro sin aceptar la politica"
    pausa(2)

    registro.marcar_politica()
    assert registro.politica_marcada()
    registro.enviar()
    registro.esperar_ruta("/login")
    assert "Cuenta creada" in PaginaLogin(driver).mensaje_exito()


def test_02_rutas_privadas_redirigen_al_login_sin_sesion(driver):
    driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    productos = PaginaLogin(driver)
    productos.abrir("/productos")
    productos.esperar_ruta("/login")
    assert productos.titulo().is_displayed()
    assert productos.ruta_actual().startswith("/login")


def test_03_inicio_de_sesion_lleva_al_panel(driver, cuenta):
    login = PaginaLogin(driver)
    login.abrir_pagina()
    login.iniciar_sesion(cuenta["email"], cuenta["password"])
    assert login.esperar_panel().is_displayed()
    assert login.ruta_actual() == "/dashboard"


def test_04_registrar_producto_p1_aparece_en_la_lista(driver):
    lista = PaginaProductos(driver)
    lista.abrir_pagina()
    lista.pulsar_nuevo()

    asistente = AsistenteNuevoProducto(driver)
    asistente.llenar_datos(**PRODUCTO)
    asistente.siguiente()
    asistente.esperar_paso_reventa()
    asistente.crear()

    lista.aparece(PRODUCTO["nombre"])
    assert lista.ruta_actual().startswith("/productos")
    assert lista.esta_en_lista(PRODUCTO["nombre"])


def test_05_validacion_costo_cero_muestra_error(driver):
    lista = PaginaProductos(driver)
    lista.abrir_pagina()
    lista.pulsar_nuevo()

    asistente = AsistenteNuevoProducto(driver)
    asistente.llenar_datos("Producto invalido", "INV-01", 0, 59900, 35)
    asistente.siguiente()

    assert "El costo debe ser mayor que 0" in asistente.error_de_campo("costo")
    assert asistente.ruta_actual() == "/productos/nuevo", "No debia avanzar con costo 0"
    assert not driver.find_elements(By.XPATH, "//h2[contains(., 'comparar tu precio de reventa')]")


def test_06_preferencias_de_aviso_se_abren_y_se_cancelan(driver):
    alertas = PaginaAlertas(driver)
    alertas.abrir_pagina()
    dialogo = alertas.abrir_preferencias()
    assert "Preferencias de aviso" in dialogo.text

    umbral = alertas.campo_umbral()
    assert umbral.get_attribute("value") not in ("", None), "El umbral debe venir con un valor"
    interruptor = alertas.interruptor_correo()
    assert interruptor.is_displayed()
    estado_inicial = interruptor.is_selected()
    pausa(1.5)

    alertas.cancelar()
    alertas.abrir_preferencias()
    assert alertas.interruptor_correo().is_selected() == estado_inicial
    alertas.cancelar()


def test_07_cerrar_sesion_vuelve_a_la_pantalla_publica(driver):
    BarraPrincipal(driver).cerrar_sesion()
    login = PaginaLogin(driver)
    login.esperar_ruta("/login")
    assert login.titulo().is_displayed()

    login.abrir("/alertas")
    login.esperar_ruta("/login")
    assert login.titulo().is_displayed(), "Tras cerrar sesion, las rutas privadas deben seguir cerradas"
