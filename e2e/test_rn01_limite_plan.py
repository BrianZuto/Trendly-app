"""RN-01: el plan Gratuito admite 10 productos. Los 9 de relleno se crean y borran por API."""
import json
import urllib.error
import urllib.request

import pytest

from conftest import API_URL
from paginas.login import PaginaLogin
from paginas.productos import AsistenteNuevoProducto, PaginaProductos


def _api(metodo, ruta, cuerpo=None, token=None):
    cabeceras = {"Content-Type": "application/json"}
    if token:
        cabeceras["Authorization"] = f"Bearer {token}"
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    peticion = urllib.request.Request(f"{API_URL}{ruta}", data=datos, method=metodo, headers=cabeceras)
    with urllib.request.urlopen(peticion, timeout=60) as respuesta:
        contenido = respuesta.read()
        return json.loads(contenido) if contenido else None


@pytest.fixture
def relleno(cuenta):
    token = _api("POST", "/auth/login", {"email": cuenta["email"], "password": cuenta["password"]})["token"]
    existentes = len(_api("GET", "/productos", token=token))
    otros = [p["id"] for p in _api("GET", "/productos", token=token)]
    creados = []
    try:
        for n in range(10 - existentes):
            producto = _api("POST", "/productos", {
                "nombre": f"Relleno {n + 1}", "sku": f"REL-{n + 1:02d}", "costo": 1000, "precioVenta": 2000,
                "margenObjetivo": 30, "costosExtra": 0,
                "reventa": {"palabraClave": "relleno e2e", "marketplaces": ["MERCADOLIBRE"], "topN": 5},
            }, token=token)
            creados.append(producto["id"])
        yield
    finally:
        # Borra el relleno y tambien el "Mouse inalambrico" de la corrida: la cuenta queda vacia
        for id_ in creados + otros:
            try:
                _api("DELETE", f"/productos/{id_}", token=token)
            except urllib.error.URLError:
                pass


def test_08_rn01_producto_once_muestra_limite_del_plan(driver, cuenta, relleno):
    login = PaginaLogin(driver)
    login.abrir_pagina()
    login.iniciar_sesion(cuenta["email"], cuenta["password"])
    login.esperar_panel()

    lista = PaginaProductos(driver)
    lista.abrir_pagina()
    lista.pulsar_nuevo()
    asistente = AsistenteNuevoProducto(driver)
    asistente.llenar_datos("Producto once", "ONCE-11", 1000, 3000, 30)
    asistente.siguiente()
    asistente.esperar_paso_reventa()
    asistente.crear()

    assert "Alcanzó el límite de su plan" in asistente.error_general("Alcanzó el límite de su plan")
    assert asistente.ruta_actual() == "/productos/nuevo"
