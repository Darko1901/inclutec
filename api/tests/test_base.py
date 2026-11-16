"""Manejador global de errores, seguridad y documentación del API."""

import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.errores import ApiError
from app.main import app
from app.seguridad import crear_token, hashear_contrasena, leer_token, verificar_contrasena


def test_ruta_inexistente_da_404_con_la_forma_del_contrato(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/no-existe")

    assert respuesta.status_code == 404
    assert set(respuesta.json()) == {"detail", "codigo", "campos"}
    assert respuesta.json()["codigo"] == "no_encontrado"


def test_metodo_no_permitido_da_405_con_la_forma_del_contrato(cliente: TestClient) -> None:
    respuesta = cliente.delete("/api/v1/auth/login")

    assert respuesta.status_code == 405
    assert set(respuesta.json()) == {"detail", "codigo", "campos"}


def test_error_no_previsto_da_500_error_interno(cliente: TestClient) -> None:
    prueba = APIRouter()

    @prueba.get("/api/v1/_falla")
    def _falla() -> None:
        raise RuntimeError("falla inesperada")

    app.include_router(prueba)
    try:
        respuesta = cliente.get("/api/v1/_falla")
    finally:
        app.router.routes.pop()

    assert respuesta.status_code == 500
    assert respuesta.json() == {
        "detail": "El servicio no está disponible; intenta más tarde.",
        "codigo": "error_interno",
        "campos": None,
    }
    assert "falla inesperada" not in respuesta.text


def test_api_error_conserva_status_codigo_campos_y_encabezados(cliente: TestClient) -> None:
    prueba = APIRouter()

    @prueba.get("/api/v1/_espera")
    def _espera() -> None:
        raise ApiError(
            429, "reenvio_prematuro", "Espera.", {"correo": "x"}, encabezados={"Retry-After": "7"}
        )

    app.include_router(prueba)
    try:
        respuesta = cliente.get("/api/v1/_espera")
    finally:
        app.router.routes.pop()

    assert respuesta.status_code == 429
    assert respuesta.headers["Retry-After"] == "7"
    assert respuesta.json() == {
        "detail": "Espera.",
        "codigo": "reenvio_prematuro",
        "campos": {"correo": "x"},
    }


def test_documentacion_openapi_en_docs(cliente: TestClient) -> None:
    assert cliente.get("/docs").status_code == 200
    esquema = cliente.get("/openapi.json").json()
    assert "/api/v1/auth/login" in esquema["paths"]
    assert "/api/v1/catalogos/{tipo}" in esquema["paths"]


def test_bcrypt_hashea_con_cost_de_10_o_mas() -> None:
    hash_guardado = hashear_contrasena("Inclutec2026")

    assert hash_guardado.startswith("$2b$")
    assert int(hash_guardado.split("$")[2]) >= 10
    assert verificar_contrasena("Inclutec2026", hash_guardado)
    assert not verificar_contrasena("otra", hash_guardado)


def test_hash_mal_formado_no_deja_pasar_ni_truena() -> None:
    assert verificar_contrasena("lo-que-sea", "esto-no-es-un-hash") is False


@pytest.mark.parametrize("token", ["", "abc", "a.b.c"])
def test_leer_token_rechaza_basura(token: str) -> None:
    assert leer_token(token) is None


def test_token_creado_se_puede_leer() -> None:
    token, _ = crear_token(7, "reclutador")

    assert leer_token(token)["sub"] == "7"


def test_cuerpo_ilegible_da_422_validacion(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/v1/auth/login",
        content=b'{"correo": "P\xe9rez"}',
        headers={"Content-Type": "application/json"},
    )

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "validacion"
    assert "cuerpo" in respuesta.json()["campos"]
