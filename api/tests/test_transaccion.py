"""La transacción se confirma (o se deshace) ANTES de mandar la respuesta al cliente."""

import pytest
from fastapi import APIRouter, Response
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

import app.db as modulo_db
from app.dependencias import Db
from app.errores import ApiError
from app.main import app

NOMBRE = "zz sector de prueba de transaccion"


def test_la_dependencia_de_la_base_termina_antes_de_responder() -> None:
    dependencia = Db.__metadata__[0]

    assert dependencia.scope == "function"


@pytest.fixture
def cliente_real(motor):
    """Un cliente SIN el reemplazo de `obtener_db`: usa la dependencia de verdad contra la BD de
    pruebas, con commits reales (por eso cada prueba limpia lo que crea)."""
    anterior = (modulo_db._motor, modulo_db._fabrica)
    modulo_db._motor = motor
    modulo_db._fabrica = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)
    app.dependency_overrides.clear()
    try:
        with TestClient(app, raise_server_exceptions=False) as cliente:
            yield cliente
    finally:
        modulo_db._motor, modulo_db._fabrica = anterior
        with Session(motor) as limpieza:
            limpieza.execute(text("DELETE FROM sector WHERE nombre = :n"), {"n": NOMBRE})
            limpieza.commit()


def _ruta_de_prueba(motor, vistos: list[bool], fallar: bool) -> int:
    """Agrega una ruta que escribe con `Db` y cuya respuesta mira la BD justo al enviarse."""

    class Verificadora(Response):
        async def __call__(self, scope, receive, send) -> None:
            with Session(motor) as sesion:
                vistos.append(
                    sesion.scalar(
                        text("SELECT count(*) FROM sector WHERE nombre = :n"), {"n": NOMBRE}
                    )
                    == 1
                )
            await super().__call__(scope, receive, send)

    antes = len(app.router.routes)
    ruta = APIRouter()

    @ruta.post("/api/v1/_prueba_transaccion")
    def _escribe(db: Db) -> Response:
        db.execute(text("INSERT INTO sector (nombre, activo) VALUES (:n, TRUE)"), {"n": NOMBRE})
        if fallar:
            raise ApiError(409, "estado_invalido", "falla a propósito")
        return Verificadora(status_code=204)

    app.include_router(ruta)
    return antes


def _quitar_ruta_de_prueba(antes: int) -> None:
    del app.router.routes[antes:]


def test_el_cambio_ya_esta_confirmado_cuando_se_envia_la_respuesta(motor, cliente_real) -> None:
    vistos: list[bool] = []
    antes = _ruta_de_prueba(motor, vistos, fallar=False)
    try:
        respuesta = cliente_real.post("/api/v1/_prueba_transaccion")
    finally:
        _quitar_ruta_de_prueba(antes)

    assert respuesta.status_code == 204
    assert vistos == [True]


def test_un_error_deshace_el_cambio(motor, cliente_real) -> None:
    vistos: list[bool] = []
    antes = _ruta_de_prueba(motor, vistos, fallar=True)
    try:
        respuesta = cliente_real.post("/api/v1/_prueba_transaccion")
    finally:
        _quitar_ruta_de_prueba(antes)

    assert respuesta.status_code == 409
    with Session(motor) as sesion:
        assert (
            sesion.scalar(text("SELECT count(*) FROM sector WHERE nombre = :n"), {"n": NOMBRE}) == 0
        )


def test_un_flujo_real_deja_ver_el_cambio_de_inmediato(motor, cliente_real) -> None:
    """Registrar y entrar de inmediato: lo que causó el 'hueco' que mostró la prueba manual."""
    datos = {
        "nombre": "Ana",
        "apellidos": "Prueba",
        "correo": "transaccion@correo.mx",
        "telefono": "4425550000",
        "municipio_id": 2,
        "contrasena": "Segura2026",
        "acepta_aviso": True,
        "consentimiento_sensibles": False,
    }
    try:
        assert cliente_real.post("/api/v1/auth/registro/candidato", json=datos).status_code == 201
        entrada = cliente_real.post(
            "/api/v1/auth/login", json={"correo": datos["correo"], "contrasena": "Segura2026"}
        )
        assert entrada.status_code == 200
        encabezado = {"Authorization": f"Bearer {entrada.json()['access_token']}"}
        baja = cliente_real.request(
            "DELETE", "/api/v1/candidatos/me", headers=encabezado, json={"contrasena": "Segura2026"}
        )
        assert baja.status_code == 204
        # Recién eliminada, ya no puede entrar.
        despues = cliente_real.post(
            "/api/v1/auth/login", json={"correo": datos["correo"], "contrasena": "Segura2026"}
        )
        assert despues.status_code == 423
    finally:
        with Session(motor) as limpieza:
            limpieza.execute(text("DELETE FROM usuario WHERE correo = :c"), {"c": datos["correo"]})
            limpieza.commit()
