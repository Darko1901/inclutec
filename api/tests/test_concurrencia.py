"""Peticiones iguales que llegan al mismo tiempo (un doble toque en la app).

Corren con transacciones reales (sin el reemplazo de `obtener_db`), dos hilos y una barrera para
que las dos peticiones se crucen; cada prueba deja la base como estaba.
"""

import threading

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

import app.db as modulo_db
from app.main import app
from app.seguridad import crear_token

MARIANA = 3  # candidata de S002
LAURA = 2  # reclutadora de TecnoQro (vacantes 1, 6 y 7)


def _encabezado(usuario_id: int, rol: str) -> dict[str, str]:
    # El token se firma aquí: iniciar sesión dejaría ultimo_acceso_en confirmado en la base.
    return {"Authorization": f"Bearer {crear_token(usuario_id, rol)[0]}"}


@pytest.fixture
def cliente_real(motor):
    anterior = (modulo_db._motor, modulo_db._fabrica)
    modulo_db._motor = motor
    modulo_db._fabrica = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)
    app.dependency_overrides.clear()
    try:
        with TestClient(app, raise_server_exceptions=False) as cliente:
            yield cliente
    finally:
        modulo_db._motor, modulo_db._fabrica = anterior


def _a_la_vez(peticion, veces: int = 2) -> list:
    """Lanza la misma petición en varios hilos a la vez y devuelve las respuestas."""
    barrera = threading.Barrier(veces)
    respuestas: list = []
    candado = threading.Lock()

    def correr() -> None:
        barrera.wait()
        respuesta = peticion()
        with candado:
            respuestas.append(respuesta)

    hilos = [threading.Thread(target=correr) for _ in range(veces)]
    for hilo in hilos:
        hilo.start()
    for hilo in hilos:
        hilo.join(timeout=60)
    return respuestas


def test_postularse_dos_veces_a_la_vez_responde_409_no_500(motor, cliente_real) -> None:
    try:
        respuestas = _a_la_vez(
            lambda: cliente_real.post(
                "/api/v1/postulaciones",
                headers=_encabezado(MARIANA, "candidato"),
                json={"vacante_id": 2, "mensaje": None, "compartir_ajustes": False},
            )
        )

        assert sorted(r.status_code for r in respuestas) == [201, 409]
        conflicto = next(r for r in respuestas if r.status_code == 409).json()
        assert conflicto["codigo"] == "postulacion_duplicada"
        with Session(motor) as sesion:
            assert (
                sesion.scalar(
                    text(
                        "SELECT count(*) FROM postulacion WHERE candidato_id = 3 AND vacante_id = 2"
                    )
                )
                == 1
            )
    finally:
        with Session(motor) as limpieza:
            ids = list(
                limpieza.scalars(
                    text("SELECT id FROM postulacion WHERE candidato_id = 3 AND vacante_id = 2")
                )
            )
            if ids:
                limpieza.execute(
                    text(
                        "DELETE FROM notificacion WHERE referencia_tipo = 'postulacion' "
                        "AND referencia_id = ANY(:ids)"
                    ),
                    {"ids": ids},
                )
                limpieza.execute(text("DELETE FROM postulacion WHERE id = ANY(:ids)"), {"ids": ids})
            limpieza.commit()


def test_aceptar_dos_veces_a_la_vez_solo_cuenta_una(motor, cliente_real) -> None:
    """La postulación 1 (Mariana, vacante 1) está en «entrevista»: solo una «aceptada» pasa."""
    try:
        respuestas = _a_la_vez(
            lambda: cliente_real.patch(
                "/api/v1/postulaciones/1/estado",
                headers=_encabezado(LAURA, "reclutador"),
                json={"estado": "aceptada", "mensaje": None},
            )
        )

        assert sorted(r.status_code for r in respuestas) == [200, 409]
        with Session(motor) as sesion:
            aceptadas = sesion.scalar(
                text(
                    "SELECT count(*) FROM historial_postulacion "
                    "WHERE postulacion_id = 1 AND estado_nuevo = 'aceptada'"
                )
            )
            avisos = sesion.scalar(
                text(
                    "SELECT count(*) FROM notificacion WHERE usuario_id = 3 "
                    "AND tipo = 'cambio_estado' AND referencia_id = 1 AND mensaje LIKE '%Aceptada%'"
                )
            )
        assert (aceptadas, avisos) == (1, 1)
    finally:
        with Session(motor) as limpieza:
            limpieza.execute(
                text(
                    "DELETE FROM historial_postulacion "
                    "WHERE postulacion_id = 1 AND estado_nuevo = 'aceptada'"
                )
            )
            limpieza.execute(
                text(
                    "DELETE FROM notificacion WHERE usuario_id = 3 "
                    "AND tipo = 'cambio_estado' AND referencia_id = 1 AND mensaje LIKE '%Aceptada%'"
                )
            )
            limpieza.execute(text("UPDATE postulacion SET estado = 'entrevista' WHERE id = 1"))
            limpieza.commit()


def test_registrar_el_mismo_dispositivo_a_la_vez_deja_uno(motor, cliente_real) -> None:
    token = "ExponentPushToken[doble-registro]"
    try:
        respuestas = _a_la_vez(
            lambda: cliente_real.post(
                "/api/v1/dispositivos",
                headers=_encabezado(MARIANA, "candidato"),
                json={"expo_push_token": token, "plataforma": "android"},
            )
        )

        assert [r.status_code for r in respuestas] == [204, 204]
        with Session(motor) as sesion:
            assert (
                sesion.scalar(
                    text("SELECT count(*) FROM dispositivo WHERE expo_push_token = :t"),
                    {"t": token},
                )
                == 1
            )
    finally:
        with Session(motor) as limpieza:
            limpieza.execute(
                text("DELETE FROM dispositivo WHERE expo_push_token = :t"), {"t": token}
            )
            limpieza.commit()
