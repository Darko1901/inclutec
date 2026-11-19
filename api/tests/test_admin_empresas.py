from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import iniciar_sesion

EMPRESAS = "/api/v1/admin/empresas"
ADMIN = "admin@inclutec.mx"
LAURA = "rh@tecnoqro.mx"
MARIANA = "mariana.lopez@correo.mx"

ENTRADA = {
    "razon_social": "Nueva Empresa S.A. de C.V.",
    "nombre_comercial": "Nueva",
    "rfc": "nem200101ab1",
    "sector_id": 4,
    "tamano_empresa_id": 2,
    "municipio_id": 3,
    "direccion": "Calle 1",
    "descripcion": None,
    "sitio_web": "https://nueva.mx",
    "practicas_inclusion": None,
}


def _admin(cliente: TestClient) -> dict[str, str]:
    return iniciar_sesion(cliente, ADMIN)


def _avisos(db: Session, usuario_id: int, tipo: str) -> list[tuple]:
    return [
        tuple(f)
        for f in db.execute(
            text(
                "SELECT mensaje, referencia_tipo, referencia_id FROM notificacion WHERE usuario_id = :u AND tipo = :t"
            ),
            {"u": usuario_id, "t": tipo},
        )
    ]


class TestListar:
    def test_las_pendientes_primero_y_luego_por_nombre(self, cliente: TestClient) -> None:
        respuesta = cliente.get(EMPRESAS, headers=_admin(cliente))

        assert respuesta.status_code == 200
        items = respuesta.json()["items"]
        assert items[0]["nombre_comercial"] == "Estudio Trazo"
        assert items[0]["estado"] == "pendiente"
        resto = [e["nombre_comercial"] for e in items[1:]]
        assert resto == sorted(resto, key=str.casefold)
        assert list(items[0]) == [
            "id",
            "razon_social",
            "nombre_comercial",
            "rfc",
            "sector",
            "estado",
            "reclutadores",
            "vacantes_activas",
            "documento",
            "creado_en",
        ]

    def test_cuenta_reclutadores_vacantes_y_constancia(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text(
                "UPDATE empresa SET documento_url = '/archivos/documentos/empresa-1.pdf' WHERE id = 1"
            )
        )

        tecnoqro = next(
            e
            for e in cliente.get(EMPRESAS, headers=_admin(cliente)).json()["items"]
            if e["id"] == 1
        )

        assert tecnoqro["reclutadores"] == 1
        assert tecnoqro["vacantes_activas"] == 2
        assert tecnoqro["documento"] is True

    def test_busca_y_filtra(self, cliente: TestClient) -> None:
        encabezado = _admin(cliente)

        def ids(**params):
            return sorted(
                e["id"]
                for e in cliente.get(EMPRESAS, params=params, headers=encabezado).json()["items"]
            )

        assert ids(q="tqu150312") == [1]
        assert ids(q="querétaro") == [1]
        assert ids(q="estudio") == [4]
        assert ids(estado="pendiente") == [4]
        assert ids(sector_id=4) == [1]
        assert ids(q="_") == []

    def test_valida_el_estado(self, cliente: TestClient) -> None:
        assert (
            cliente.get(EMPRESAS, params={"estado": "x"}, headers=_admin(cliente)).status_code
            == 422
        )

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        assert cliente.get(EMPRESAS, headers=iniciar_sesion(cliente, LAURA)).status_code == 403


class TestDetalle:
    def test_trae_la_empresa_sus_reclutadores_y_reportes(self, cliente: TestClient) -> None:
        d = cliente.get(f"{EMPRESAS}/3", headers=_admin(cliente)).json()

        assert list(d) == ["empresa", "reclutadores", "rfc_duplicado", "reportes"]
        assert d["empresa"]["nombre_comercial"] == "ConCentro"
        assert d["empresa"]["puesto"] is None
        assert d["reclutadores"] == [
            {
                "usuario_id": 6,
                "nombre": "Patricia",
                "apellidos": "Núñez Ortega",
                "correo": "talento@concentro.mx",
                "puesto": "Coordinadora de Talento",
                "estado": "activo",
            }
        ]
        assert d["rfc_duplicado"] is False
        # El reporte de S002 es sobre su vacante 5.
        assert d["reportes"] == 1

    def test_inexistente_da_404(self, cliente: TestClient) -> None:
        assert cliente.get(f"{EMPRESAS}/9999", headers=_admin(cliente)).status_code == 404


