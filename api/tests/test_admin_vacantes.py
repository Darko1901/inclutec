from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import iniciar_sesion

VACANTES = "/api/v1/admin/vacantes"
ADMIN = "admin@inclutec.mx"
MARIANA = "mariana.lopez@correo.mx"


def _admin(cliente: TestClient) -> dict[str, str]:
    return iniciar_sesion(cliente, ADMIN)


class TestListar:
    def test_trae_todas_las_vacantes_de_todos_los_estados(self, cliente: TestClient) -> None:
        respuesta = cliente.get(VACANTES, headers=_admin(cliente))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert (cuerpo["total"], cuerpo["size"]) == (8, 25)
        assert list(cuerpo["items"][0]) == [
            "id",
            "titulo",
            "empresa",
            "categoria",
            "modalidad",
            "estado",
            "publicada_en",
            "postulados",
            "reportes_abiertos",
        ]
        # Los borradores, sin fecha de publicación, al final.
        assert [v["estado"] for v in cuerpo["items"][-2:]] == ["borrador", "borrador"]
        fechas = [v["publicada_en"] for v in cuerpo["items"][:-2]]
        assert fechas == sorted(fechas, reverse=True)

    def test_cuenta_postulados_y_reportes_abiertos(self, cliente: TestClient) -> None:
        items = {v["id"]: v for v in cliente.get(VACANTES, headers=_admin(cliente)).json()["items"]}

        assert items[1]["postulados"] == 1
        assert items[5]["reportes_abiertos"] == 1
        assert items[1]["empresa"] == {"id": 1, "nombre_comercial": "TecnoQro"}

    def test_filtra(self, cliente: TestClient) -> None:
        encabezado = _admin(cliente)

        def ids(**params):
            return sorted(
                v["id"]
                for v in cliente.get(VACANTES, params=params, headers=encabezado).json()["items"]
            )

        assert ids(q="SOPORTE") == [1]
        assert ids(empresa_id=1) == [1, 6, 7]
        assert ids(estado="borrador") == [7, 8]
        assert ids(categoria_id=1) == [1, 3, 6]
        assert ids(modalidad_id=2) == [4, 6, 8]
        assert ids(con_reportes="true") == [5]

    def test_valida_el_estado(self, cliente: TestClient) -> None:
        assert (
            cliente.get(VACANTES, params={"estado": "x"}, headers=_admin(cliente)).status_code
            == 422
        )

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        assert (
            cliente.get(VACANTES, headers=iniciar_sesion(cliente, "rh@tecnoqro.mx")).status_code
            == 403
        )


class TestModerar:
    def _estado(self, cliente: TestClient, id_: int, estado: str, motivo=None):
        return cliente.patch(
            f"{VACANTES}/{id_}/estado",
            headers=_admin(cliente),
            json={"estado": estado, "motivo": motivo},
        )

    def test_suspender_avisa_a_la_reclutadora_y_a_los_postulados(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = self._estado(cliente, 1, "suspendida", "Información engañosa")

        assert respuesta.status_code == 200
        v = respuesta.json()
        assert v["estado"] == "suspendida"
        assert v["motivo_estado"] == "Información engañosa"
        assert v["postulados"] == 1
        assert v["salario"] is not None
        avisos = db.execute(
            text(
                "SELECT usuario_id, referencia_tipo FROM notificacion WHERE tipo = 'vacante_suspendida' ORDER BY usuario_id"
            )
        ).all()
        assert [tuple(a) for a in avisos] == [(2, "vacante"), (3, "postulacion")]
        assert (
            db.scalar(
                text("SELECT accion FROM bitacora WHERE entidad = 'vacante' AND entidad_id = 1")
            )
            == "suspender"
        )
        # La reclutadora ya no puede editarla.
        laura = iniciar_sesion(cliente, "rh@tecnoqro.mx")
        assert (
            cliente.patch(
                "/api/v1/vacantes/1/estado", headers=laura, json={"estado": "pausada"}
            ).status_code
            == 409
        )

    def test_suspender_una_pausada(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE vacante SET estado = 'pausada' WHERE id = 6"))

        assert self._estado(cliente, 6, "suspendida", "x").json()["estado"] == "suspendida"

    def test_reactivar_la_deja_publicada_y_visible(self, cliente: TestClient) -> None:
        self._estado(cliente, 1, "suspendida", "x")

        v = self._estado(cliente, 1, "publicada").json()

        assert v["estado"] == "publicada"
        assert v["motivo_estado"] is None
        items = cliente.get("/api/v1/vacantes", headers=iniciar_sesion(cliente, MARIANA)).json()[
            "items"
        ]
        assert 1 in [i["id"] for i in items]

    def test_transiciones_que_no_existen(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 7, "suspendida", "x").status_code == 409
        assert self._estado(cliente, 1, "publicada").status_code == 409

    def test_suspender_exige_motivo_y_valida_el_estado(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 1, "suspendida").json()["campos"] == {
            "motivo": "Escribe el motivo de la suspensión."
        }
        assert self._estado(cliente, 1, "cerrada", "x").json()["campos"] == {
            "estado": "Elige suspendida o publicada."
        }

    def test_inexistente_da_404(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 9999, "suspendida", "x").status_code == 404
