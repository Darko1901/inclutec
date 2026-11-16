from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.modelos import Candidato, Empresa, Reclutador, Usuario

CANDIDATO = "/api/v1/auth/registro/candidato"
RECLUTADOR = "/api/v1/auth/registro/reclutador"

DATOS_CANDIDATO = {
    "nombre": "Ana",
    "apellidos": "Pérez Luna",
    "correo": "ana.perez@correo.mx",
    "telefono": "4425550101",
    "municipio_id": 2,
    "contrasena": "Segura2026",
    "acepta_aviso": True,
    "consentimiento_sensibles": True,
}

DATOS_RECLUTADOR = {
    "reclutador": {
        "nombre": "Luis",
        "apellidos": "Mora Ríos",
        "puesto": "Gerente de Talento",
        "correo": "luis.mora@nuevaempresa.mx",
        "telefono": "4425550102",
        "contrasena": "Segura2026",
    },
    "empresa": {
        "razon_social": "Nueva Empresa S.A. de C.V.",
        "nombre_comercial": "NuevaEmpresa",
        "rfc": "NEM200101AB1",
        "sector_id": 4,
        "tamano_empresa_id": 2,
        "municipio_id": 3,
    },
    "acepta_aviso": True,
}


class TestRegistroCandidato:
    def test_crea_la_cuenta_y_devuelve_la_sesion(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(CANDIDATO, json=DATOS_CANDIDATO)

        assert respuesta.status_code == 201
        cuerpo = respuesta.json()
        assert cuerpo["token_type"] == "bearer"
        assert cuerpo["usuario"] == {
            "id": cuerpo["usuario"]["id"],
            "correo": "ana.perez@correo.mx",
            "nombre": "Ana",
            "apellidos": "Pérez Luna",
            "telefono": "4425550101",
            "rol": "candidato",
            "estado": "activo",
            "empresa": None,
            "consentimiento_sensibles": True,
        }
        # La sesión sirve para entrar de inmediato.
        encabezado = {"Authorization": f"Bearer {cuerpo['access_token']}"}
        assert cliente.get("/api/v1/auth/me", headers=encabezado).status_code == 200
        candidato = db.get(Candidato, cuerpo["usuario"]["id"])
        assert candidato.municipio_id == 2
        assert candidato.consentimiento_sensibles_en is not None
        # Perfil vacío: solo cuentan los datos personales (20 puntos).
        assert candidato.completitud == 20

    def test_sin_consentimiento_la_seccion_queda_deshabilitada(self, cliente: TestClient) -> None:
        datos = {**DATOS_CANDIDATO, "consentimiento_sensibles": False}

        usuario = cliente.post(CANDIDATO, json=datos).json()["usuario"]

        assert usuario["consentimiento_sensibles"] is False

    def test_el_correo_se_guarda_en_minusculas_y_la_contrasena_con_bcrypt(
        self, cliente: TestClient, db: Session
    ) -> None:
        cliente.post(CANDIDATO, json={**DATOS_CANDIDATO, "correo": "Ana.Perez@Correo.MX"})

        usuario = db.scalar(select(Usuario).where(Usuario.correo == "ana.perez@correo.mx"))
        assert usuario is not None
        assert usuario.contrasena_hash.startswith("$2b$")
        assert "Segura2026" not in usuario.contrasena_hash
        assert usuario.acepto_aviso_en is not None

    def test_la_cuenta_nueva_puede_iniciar_sesion(self, cliente: TestClient) -> None:
        cliente.post(CANDIDATO, json=DATOS_CANDIDATO)

        respuesta = cliente.post(
            "/api/v1/auth/login", json={"correo": "ana.perez@correo.mx", "contrasena": "Segura2026"}
        )

        assert respuesta.status_code == 200

    def test_correo_repetido_da_409(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            CANDIDATO, json={**DATOS_CANDIDATO, "correo": "MARIANA.lopez@correo.mx"}
        )

        assert respuesta.status_code == 409
        assert respuesta.json() == {
            "detail": "Ese correo ya está registrado.",
            "codigo": "correo_duplicado",
            "campos": {"correo": "Ese correo ya está registrado."},
        }

    def test_valida_cada_campo_con_los_mensajes_del_contrato(self, cliente: TestClient) -> None:
        datos = {
            "nombre": " ",
            "apellidos": "x" * 121,
            "correo": "no-es-correo",
            "telefono": "123",
            "municipio_id": 999999,
            "contrasena": "sololetras",
            "acepta_aviso": False,
        }

        respuesta = cliente.post(CANDIDATO, json=datos)

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "validacion"
        assert respuesta.json()["campos"] == {
            "nombre": "Escribe tu nombre (máximo 80 caracteres).",
            "apellidos": "Escribe tus apellidos (máximo 120 caracteres).",
            "correo": "Escribe un correo válido.",
            "telefono": "Escribe un teléfono de 10 dígitos, sin espacios.",
            "municipio_id": "Elige tu municipio.",
            "contrasena": (
                "La contraseña debe tener de 8 a 64 caracteres, con al menos una letra y un número."
            ),
            "acepta_aviso": "Debes aceptar el aviso de privacidad.",
        }

    def test_un_cuerpo_vacio_marca_todos_los_obligatorios(self, cliente: TestClient) -> None:
        respuesta = cliente.post(CANDIDATO, json={})

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {
            "nombre",
            "apellidos",
            "correo",
            "telefono",
            "municipio_id",
            "contrasena",
            "acepta_aviso",
        }

    def test_acepta_aviso_debe_ser_exactamente_true(self, cliente: TestClient) -> None:
        sin_campo = {k: v for k, v in DATOS_CANDIDATO.items() if k != "acepta_aviso"}

        assert cliente.post(CANDIDATO, json=sin_campo).status_code == 422

    def test_no_crea_nada_si_falla_la_validacion(self, cliente: TestClient, db: Session) -> None:
        antes = db.scalar(text("SELECT count(*) FROM usuario"))

        cliente.post(CANDIDATO, json={**DATOS_CANDIDATO, "telefono": "1"})

        assert db.scalar(text("SELECT count(*) FROM usuario")) == antes


class TestRegistroReclutador:
    def test_crea_cuenta_y_empresa_pendiente(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(RECLUTADOR, json=DATOS_RECLUTADOR)

        assert respuesta.status_code == 201
        usuario = respuesta.json()["usuario"]
        assert usuario["rol"] == "reclutador"
        assert usuario["consentimiento_sensibles"] is None
        assert usuario["empresa"] == {
            "id": usuario["empresa"]["id"],
            "nombre_comercial": "NuevaEmpresa",
            "estado": "pendiente",
        }
        empresa = db.get(Empresa, usuario["empresa"]["id"])
        assert empresa.rfc == "NEM200101AB1"
        assert empresa.estado == "pendiente"
        assert db.get(Reclutador, usuario["id"]).puesto == "Gerente de Talento"

    def test_rfc_repetido_da_409_y_marca_empresa_rfc(self, cliente: TestClient) -> None:
        datos = {
            **DATOS_RECLUTADOR,
            "empresa": {**DATOS_RECLUTADOR["empresa"], "rfc": "TQU150312AB1"},
        }

        respuesta = cliente.post(RECLUTADOR, json=datos)

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "rfc_duplicado"
        assert respuesta.json()["campos"] == {"empresa.rfc": "Otra empresa ya registró ese RFC."}

    def test_correo_repetido_da_409(self, cliente: TestClient) -> None:
        reclutador = {**DATOS_RECLUTADOR["reclutador"], "correo": "rh@tecnoqro.mx"}

        respuesta = cliente.post(RECLUTADOR, json={**DATOS_RECLUTADOR, "reclutador": reclutador})

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "correo_duplicado"

    def test_un_registro_rechazado_no_deja_la_empresa_a_medias(
        self, cliente: TestClient, db: Session
    ) -> None:
        reclutador = {**DATOS_RECLUTADOR["reclutador"], "correo": "rh@tecnoqro.mx"}
        antes = db.scalar(text("SELECT count(*) FROM empresa"))

        cliente.post(RECLUTADOR, json={**DATOS_RECLUTADOR, "reclutador": reclutador})

        assert db.scalar(text("SELECT count(*) FROM empresa")) == antes

    def test_valida_con_nombres_de_campo_anidados(self, cliente: TestClient) -> None:
        datos = {
            "reclutador": {
                "nombre": "",
                "puesto": "",
                "correo": "x",
                "telefono": "1",
                "contrasena": "1",
            },
            "empresa": {
                "rfc": "abc",
                "sector_id": 999,
                "tamano_empresa_id": 999,
                "municipio_id": 999,
            },
            "acepta_aviso": False,
        }

        respuesta = cliente.post(RECLUTADOR, json=datos)

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {
            "reclutador.nombre",
            "reclutador.apellidos",
            "reclutador.puesto",
            "reclutador.correo",
            "reclutador.telefono",
            "reclutador.contrasena",
            "empresa.razon_social",
            "empresa.nombre_comercial",
            "empresa.rfc",
            "empresa.sector_id",
            "empresa.tamano_empresa_id",
            "empresa.municipio_id",
            "acepta_aviso",
        }
        assert respuesta.json()["campos"]["empresa.rfc"] == (
            "Escribe un RFC de 12 o 13 caracteres, en mayúsculas."
        )

    def test_cuerpo_vacio_marca_todo_sin_tronar(self, cliente: TestClient) -> None:
        respuesta = cliente.post(RECLUTADOR, json={})

        assert respuesta.status_code == 422
        assert "reclutador.nombre" in respuesta.json()["campos"]
        assert "empresa.rfc" in respuesta.json()["campos"]
