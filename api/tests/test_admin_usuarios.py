from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import iniciar_sesion

USUARIOS = "/api/v1/admin/usuarios"
ADMIN = "admin@inclutec.mx"
LAURA = "rh@tecnoqro.mx"


def _admin(cliente: TestClient) -> dict[str, str]:
    return iniciar_sesion(cliente, ADMIN)


NUEVO_CANDIDATO = {
    "rol": "candidato",
    "nombre": "Ana",
    "apellidos": "Panel",
    "correo": "Ana.Panel@correo.mx",
    "telefono": "4425551234",
    "contrasena": "Segura2026",
}


class TestListar:
    def test_trae_a_todos_con_la_forma_del_contrato(self, cliente: TestClient) -> None:
        respuesta = cliente.get(USUARIOS, headers=_admin(cliente))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert (cuerpo["total"], cuerpo["page"], cuerpo["size"]) == (7, 1, 25)
        laura = next(u for u in cuerpo["items"] if u["id"] == 2)
        assert list(laura) == [
            "id",
            "nombre",
            "apellidos",
            "correo",
            "telefono",
            "rol",
            "estado",
            "empresa",
            "creado_en",
            "ultimo_acceso_en",
        ]
        assert laura["rol"] == "reclutador"
        assert laura["empresa"] == {"id": 1, "nombre_comercial": "TecnoQro"}
        mariana = next(u for u in cuerpo["items"] if u["id"] == 3)
        assert mariana["empresa"] is None
        # Nunca salen datos sensibles ni la contraseña.
        assert "contrasena_hash" not in mariana and "necesidades" not in mariana

    def test_busca_y_filtra(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE usuario SET estado = 'suspendido' WHERE id = 4"))
        encabezado = _admin(cliente)

        def ids(**params):
            return sorted(
                u["id"]
                for u in cliente.get(USUARIOS, params=params, headers=encabezado).json()["items"]
            )

        assert ids(q="mariana") == [3]
        assert ids(q="LÓPEZ") == [3]
        assert ids(q="tecnoqro.mx") == [2]
        assert ids(q="laura hernández") == [2]
        assert ids(q="%") == []
        assert ids(rol="candidato") == [3, 4]
        assert ids(rol="reclutador") == [2, 5, 6, 7]
        assert ids(estado="suspendido") == [4]
        assert ids(rol="candidato", estado="activo") == [3]

    def test_los_mas_recientes_primero(self, cliente: TestClient) -> None:
        creado = cliente.post(USUARIOS, headers=_admin(cliente), json=NUEVO_CANDIDATO).json()

        primero = cliente.get(USUARIOS, headers=_admin(cliente)).json()["items"][0]

        assert primero["id"] == creado["id"]

    def test_valida_los_filtros(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            USUARIOS, params={"rol": "dios", "estado": "x"}, headers=_admin(cliente)
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"rol", "estado"}

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        assert cliente.get(USUARIOS, headers=iniciar_sesion(cliente, LAURA)).status_code == 403
        assert cliente.get(USUARIOS).status_code == 401


class TestDetalle:
    def test_candidata_con_sus_totales_y_sin_necesidades(self, cliente: TestClient) -> None:
        d = cliente.get(f"{USUARIOS}/3", headers=_admin(cliente)).json()

        assert list(d) == ["usuario", "motivo_estado", "puesto", "totales"]
        assert d["puesto"] is None
        assert d["totales"] == {
            "postulaciones": 1,
            "vacantes": None,
            "reportes_recibidos": 0,
            "reportes_hechos": 0,
        }
        assert "necesidades" not in str(d)

    def test_reclutadora_con_puesto_y_vacantes(self, cliente: TestClient) -> None:
        d = cliente.get(f"{USUARIOS}/2", headers=_admin(cliente)).json()

        assert d["puesto"] == "Coordinadora de Recursos Humanos"
        assert d["totales"]["vacantes"] == 3
        assert d["totales"]["postulaciones"] is None

    def test_reportes_hechos_y_recibidos(self, cliente: TestClient) -> None:
        # S002: Jorge reportó la vacante 5, que publicó Patricia (id 6).
        encabezado = _admin(cliente)

        assert (
            cliente.get(f"{USUARIOS}/4", headers=encabezado).json()["totales"]["reportes_hechos"]
            == 1
        )
        assert (
            cliente.get(f"{USUARIOS}/6", headers=encabezado).json()["totales"]["reportes_recibidos"]
            == 1
        )

    def test_inexistente_da_404(self, cliente: TestClient) -> None:
        assert cliente.get(f"{USUARIOS}/9999", headers=_admin(cliente)).status_code == 404
        assert cliente.get(f"{USUARIOS}/{10**30}", headers=_admin(cliente)).status_code == 404


class TestCrear:
    def test_crea_un_candidato_sin_consentimiento_que_puede_entrar(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = cliente.post(USUARIOS, headers=_admin(cliente), json=NUEVO_CANDIDATO)

        assert respuesta.status_code == 201
        u = respuesta.json()
        assert u["correo"] == "ana.panel@correo.mx"
        assert u["rol"] == "candidato"
        assert u["estado"] == "activo"
        assert u["ultimo_acceso_en"] is None
        assert (
            db.scalar(
                text("SELECT consentimiento_sensibles_en FROM candidato WHERE usuario_id = :i"),
                {"i": u["id"]},
            )
            is None
        )
        entrada = cliente.post(
            "/api/v1/auth/login", json={"correo": "ana.panel@correo.mx", "contrasena": "Segura2026"}
        )
        assert entrada.status_code == 200
        assert entrada.json()["usuario"]["consentimiento_sensibles"] is False

    def test_crea_un_reclutador_de_una_empresa(self, cliente: TestClient, db: Session) -> None:
        datos = {**NUEVO_CANDIDATO, "rol": "reclutador", "empresa_id": 2, "puesto": "Analista"}

        u = cliente.post(USUARIOS, headers=_admin(cliente), json=datos).json()

        assert u["empresa"] == {"id": 2, "nombre_comercial": "LogiBajío"}
        assert (
            db.scalar(text("SELECT puesto FROM reclutador WHERE usuario_id = :i"), {"i": u["id"]})
            == "Analista"
        )

    def test_crea_un_administrador(self, cliente: TestClient) -> None:
        u = cliente.post(
            USUARIOS, headers=_admin(cliente), json={**NUEVO_CANDIDATO, "rol": "administrador"}
        ).json()

        assert u["rol"] == "administrador"
        assert (
            cliente.post(
                "/api/v1/auth/login",
                json={"correo": "ana.panel@correo.mx", "contrasena": "Segura2026"},
            ).json()["usuario"]["rol"]
            == "administrador"
        )

    def test_correo_repetido_da_409(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            USUARIOS, headers=_admin(cliente), json={**NUEVO_CANDIDATO, "correo": "RH@tecnoqro.mx"}
        )

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "correo_duplicado"

    def test_valida_cada_campo(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            USUARIOS,
            headers=_admin(cliente),
            json={
                "rol": "reclutador",
                "nombre": " ",
                "apellidos": "x" * 121,
                "correo": "x",
                "telefono": "1",
                "contrasena": "corta",
                "empresa_id": 999,
            },
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {
            "nombre",
            "apellidos",
            "correo",
            "telefono",
            "contrasena",
            "empresa_id",
            "puesto",
        }

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        assert (
            cliente.post(
                USUARIOS, headers=iniciar_sesion(cliente, LAURA), json=NUEVO_CANDIDATO
            ).status_code
            == 403
        )


class TestEditar:
    def test_edita_los_datos_y_no_cambia_la_contrasena(self, cliente: TestClient) -> None:
        datos = {
            "rol": "candidato",
            "nombre": "Mariana",
            "apellidos": "López",
            "correo": "mariana.nueva@correo.mx",
            "telefono": None,
            "contrasena": "Ignorada2026",
        }

        respuesta = cliente.put(f"{USUARIOS}/3", headers=_admin(cliente), json=datos)

        assert respuesta.status_code == 200
        assert respuesta.json()["correo"] == "mariana.nueva@correo.mx"
        assert respuesta.json()["telefono"] is None
        login = cliente.post(
            "/api/v1/auth/login",
            json={"correo": "mariana.nueva@correo.mx", "contrasena": "Inclutec2026"},
        )
        assert login.status_code == 200

    def test_cambia_la_empresa_y_el_puesto_de_un_reclutador(self, cliente: TestClient) -> None:
        datos = {
            "rol": "reclutador",
            "nombre": "Laura",
            "apellidos": "Hernández Ruiz",
            "correo": LAURA,
            "empresa_id": 3,
            "puesto": "Directora",
        }

        u = cliente.put(f"{USUARIOS}/2", headers=_admin(cliente), json=datos).json()

        assert u["empresa"]["id"] == 3
        assert cliente.get(f"{USUARIOS}/2", headers=_admin(cliente)).json()["puesto"] == "Directora"

    def test_no_cambia_el_rol_de_quien_tiene_postulaciones_o_vacantes(
        self, cliente: TestClient
    ) -> None:
        encabezado = _admin(cliente)

        candidata = cliente.put(
            f"{USUARIOS}/3",
            headers=encabezado,
            json={
                "rol": "administrador",
                "nombre": "Mariana",
                "apellidos": "López García",
                "correo": "mariana.lopez@correo.mx",
            },
        )
        reclutadora = cliente.put(
            f"{USUARIOS}/2",
            headers=encabezado,
            json={
                "rol": "candidato",
                "nombre": "Laura",
                "apellidos": "Hernández Ruiz",
                "correo": LAURA,
            },
        )

        assert candidata.status_code == reclutadora.status_code == 409
        assert candidata.json()["codigo"] == "en_uso"

    def test_cambia_el_rol_de_quien_no_tiene_historial(
        self, cliente: TestClient, db: Session
    ) -> None:
        nuevo = cliente.post(USUARIOS, headers=_admin(cliente), json=NUEVO_CANDIDATO).json()

        respuesta = cliente.put(
            f"{USUARIOS}/{nuevo['id']}",
            headers=_admin(cliente),
            json={**NUEVO_CANDIDATO, "rol": "reclutador", "empresa_id": 1, "puesto": "Reclutadora"},
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["rol"] == "reclutador"
        assert (
            db.scalar(
                text("SELECT count(*) FROM candidato WHERE usuario_id = :i"), {"i": nuevo["id"]}
            )
            == 0
        )
        assert (
            db.scalar(
                text("SELECT empresa_id FROM reclutador WHERE usuario_id = :i"), {"i": nuevo["id"]}
            )
            == 1
        )

    def test_correo_de_otro_da_409_y_el_propio_no(self, cliente: TestClient) -> None:
        base = {"rol": "candidato", "nombre": "Mariana", "apellidos": "López García"}

        ajeno = cliente.put(
            f"{USUARIOS}/3", headers=_admin(cliente), json={**base, "correo": LAURA}
        )
        propio = cliente.put(
            f"{USUARIOS}/3",
            headers=_admin(cliente),
            json={**base, "correo": "mariana.lopez@correo.mx"},
        )

        assert ajeno.status_code == 409
        assert propio.status_code == 200

    def test_inexistente_da_404(self, cliente: TestClient) -> None:
        assert (
            cliente.put(
                f"{USUARIOS}/9999", headers=_admin(cliente), json=NUEVO_CANDIDATO
            ).status_code
            == 404
        )


class TestEstado:
    def _estado(self, cliente: TestClient, id_: int, estado: str, motivo=None):
        return cliente.patch(
            f"{USUARIOS}/{id_}/estado",
            headers=_admin(cliente),
            json={"estado": estado, "motivo": motivo},
        )

    def test_suspender_impide_entrar_y_reactivar_lo_permite(self, cliente: TestClient) -> None:
        suspendido = self._estado(cliente, 4, "suspendido", "Conducta inapropiada")
        login = cliente.post(
            "/api/v1/auth/login",
            json={"correo": "jorge.ramirez@correo.mx", "contrasena": "Inclutec2026"},
        )
        reactivado = self._estado(cliente, 4, "activo")

        assert suspendido.status_code == 200
        assert suspendido.json()["estado"] == "suspendido"
        assert login.status_code == 423
        assert reactivado.json()["estado"] == "activo"
        assert cliente.get(f"{USUARIOS}/4", headers=_admin(cliente)).json()["motivo_estado"] is None

    def test_guarda_el_motivo(self, cliente: TestClient) -> None:
        self._estado(cliente, 4, "suspendido", "  Spam  ")

        assert (
            cliente.get(f"{USUARIOS}/4", headers=_admin(cliente)).json()["motivo_estado"] == "Spam"
        )

    def test_suspender_o_dar_de_baja_exige_motivo(self, cliente: TestClient) -> None:
        for estado in ("suspendido", "eliminado"):
            respuesta = self._estado(cliente, 4, estado, " ")
            assert respuesta.status_code == 422
            assert respuesta.json()["campos"] == {"motivo": "Escribe el motivo."}

    def test_una_cuenta_eliminada_ya_no_cambia(self, cliente: TestClient) -> None:
        self._estado(cliente, 4, "eliminado", "Lo pidió")

        respuesta = self._estado(cliente, 4, "activo")

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "transicion_invalida"

    def test_el_mismo_estado_no_es_una_transicion(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 4, "activo").status_code == 409

    def test_dar_de_baja_a_un_candidato_retira_sus_postulaciones(
        self, cliente: TestClient, db: Session
    ) -> None:
        """Igual que cuando él mismo se da de baja: ninguna empresa sigue con su proceso."""
        db.execute(
            text(
                "INSERT INTO dispositivo (usuario_id, expo_push_token, plataforma) VALUES (3, 'ExponentPushToken[baja]', 'android')"
            )
        )
        # S002: Mariana (3) está en «entrevista» en la vacante 1, con la entrevista agendada.

        assert self._estado(cliente, 3, "eliminado", "Lo pidió por correo").status_code == 200

        assert db.scalar(text("SELECT estado FROM postulacion WHERE id = 1")) == "retirada"
        assert (
            db.scalar(
                text(
                    "SELECT usuario_id FROM historial_postulacion WHERE postulacion_id = 1 AND estado_nuevo = 'retirada'"
                )
            )
            == 1
        )
        assert db.scalar(text("SELECT estado FROM entrevista WHERE postulacion_id = 1")) == (
            "cancelada"
        )
        assert db.scalar(text("SELECT count(*) FROM dispositivo WHERE usuario_id = 3")) == 0
        # Sus datos no se borran: el contrato pide nunca borrar físicamente.
        assert db.scalar(text("SELECT count(*) FROM candidato_habilidad WHERE candidato_id = 3"))

    def test_suspender_no_toca_sus_postulaciones(self, cliente: TestClient, db: Session) -> None:
        self._estado(cliente, 3, "suspendido", "Revisión")

        assert db.scalar(text("SELECT estado FROM postulacion WHERE id = 1")) == "entrevista"

    def test_el_administrador_no_se_suspende_a_si_mismo(self, cliente: TestClient) -> None:
        respuesta = self._estado(cliente, 1, "suspendido", "Prueba")

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "estado_invalido"

    def test_valida_el_estado_y_el_largo_del_motivo(self, cliente: TestClient) -> None:
        mal = self._estado(cliente, 4, "borrado", "x")
        largo = self._estado(cliente, 4, "suspendido", "x" * 256)

        assert mal.json()["campos"] == {"estado": "Elige activo, suspendido o eliminado."}
        assert largo.json()["campos"] == {"motivo": "Debe tener máximo 255 caracteres."}

    def test_inexistente_da_404(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 9999, "suspendido", "x").status_code == 404