class TestCrearYEditar:
    def test_crea_validada_con_el_rfc_en_mayusculas(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(EMPRESAS, headers=_admin(cliente), json=ENTRADA)

        assert respuesta.status_code == 201
        e = respuesta.json()
        assert e["estado"] == "validada"
        assert e["rfc"] == "NEM200101AB1"
        assert e["validada_en"] is not None
        assert e["puesto"] is None
        assert (
            db.scalar(
                text("SELECT count(*) FROM bitacora WHERE entidad = 'empresa' AND accion = 'crear'")
            )
            == 1
        )

    def test_rfc_repetido_da_409(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            EMPRESAS, headers=_admin(cliente), json={**ENTRADA, "rfc": "TQU150312AB1"}
        )

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "rfc_duplicado"

    def test_valida_cada_campo(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            EMPRESAS,
            headers=_admin(cliente),
            json={
                "razon_social": "",
                "nombre_comercial": "x" * 151,
                "rfc": "123",
                "sector_id": 999,
                "tamano_empresa_id": 999,
                "municipio_id": 999,
                "descripcion": "x" * 1001,
                "sitio_web": "nueva.mx",
            },
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {
            "razon_social",
            "nombre_comercial",
            "rfc",
            "sector_id",
            "tamano_empresa_id",
            "municipio_id",
            "descripcion",
            "sitio_web",
        }

    def test_corrige_razon_social_y_rfc_de_una_validada(self, cliente: TestClient) -> None:
        datos = {
            **ENTRADA,
            "razon_social": "Tecnologías QRO S.A.",
            "nombre_comercial": "TecnoQro",
            "rfc": "TQR150312AB1",
        }

        respuesta = cliente.put(f"{EMPRESAS}/1", headers=_admin(cliente), json=datos)

        assert respuesta.status_code == 200
        assert respuesta.json()["rfc"] == "TQR150312AB1"
        assert respuesta.json()["estado"] == "validada"

    def test_editar_con_el_mismo_rfc_no_choca_consigo_misma(self, cliente: TestClient) -> None:
        datos = {**ENTRADA, "nombre_comercial": "TecnoQro", "rfc": "TQU150312AB1"}

        assert cliente.put(f"{EMPRESAS}/1", headers=_admin(cliente), json=datos).status_code == 200

    def test_editar_con_el_rfc_de_otra_da_409(self, cliente: TestClient) -> None:
        datos = {**ENTRADA, "rfc": "TQU150312AB1"}

        assert cliente.put(f"{EMPRESAS}/2", headers=_admin(cliente), json=datos).status_code == 409


class TestValidacion:
    def _validar(self, cliente: TestClient, id_: int, decision: str, motivo=None):
        return cliente.patch(
            f"{EMPRESAS}/{id_}/validacion",
            headers=_admin(cliente),
            json={"decision": decision, "motivo": motivo},
        )

    def test_validar_permite_publicar_y_avisa_al_reclutador(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = self._validar(cliente, 4, "validada")

        assert respuesta.status_code == 200
        e = respuesta.json()
        assert e["estado"] == "validada"
        assert e["validada_en"] is not None
        assert db.scalar(text("SELECT validada_por FROM empresa WHERE id = 4")) == 1
        assert _avisos(db, 7, "empresa_validada")[0][1:] == ("empresa", 4)
        assert (
            db.scalar(
                text("SELECT accion FROM bitacora WHERE entidad = 'empresa' AND entidad_id = 4")
            )
            == "validar"
        )
        # Y la sesión del reclutador ya dice «validada».
        sesion = cliente.get(
            "/api/v1/auth/me", headers=iniciar_sesion(cliente, "contacto@estudiotrazo.mx")
        ).json()
        assert sesion["empresa"]["estado"] == "validada"

    def test_rechazar_exige_motivo_y_lo_comunica(self, cliente: TestClient, db: Session) -> None:
        sin_motivo = self._validar(cliente, 4, "rechazada", " ")
        con_motivo = self._validar(cliente, 4, "rechazada", "La constancia no es legible.")

        assert sin_motivo.status_code == 422
        assert sin_motivo.json()["campos"] == {"motivo": "Escribe el motivo del rechazo."}
        assert con_motivo.json()["estado"] == "rechazada"
        assert con_motivo.json()["motivo_estado"] == "La constancia no es legible."
        assert "La constancia no es legible." in _avisos(db, 7, "empresa_rechazada")[0][0]

    def test_solo_una_pendiente(self, cliente: TestClient) -> None:
        respuesta = self._validar(cliente, 1, "validada")

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "estado_invalido"

    def test_valida_la_decision(self, cliente: TestClient) -> None:
        assert self._validar(cliente, 4, "quizas").json()["campos"] == {
            "decision": "Elige validar o rechazar."
        }


class TestSuspension:
    def _estado(self, cliente: TestClient, id_: int, estado: str, motivo=None):
        return cliente.patch(
            f"{EMPRESAS}/{id_}/estado",
            headers=_admin(cliente),
            json={"estado": estado, "motivo": motivo},
        )

    def test_suspender_suspende_sus_vacantes_y_avisa(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = self._estado(cliente, 1, "suspendida", "Información falsa")

        assert respuesta.status_code == 200
        r = respuesta.json()
        assert list(r) == ["empresa", "vacantes_suspendidas", "postulados_notificados"]
        assert r["empresa"]["estado"] == "suspendida"
        assert r["empresa"]["motivo_estado"] == "Información falsa"
        # TecnoQro tiene 2 publicadas (1 y 6); Mariana está en proceso en la 1.
        assert r["vacantes_suspendidas"] == 2
        assert r["postulados_notificados"] == 1
        assert (
            db.scalar(
                text("SELECT count(*) FROM vacante WHERE empresa_id = 1 AND estado = 'suspendida'")
            )
            == 2
        )
        assert db.scalar(text("SELECT estado FROM vacante WHERE id = 7")) == "borrador"
        assert _avisos(db, 3, "vacante_suspendida")[0][1:] == ("postulacion", 1)
        assert len(_avisos(db, 2, "vacante_suspendida")) == 1
        # Los candidatos ya no la ven.
        items = cliente.get("/api/v1/vacantes", headers=iniciar_sesion(cliente, MARIANA)).json()[
            "items"
        ]
        assert {1, 6}.isdisjoint(v["id"] for v in items)

    def test_reactivar_deja_las_vacantes_suspendidas(
        self, cliente: TestClient, db: Session
    ) -> None:
        self._estado(cliente, 1, "suspendida", "x")

        r = self._estado(cliente, 1, "validada").json()

        assert r["empresa"]["estado"] == "validada"
        assert r["empresa"]["motivo_estado"] is None
        assert r["vacantes_suspendidas"] == 0
        assert (
            db.scalar(
                text("SELECT count(*) FROM vacante WHERE empresa_id = 1 AND estado = 'suspendida'")
            )
            == 2
        )

    def test_solo_se_suspende_una_validada_y_se_reactiva_una_suspendida(
        self, cliente: TestClient
    ) -> None:
        assert self._estado(cliente, 4, "suspendida", "x").status_code == 409
        assert self._estado(cliente, 1, "validada").status_code == 409

    def test_suspender_exige_motivo(self, cliente: TestClient) -> None:
        respuesta = self._estado(cliente, 1, "suspendida")

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {"motivo": "Escribe el motivo de la suspensión."}

    def test_valida_el_estado(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 1, "rechazada", "x").json()["campos"] == {
            "estado": "Elige suspendida o validada."
        }
