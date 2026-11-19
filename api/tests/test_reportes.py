from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import iniciar_sesion

REPORTES = "/api/v1/reportes"
ADMIN_REPORTES = "/api/v1/admin/reportes"
MARIANA = "mariana.lopez@correo.mx"
JORGE = "jorge.ramirez@correo.mx"  # S002: reportó la vacante 5 (reporte 1, abierto)
LAURA = "rh@tecnoqro.mx"
ADMIN = "admin@inclutec.mx"


def _como(cliente: TestClient, correo: str) -> dict[str, str]:
    return iniciar_sesion(cliente, correo)


def _motivo(db: Session, aplica_a: str) -> int:
    return db.scalar(
        text("SELECT id FROM motivo_reporte WHERE aplica_a = :a AND activo ORDER BY id LIMIT 1"),
        {"a": aplica_a},
    )


class TestReportar:
    def test_el_candidato_reporta_una_vacante(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(
            REPORTES,
            headers=_como(cliente, MARIANA),
            json={
                "motivo_reporte_id": _motivo(db, "vacante"),
                "vacante_id": 2,
                "descripcion": "  Raro  ",
            },
        )

        assert respuesta.status_code == 201
        r = respuesta.json()
        assert list(r) == ["id", "estado", "creado_en"]
        assert r["estado"] == "abierto"
        fila = db.execute(
            text(
                "SELECT reportante_id, vacante_id, empresa_id, candidato_id, descripcion FROM reporte WHERE id = :i"
            ),
            {"i": r["id"]},
        ).one()
        assert tuple(fila) == (3, 2, None, None, "Raro")
        historial = db.execute(
            text(
                "SELECT estado_anterior, estado_nuevo FROM historial_reporte WHERE reporte_id = :i"
            ),
            {"i": r["id"]},
        ).all()
        assert [tuple(h) for h in historial] == [(None, "abierto")]

    def test_el_candidato_reporta_una_empresa_con_un_motivo_para_todos(
        self, cliente: TestClient, db: Session
    ) -> None:
        motivo = _motivo(db, "todos") or _motivo(db, "empresa")

        respuesta = cliente.post(
            REPORTES,
            headers=_como(cliente, MARIANA),
            json={"motivo_reporte_id": motivo, "empresa_id": 1},
        )

        assert respuesta.status_code == 201

    def test_la_reclutadora_reporta_a_quien_se_postulo_a_su_empresa(
        self, cliente: TestClient, db: Session
    ) -> None:
        motivo = _motivo(db, "candidato") or _motivo(db, "todos")

        mariana = cliente.post(
            REPORTES,
            headers=_como(cliente, LAURA),
            json={"motivo_reporte_id": motivo, "candidato_id": 3},
        )
        # Jorge no se postuló a ninguna vacante de TecnoQro.
        jorge = cliente.post(
            REPORTES,
            headers=_como(cliente, LAURA),
            json={"motivo_reporte_id": motivo, "candidato_id": 4},
        )

        assert mariana.status_code == 201
        assert jorge.status_code == 404

    def test_cada_rol_solo_reporta_lo_que_le_toca(self, cliente: TestClient, db: Session) -> None:
        candidato_a_candidato = cliente.post(
            REPORTES,
            headers=_como(cliente, MARIANA),
            json={
                "motivo_reporte_id": _motivo(db, "candidato") or _motivo(db, "todos"),
                "candidato_id": 4,
            },
        )
        reclutador_a_vacante = cliente.post(
            REPORTES,
            headers=_como(cliente, LAURA),
            json={"motivo_reporte_id": _motivo(db, "vacante"), "vacante_id": 2},
        )

        assert candidato_a_candidato.status_code == reclutador_a_vacante.status_code == 403

    def test_lo_que_no_es_visible_da_404(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, MARIANA)

        borrador = cliente.post(
            REPORTES,
            headers=encabezado,
            json={"motivo_reporte_id": _motivo(db, "vacante"), "vacante_id": 7},
        )
        pendiente = cliente.post(
            REPORTES,
            headers=encabezado,
            json={
                "motivo_reporte_id": _motivo(db, "todos") or _motivo(db, "empresa"),
                "empresa_id": 4,
            },
        )
        enorme = cliente.post(
            REPORTES,
            headers=encabezado,
            json={"motivo_reporte_id": _motivo(db, "vacante"), "vacante_id": 10**30},
        )

        assert borrador.status_code == pendiente.status_code == enorme.status_code == 404

    def test_exactamente_un_elemento(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, MARIANA)
        motivo = _motivo(db, "vacante")

        dos = cliente.post(
            REPORTES,
            headers=encabezado,
            json={"motivo_reporte_id": motivo, "vacante_id": 2, "empresa_id": 1},
        )
        ninguno = cliente.post(REPORTES, headers=encabezado, json={"motivo_reporte_id": motivo})

        assert dos.status_code == ninguno.status_code == 422
        assert dos.json()["campos"] == {
            "vacante_id": "Indica exactamente una vacante, una empresa o un candidato."
        }

    def test_el_motivo_debe_aplicar_a_lo_reportado(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(
            REPORTES,
            headers=_como(cliente, MARIANA),
            json={"motivo_reporte_id": _motivo(db, "vacante"), "empresa_id": 1},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "motivo_reporte_id": "Ese motivo no aplica a lo que estás reportando."
        }

    def test_valida_motivo_y_descripcion(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            REPORTES,
            headers=_como(cliente, MARIANA),
            json={"motivo_reporte_id": 999, "vacante_id": 2, "descripcion": "x" * 501},
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"motivo_reporte_id", "descripcion"}

    def test_el_administrador_no_reporta(self, cliente: TestClient, db: Session) -> None:
        cuerpo = {"motivo_reporte_id": _motivo(db, "vacante"), "vacante_id": 2}

        assert cliente.post(REPORTES, headers=_como(cliente, ADMIN), json=cuerpo).status_code == 403
        assert cliente.post(REPORTES, json=cuerpo).status_code == 401


class TestBandeja:
    def test_trae_el_reporte_de_s002_con_la_forma_del_contrato(self, cliente: TestClient) -> None:
        respuesta = cliente.get(ADMIN_REPORTES, headers=_como(cliente, ADMIN))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert (cuerpo["total"], cuerpo["page"], cuerpo["size"]) == (1, 1, 25)
        r = cuerpo["items"][0]
        assert list(r) == ["id", "tipo", "objeto", "motivo", "reportante", "estado", "creado_en"]
        assert r["tipo"] == "vacante"
        assert r["objeto"] == {"id": 5, "nombre": "Ejecutivo de atención telefónica · ConCentro"}
        assert r["reportante"] == {"id": 4, "nombre": "Jorge", "apellidos": "Ramírez Soto"}
        assert r["estado"] == "abierto"

    def test_filtra_y_ordena(self, cliente: TestClient, db: Session) -> None:
        nuevo = cliente.post(
            REPORTES,
            headers=_como(cliente, MARIANA),
            json={
                "motivo_reporte_id": _motivo(db, "todos") or _motivo(db, "empresa"),
                "empresa_id": 1,
            },
        ).json()["id"]
        encabezado = _como(cliente, ADMIN)

        def ids(**params):
            return [
                r["id"]
                for r in cliente.get(ADMIN_REPORTES, params=params, headers=encabezado).json()[
                    "items"
                ]
            ]

        assert ids() == [1, nuevo]
        assert ids(orden="recientes") == [nuevo, 1]
        assert ids(tipo="empresa") == [nuevo]
        assert ids(tipo="vacante", estado="abierto") == [1]
        assert ids(vacante_id=5) == [1]
        assert ids(empresa_id=1) == [nuevo]
        assert ids(candidato_id=3) == []
        assert ids(estado="resuelto") == []

    def test_valida_los_filtros(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            ADMIN_REPORTES,
            params={"estado": "x", "tipo": "usuario", "orden": "azar"},
            headers=_como(cliente, ADMIN),
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"estado", "tipo", "orden"}

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        assert cliente.get(ADMIN_REPORTES, headers=_como(cliente, LAURA)).status_code == 403
        assert cliente.get(ADMIN_REPORTES, headers=_como(cliente, MARIANA)).status_code == 403


class TestDetalleYSeguimiento:
    def _patch(self, cliente: TestClient, cuerpo: dict, id_: int = 1):
        return cliente.patch(f"{ADMIN_REPORTES}/{id_}", headers=_como(cliente, ADMIN), json=cuerpo)

    def test_detalle_con_historial_estado_del_elemento_y_previos(
        self, cliente: TestClient, db: Session
    ) -> None:
        cliente.post(
            REPORTES,
            headers=_como(cliente, MARIANA),
            json={"motivo_reporte_id": _motivo(db, "vacante"), "vacante_id": 5},
        )

        d = cliente.get(f"{ADMIN_REPORTES}/1", headers=_como(cliente, ADMIN)).json()

        assert list(d) == [
            "reporte",
            "descripcion",
            "resolucion",
            "accion",
            "atendido_por",
            "cerrado_en",
            "historial",
            "objeto_estado",
            "reportes_previos",
        ]
        assert (
            d["descripcion"]
            == "El salario publicado no coincide con lo que me dijeron por teléfono."
        )
        assert d["objeto_estado"] == "publicada"
        assert d["historial"][0]["estado_nuevo"] == "abierto"
        assert d["historial"][0]["usuario"] == {"id": 4, "nombre": "Jorge"}
        assert [p["estado"] for p in d["reportes_previos"]] == ["abierto"]
        assert set(d["reportes_previos"][0]) == {"id", "motivo", "estado", "creado_en"}

    def test_inexistente_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, ADMIN)

        assert cliente.get(f"{ADMIN_REPORTES}/9999", headers=encabezado).status_code == 404
        assert cliente.get(f"{ADMIN_REPORTES}/{10**30}", headers=encabezado).status_code == 404

    def test_el_ciclo_completo_hasta_resuelto_y_avisa_sin_detalles(
        self, cliente: TestClient, db: Session
    ) -> None:
        revision = self._patch(cliente, {"estado": "en_revision", "comentario": "Lo reviso"})
        resuelto = self._patch(
            cliente,
            {
                "estado": "resuelto",
                "resolucion": "Se suspendió la vacante.",
                "accion": "suspension",
            },
        )

        assert revision.status_code == resuelto.status_code == 200
        d = resuelto.json()
        assert d["reporte"]["estado"] == "resuelto"
        assert d["resolucion"] == "Se suspendió la vacante."
        assert d["accion"] == "suspension"
        assert d["atendido_por"] == {"id": 1, "nombre": "Admin", "apellidos": "IncluTec"}
        assert d["cerrado_en"].endswith("Z")
        assert [(h["estado_anterior"], h["estado_nuevo"]) for h in d["historial"]] == [
            (None, "abierto"),
            ("abierto", "en_revision"),
            ("en_revision", "resuelto"),
        ]
        assert d["historial"][1]["comentario"] == "Lo reviso"
        aviso = db.execute(
            text(
                "SELECT mensaje, referencia_tipo, referencia_id FROM notificacion WHERE usuario_id = 4 AND tipo = 'reporte_resuelto'"
            )
        ).one()
        assert aviso[1:] == ("reporte", 1)
        assert "suspend" not in aviso[0].lower()

    def test_descartar_desde_abierto_nunca_lleva_sancion(self, cliente: TestClient) -> None:
        respuesta = self._patch(
            cliente, {"estado": "descartado", "resolucion": "No procede.", "accion": "suspension"}
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["accion"] == "ninguna"

    def test_un_abierto_no_se_resuelve_directo(self, cliente: TestClient) -> None:
        respuesta = self._patch(cliente, {"estado": "resuelto", "resolucion": "x"})

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "transicion_invalida"

    def test_un_cerrado_ya_no_cambia(self, cliente: TestClient) -> None:
        self._patch(cliente, {"estado": "descartado", "resolucion": "No procede."})

        respuesta = self._patch(cliente, {"estado": "en_revision"})

        assert respuesta.status_code == 409
        assert respuesta.json()["detail"] == "El reporte ya está cerrado."

    def test_cerrar_sin_resolucion_da_422(self, cliente: TestClient) -> None:
        respuesta = self._patch(cliente, {"estado": "descartado", "resolucion": "  "})

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "resolucion": "Escribe la resolución para cerrar el reporte."
        }

    def test_valida_estado_comentario_y_accion(self, cliente: TestClient) -> None:
        respuesta = self._patch(
            cliente, {"estado": "abierto", "comentario": "x" * 501, "accion": "multa"}
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"estado", "comentario", "accion"}

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        assert (
            cliente.patch(
                f"{ADMIN_REPORTES}/1", headers=_como(cliente, LAURA), json={"estado": "en_revision"}
            ).status_code
            == 403
        )
        assert cliente.get(f"{ADMIN_REPORTES}/1", headers=_como(cliente, JORGE)).status_code == 403
