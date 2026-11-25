"""La clave pública de ejemplo nunca firma tokens."""

import pytest
from pydantic import ValidationError

import app.config as configuracion

# Sin pasar por la caché de obtener_configuracion: las demás pruebas comparten esa instancia.
leer_configuracion = configuracion.obtener_configuracion.__wrapped__


def test_con_la_clave_de_ejemplo_se_usa_una_aleatoria_y_estable(monkeypatch, tmp_path) -> None:
    archivo = tmp_path / ".jwt_secreto"
    monkeypatch.setattr(configuracion, "ARCHIVO_SECRETO_LOCAL", archivo)
    monkeypatch.setenv("JWT_SECRET", configuracion.JWT_SECRET_DE_EJEMPLO)

    primera = leer_configuracion()
    segunda = leer_configuracion()

    assert primera.jwt_secret != configuracion.JWT_SECRET_DE_EJEMPLO
    assert len(primera.jwt_secret) >= 48
    # Se guarda: un reinicio (o --reload) no cierra las sesiones.
    assert segunda.jwt_secret == primera.jwt_secret
    assert archivo.read_text(encoding="utf-8") == primera.jwt_secret


def test_una_clave_propia_se_respeta(monkeypatch, tmp_path) -> None:
    archivo = tmp_path / ".jwt_secreto"
    monkeypatch.setattr(configuracion, "ARCHIVO_SECRETO_LOCAL", archivo)
    monkeypatch.setenv("JWT_SECRET", "una-clave-propia-larga-y-aleatoria-de-prueba")

    assert leer_configuracion().jwt_secret == "una-clave-propia-larga-y-aleatoria-de-prueba"
    assert not archivo.exists()


def test_un_costo_de_bcrypt_menor_a_10_impide_arrancar(monkeypatch) -> None:
    monkeypatch.setenv("BCRYPT_COST", "4")

    with pytest.raises(ValidationError):
        leer_configuracion()
