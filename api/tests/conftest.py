"""Fixtures de pytest: una BD de pruebas creada desde db/ y una transacción por prueba.

La BD se recrea sola al iniciar la corrida: aplica db/migraciones/V*.sql y db/semillas/S*.sql,
igual que `db/scripts/crear_bd.sh`. Cada prueba corre dentro de una transacción que se deshace
al terminar, así que ninguna deja datos para la siguiente. Se configura con TEST_DATABASE_URL
(ver .env.example).
"""

from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_db
from app.main import app
from app.routers.auth import limite_login

RAIZ_REPO = Path(__file__).resolve().parents[2]
CONTRASENA_PRUEBA = "Inclutec2026"


def _conninfo(url_sqlalchemy: str, base: str | None = None) -> str:
    url = make_url(url_sqlalchemy)
    return (
        f"host={url.host} port={url.port or 5432} user={url.username} "
        f"password={url.password} dbname={base or url.database}"
    )


def _aplicar_scripts(conninfo: str) -> None:
    archivos = sorted((RAIZ_REPO / "db" / "migraciones").glob("V*.sql")) + sorted(
        (RAIZ_REPO / "db" / "semillas").glob("S*.sql")
    )
    with psycopg.connect(conninfo, autocommit=True) as conexion:
        for archivo in archivos:
            conexion.execute(archivo.read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def url_pruebas() -> str:
    url = obtener_configuracion().test_database_url
    nombre = make_url(url).database
    with psycopg.connect(_conninfo(url, "postgres"), autocommit=True) as conexion:
        conexion.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(nombre)))
        conexion.execute(
            sql.SQL("CREATE DATABASE {} ENCODING 'UTF8'").format(sql.Identifier(nombre))
        )
    _aplicar_scripts(_conninfo(url))
    return url


@pytest.fixture(scope="session")
def motor(url_pruebas: str) -> Iterator:
    motor = create_engine(url_pruebas)
    yield motor
    motor.dispose()


@pytest.fixture
def db(motor) -> Iterator[Session]:
    """Sesión dentro de una transacción externa; los commit del API quedan en un savepoint."""
    conexion = motor.connect()
    transaccion = conexion.begin()
    sesion = Session(
        bind=conexion, join_transaction_mode="create_savepoint", expire_on_commit=False
    )
    try:
        yield sesion
    finally:
        sesion.close()
        transaccion.rollback()
        conexion.close()


@pytest.fixture
def cliente(db: Session) -> Iterator[TestClient]:
    def _db() -> Iterator[Session]:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise

    app.dependency_overrides[obtener_db] = _db
    limite_login.reiniciar()
    # raise_server_exceptions=False: un error no previsto debe verse como el 500 del contrato.
    with TestClient(app, raise_server_exceptions=False) as cliente:
        yield cliente
    app.dependency_overrides.clear()


def iniciar_sesion(cliente: TestClient, correo: str) -> dict[str, str]:
    """Hace login con una cuenta de S002 y devuelve el encabezado Authorization."""
    respuesta = cliente.post(
        "/api/v1/auth/login", json={"correo": correo, "contrasena": CONTRASENA_PRUEBA}
    )
    assert respuesta.status_code == 200, respuesta.text
    return {"Authorization": f"Bearer {respuesta.json()['access_token']}"}
