from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.modelos import Dispositivo, Usuario
from tests.conftest import CONTRASENA_PRUEBA, iniciar_sesion

LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
LOGOUT = "/api/v1/auth/logout"

CAMPOS_USUARIO = [
    "id",
    "correo",
    "nombre",
    "apellidos",
    "telefono",
    "rol",
    "estado",
    "empresa",
    "consentimiento_sensibles",
]


def _login(cliente: TestClient, correo: str, contrasena: str = CONTRASENA_PRUEBA):
    return cliente.post(LOGIN, json={"correo": correo, "contrasena": contrasena})


class TestLogin:
    def test_candidata_recibe_la_sesion_del_contrato(self, cliente: TestClient) -> None:
        respuesta = _login(cliente, "mariana.lopez@correo.mx")

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert list(cuerpo) == ["access_token", "token_type", "expira_en", "usuario"]
        assert cuerpo["token_type"] == "bearer"
        assert cuerpo["expira_en"].endswith("Z")
        assert list(cuerpo["usuario"]) == CAMPOS_USUARIO
        assert cuerpo["usuario"] == {
            "id": 3,
            "correo": "mariana.lopez@correo.mx",
            "nombre": "Mariana",
            "apellidos": "López García",
            "telefono": "4427654321",
            "rol": "candidato",
            "estado": "activo",
            "empresa": None,
            "consentimiento_sensibles": True,
        }

    def test_reclutadora_trae_su_empresa(self, cliente: TestClient) -> None:
        usuario = _login(cliente, "rh@tecnoqro.mx").json()["usuario"]

        assert usuario["rol"] == "reclutador"
        assert usuario["empresa"] == {"id": 1, "nombre_comercial": "TecnoQro", "estado": "validada"}
        assert usuario["consentimiento_sensibles"] is None

    def test_empresa_pendiente_se_refleja_en_la_sesion(self, cliente: TestClient) -> None:
        usuario = _login(cliente, "contacto@estudiotrazo.mx").json()["usuario"]

        assert usuario["empresa"]["estado"] == "pendiente"

    def test_candidato_sin_consentimiento_va_en_false_no_en_null(self, cliente: TestClient) -> None:
        usuario = _login(cliente, "jorge.ramirez@correo.mx").json()["usuario"]

        assert usuario["consentimiento_sensibles"] is False

    def test_administrador_no_tiene_empresa_ni_consentimiento(self, cliente: TestClient) -> None:
        usuario = _login(cliente, "admin@inclutec.mx").json()["usuario"]

        assert usuario["rol"] == "administrador"
        assert usuario["empresa"] is None
        assert usuario["consentimiento_sensibles"] is None

    def test_el_correo_no_distingue_mayusculas(self, cliente: TestClient) -> None:
        assert _login(cliente, "Mariana.Lopez@Correo.MX").status_code == 200

    def test_el_token_trae_sub_rol_y_vence_en_8_horas(self, cliente: TestClient) -> None:
        token = _login(cliente, "rh@tecnoqro.mx").json()["access_token"]

        carga = jwt.decode(token, obtener_configuracion().jwt_secret, algorithms=["HS256"])

        assert carga["sub"] == "2"
        assert carga["rol"] == "reclutador"
        vence = datetime.fromtimestamp(carga["exp"], UTC)
        assert timedelta(hours=7, minutes=59) < vence - datetime.now(UTC) <= timedelta(hours=8)

    def test_registra_el_ultimo_acceso(self, cliente: TestClient, db: Session) -> None:
        _login(cliente, "mariana.lopez@correo.mx")

        acceso = db.scalar(select(Usuario.ultimo_acceso_en).where(Usuario.id == 3))
        assert acceso is not None

    def test_correo_inexistente_y_contrasena_incorrecta_dan_el_mismo_error(
        self, cliente: TestClient
    ) -> None:
        inexistente = _login(cliente, "nadie@correo.mx")
        incorrecta = _login(cliente, "mariana.lopez@correo.mx", "otra-contrasena")

        assert inexistente.status_code == incorrecta.status_code == 401
        assert inexistente.json() == incorrecta.json()
        assert incorrecta.json() == {
            "detail": "Correo o contraseña incorrectos.",
            "codigo": "credenciales_invalidas",
            "campos": None,
        }

    def test_cinco_fallos_bloquean_el_correo_con_retry_after(self, cliente: TestClient) -> None:
        for _ in range(5):
            assert _login(cliente, "jorge.ramirez@correo.mx", "mal").status_code == 401

        bloqueado = _login(cliente, "jorge.ramirez@correo.mx", "mal")
        assert bloqueado.status_code == 429
        assert bloqueado.json()["codigo"] == "demasiados_intentos"
        assert 800 < int(bloqueado.headers["Retry-After"]) <= 900
        # Ni con la contraseña correcta se entra mientras dure el bloqueo.
        assert _login(cliente, "jorge.ramirez@correo.mx").status_code == 429
        # El bloqueo es por correo: otra cuenta no se afecta.
        assert _login(cliente, "mariana.lopez@correo.mx").status_code == 200

    def test_un_acceso_correcto_reinicia_el_contador(self, cliente: TestClient) -> None:
        for _ in range(4):
            _login(cliente, "jorge.ramirez@correo.mx", "mal")
        assert _login(cliente, "jorge.ramirez@correo.mx").status_code == 200
        for _ in range(4):
            assert _login(cliente, "jorge.ramirez@correo.mx", "mal").status_code == 401

    def test_cuenta_suspendida_responde_423(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE usuario SET estado = 'suspendido' WHERE id = 4"))

        respuesta = _login(cliente, "jorge.ramirez@correo.mx")

        assert respuesta.status_code == 423
        assert respuesta.json()["codigo"] == "cuenta_suspendida"

    def test_cuenta_eliminada_responde_423(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE usuario SET estado = 'eliminado' WHERE id = 4"))

        assert _login(cliente, "jorge.ramirez@correo.mx").status_code == 423

    def test_cuenta_suspendida_con_contrasena_mala_no_revela_el_estado(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE usuario SET estado = 'suspendido' WHERE id = 4"))

        assert _login(cliente, "jorge.ramirez@correo.mx", "mal").status_code == 401

    def test_validacion_da_422_con_campos(self, cliente: TestClient) -> None:
        respuesta = cliente.post(LOGIN, json={"correo": "no-es-correo", "contrasena": ""})

        assert respuesta.status_code == 422
        cuerpo = respuesta.json()
        assert cuerpo["codigo"] == "validacion"
        assert cuerpo["detail"] == "Revisa los datos marcados."
        assert set(cuerpo["campos"]) == {"correo", "contrasena"}

    def test_cuerpo_vacio_da_422_con_los_dos_campos_obligatorios(self, cliente: TestClient) -> None:
        respuesta = cliente.post(LOGIN, json={})

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "correo": "Este campo es obligatorio.",
            "contrasena": "Este campo es obligatorio.",
        }


class TestMe:
    def test_devuelve_el_usuario_de_la_sesion(self, cliente: TestClient) -> None:
        encabezado = iniciar_sesion(cliente, "rh@tecnoqro.mx")

        respuesta = cliente.get(ME, headers=encabezado)

        assert respuesta.status_code == 200
        assert list(respuesta.json()) == CAMPOS_USUARIO
        assert respuesta.json()["empresa"]["nombre_comercial"] == "TecnoQro"

    def test_sin_token_da_401_no_autenticado(self, cliente: TestClient) -> None:
        respuesta = cliente.get(ME)

        assert respuesta.status_code == 401
        assert respuesta.json()["codigo"] == "no_autenticado"
        assert respuesta.json()["campos"] is None

    def test_token_basura_da_401(self, cliente: TestClient) -> None:
        respuesta = cliente.get(ME, headers={"Authorization": "Bearer esto.no.es.jwt"})

        assert respuesta.status_code == 401
        assert respuesta.json()["codigo"] == "no_autenticado"

    def test_token_vencido_da_401(self, cliente: TestClient) -> None:
        vencido = jwt.encode(
            {"sub": "3", "rol": "candidato", "exp": int(datetime.now(UTC).timestamp()) - 10},
            obtener_configuracion().jwt_secret,
            algorithm="HS256",
        )

        respuesta = cliente.get(ME, headers={"Authorization": f"Bearer {vencido}"})

        assert respuesta.status_code == 401

    def test_token_firmado_con_otra_clave_da_401(self, cliente: TestClient) -> None:
        falso = jwt.encode(
            {"sub": "3", "rol": "administrador", "exp": int(datetime.now(UTC).timestamp()) + 600},
            "otra-clave-que-no-es-la-del-api-0123456789",
            algorithm="HS256",
        )

        respuesta = cliente.get(ME, headers={"Authorization": f"Bearer {falso}"})

        assert respuesta.status_code == 401

    def test_usuario_inexistente_da_401(self, cliente: TestClient) -> None:
        token = jwt.encode(
            {"sub": "99999", "rol": "candidato", "exp": int(datetime.now(UTC).timestamp()) + 600},
            obtener_configuracion().jwt_secret,
            algorithm="HS256",
        )

        assert cliente.get(ME, headers={"Authorization": f"Bearer {token}"}).status_code == 401

    def test_cuenta_suspendida_despues_de_emitir_el_token_da_423(
        self, cliente: TestClient, db: Session
    ) -> None:
        encabezado = iniciar_sesion(cliente, "jorge.ramirez@correo.mx")
        db.execute(text("UPDATE usuario SET estado = 'suspendido' WHERE id = 4"))

        respuesta = cliente.get(ME, headers=encabezado)

        assert respuesta.status_code == 423
        assert respuesta.json()["codigo"] == "cuenta_suspendida"


class TestLogout:
    def test_sin_token_da_401(self, cliente: TestClient) -> None:
        assert cliente.post(LOGOUT).status_code == 401

    def test_responde_204_sin_cuerpo(self, cliente: TestClient) -> None:
        encabezado = iniciar_sesion(cliente, "mariana.lopez@correo.mx")

        respuesta = cliente.post(LOGOUT, headers=encabezado)

        assert respuesta.status_code == 204
        assert respuesta.content == b""

    def test_da_de_baja_solo_el_dispositivo_de_quien_cierra_sesion(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.add_all(
            [
                Dispositivo(
                    usuario_id=3, expo_push_token="ExponentPushToken[mariana]", plataforma="ios"
                ),
                Dispositivo(
                    usuario_id=4, expo_push_token="ExponentPushToken[jorge]", plataforma="android"
                ),
            ]
        )
        db.flush()
        encabezado = iniciar_sesion(cliente, "mariana.lopez@correo.mx")

        # Un token ajeno no se da de baja.
        cliente.post(
            LOGOUT, headers=encabezado, json={"expo_push_token": "ExponentPushToken[jorge]"}
        )
        cliente.post(
            LOGOUT, headers=encabezado, json={"expo_push_token": "ExponentPushToken[mariana]"}
        )

        quedan = set(db.scalars(select(Dispositivo.expo_push_token)))
        assert quedan == {"ExponentPushToken[jorge]"}
