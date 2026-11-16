from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.servicios.notificaciones import Entrega
from tests.conftest import iniciar_sesion

POSTULACIONES = "/api/v1/postulaciones"
VACANTES = "/api/v1/vacantes"
MARIANA = "mariana.lopez@correo.mx"  # postulación 1 a la vacante 1, en «entrevista»
JORGE = "jorge.ramirez@correo.mx"  # postulación 2 a la vacante 3, «postulada»
LAURA = "rh@tecnoqro.mx"  # TecnoQro: vacantes 1, 6 y 7
ROBERTO = "rh@logibajio.mx"  # LogiBajío: vacantes 2 y 3
DANIEL = "contacto@estudiotrazo.mx"


def _como(cliente: TestClient, correo: str) -> dict[str, str]:
    return iniciar_sesion(cliente, correo)


def _avisos(db: Session, usuario_id: int, tipo: str) -> list[tuple]:
    return [
        tuple(f)
        for f in db.execute(
            text(
                "SELECT titulo, mensaje, referencia_tipo, referencia_id FROM notificacion "
                "WHERE usuario_id = :u AND tipo = :t ORDER BY id"
            ),
            {"u": usuario_id, "t": tipo},
        )
    ]


def _entregas(db: Session) -> list[Entrega]:
    return db.info.get("entregas", [])


class TestPostularse:
    def test_jorge_se_postula_a_la_vacante_1(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(
            POSTULACIONES,
            headers=_como(cliente, JORGE),
            json={"vacante_id": 1, "mensaje": " Me interesa. ", "compartir_ajustes": False},
        )

        assert respuesta.status_code == 201
        p = respuesta.json()
        assert list(p) == [
            "id",
            "vacante",
            "estado",
            "mensaje",
            "comparte_ajustes",
            "creado_en",
            "actualizado_en",
            "historial",
            "entrevista",
            "puede_retirar",
        ]
        assert p["estado"] == "postulada"
        assert p["mensaje"] == "Me interesa."
        assert p["vacante"] == {
            "id": 1,
            "titulo": "Técnico de soporte de TI",
            "empresa": {"id": 1, "nombre_comercial": "TecnoQro", "logo_url": None},
        }
        assert p["entrevista"] is None
        assert p["puede_retirar"] is True
        assert [(e["estado_anterior"], e["estado_nuevo"]) for e in p["historial"]] == [
            (None, "postulada")
        ]

    def test_avisa_al_reclutador_de_la_empresa(self, cliente: TestClient, db: Session) -> None:
        cliente.post(
            POSTULACIONES,
            headers=_como(cliente, JORGE),
            json={"vacante_id": 1, "compartir_ajustes": False},
        )

        avisos = _avisos(db, 2, "nueva_postulacion")

        assert len(avisos) == 1
        titulo, mensaje, ref_tipo, _ref_id = avisos[0]
        assert titulo == "Nueva postulación"
        assert mensaje == "Jorge Ramírez Soto se postuló a Técnico de soporte de TI."
        assert ref_tipo == "postulacion"
        # También se manda por correo a Laura, en segundo plano.
        assert [e.correo for e in _entregas(db)] == ["rh@tecnoqro.mx"]

    def test_sin_consentimiento_compartir_ajustes_se_guarda_como_false(
        self, cliente: TestClient
    ) -> None:
        respuesta = cliente.post(
            POSTULACIONES,
            headers=_como(cliente, JORGE),
            json={"vacante_id": 1, "compartir_ajustes": True},
        )

        assert respuesta.json()["comparte_ajustes"] is False

    def test_con_consentimiento_se_respeta_lo_que_elige(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        a = cliente.post(
            POSTULACIONES, headers=encabezado, json={"vacante_id": 2, "compartir_ajustes": True}
        )
        b = cliente.post(
            POSTULACIONES, headers=encabezado, json={"vacante_id": 3, "compartir_ajustes": False}
        )

        assert a.json()["comparte_ajustes"] is True
        assert b.json()["comparte_ajustes"] is False

    def test_una_postulacion_repetida_da_409(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            POSTULACIONES,
            headers=_como(cliente, MARIANA),
            json={"vacante_id": 1, "compartir_ajustes": True},
        )

        assert respuesta.status_code == 409
        assert respuesta.json() == {
            "detail": "Ya te postulaste a esta vacante.",
            "codigo": "postulacion_duplicada",
            "campos": None,
        }

    def test_una_vacante_pausada_da_409_vacante_no_disponible(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE vacante SET estado = 'pausada' WHERE id = 6"))

        respuesta = cliente.post(
            POSTULACIONES,
            headers=_como(cliente, JORGE),
            json={"vacante_id": 6, "compartir_ajustes": False},
        )

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "vacante_no_disponible"

    def test_un_borrador_o_una_vacante_inexistente_dan_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, JORGE)

        for id_ in (7, 9999, 10**30):
            respuesta = cliente.post(
                POSTULACIONES,
                headers=encabezado,
                json={"vacante_id": id_, "compartir_ajustes": False},
            )
            assert respuesta.status_code == 404, id_

    def test_la_empresa_no_validada_no_recibe_postulaciones(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE empresa SET estado = 'suspendida' WHERE id = 1"))

        respuesta = cliente.post(
            POSTULACIONES,
            headers=_como(cliente, JORGE),
            json={"vacante_id": 1, "compartir_ajustes": False},
        )

        assert respuesta.json()["codigo"] == "vacante_no_disponible"

    def test_con_el_perfil_incompleto_da_perfil_incompleto_con_los_faltantes(
        self, cliente: TestClient
    ) -> None:
        nueva = cliente.post(
            "/api/v1/auth/registro/candidato",
            json={
                "nombre": "Ana",
                "apellidos": "Pérez",
                "correo": "ana@correo.mx",
                "telefono": "4425550101",
                "municipio_id": 2,
                "contrasena": "Segura2026",
                "acepta_aviso": True,
                "consentimiento_sensibles": False,
            },
        ).json()
        encabezado = {"Authorization": f"Bearer {nueva['access_token']}"}

        respuesta = cliente.post(
            POSTULACIONES, headers=encabezado, json={"vacante_id": 1, "compartir_ajustes": False}
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "perfil_incompleto"
        assert set(respuesta.json()["campos"]) == {"habilidades", "formacion"}

    def test_valida_el_cuerpo(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            POSTULACIONES, headers=_como(cliente, JORGE), json={"mensaje": "x" * 501}
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"vacante_id", "mensaje", "compartir_ajustes"}

    def test_solo_el_candidato_se_postula(self, cliente: TestClient) -> None:
        cuerpo = {"vacante_id": 1, "compartir_ajustes": False}

        assert (
            cliente.post(POSTULACIONES, headers=_como(cliente, LAURA), json=cuerpo).status_code
            == 403
        )
        assert cliente.post(POSTULACIONES, json=cuerpo).status_code == 401


class TestMisPostulaciones:
    def test_lista_la_de_mariana_con_la_hora_de_su_entrevista(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{POSTULACIONES}/me", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert (cuerpo["total"], cuerpo["page"], cuerpo["size"]) == (1, 1, 20)
        p = cuerpo["items"][0]
        assert list(p) == [
            "id",
            "vacante",
            "estado",
            "creado_en",
            "actualizado_en",
            "entrevista_inicio",
        ]
        assert p["id"] == 1
        assert p["estado"] == "entrevista"
        assert p["entrevista_inicio"].endswith("Z")

    def test_las_mas_recientes_primero_y_se_pagina(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.post(
            POSTULACIONES, headers=encabezado, json={"vacante_id": 2, "compartir_ajustes": False}
        )
        cliente.post(
            POSTULACIONES, headers=encabezado, json={"vacante_id": 3, "compartir_ajustes": False}
        )

        todas = cliente.get(f"{POSTULACIONES}/me", headers=encabezado).json()
        segunda = cliente.get(
            f"{POSTULACIONES}/me", params={"size": 1, "page": 2}, headers=encabezado
        ).json()

        assert [p["vacante"]["id"] for p in todas["items"]] == [3, 2, 1]
        assert todas["total"] == 3
        assert [p["vacante"]["id"] for p in segunda["items"]] == [2]

    def test_filtra_por_estado_y_por_activas(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.post(
            POSTULACIONES, headers=encabezado, json={"vacante_id": 2, "compartir_ajustes": False}
        )
        db.execute(text("UPDATE postulacion SET estado = 'no_seleccionada' WHERE vacante_id = 2"))

        activas = cliente.get(f"{POSTULACIONES}/me", params={"activas": "true"}, headers=encabezado)
        finalizadas = cliente.get(
            f"{POSTULACIONES}/me", params={"activas": "false"}, headers=encabezado
        )
        por_estado = cliente.get(
            f"{POSTULACIONES}/me", params={"estado": "entrevista"}, headers=encabezado
        )

        assert [p["estado"] for p in activas.json()["items"]] == ["entrevista"]
        assert [p["estado"] for p in finalizadas.json()["items"]] == ["no_seleccionada"]
        assert [p["id"] for p in por_estado.json()["items"]] == [1]

    def test_un_estado_desconocido_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            f"{POSTULACIONES}/me", params={"estado": "contratada"}, headers=_como(cliente, MARIANA)
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {"estado": "Elige un estado de la lista."}

    def test_cada_quien_ve_solo_las_suyas(self, cliente: TestClient) -> None:
        jorge = cliente.get(f"{POSTULACIONES}/me", headers=_como(cliente, JORGE)).json()

        assert [p["id"] for p in jorge["items"]] == [2]
        assert jorge["items"][0]["entrevista_inicio"] is None


class TestDetalleDelCandidato:
    def test_trae_historial_entrevista_y_puede_retirar(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{POSTULACIONES}/1", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        p = respuesta.json()
        assert [e["estado_nuevo"] for e in p["historial"]] == [
            "postulada",
            "en_revision",
            "entrevista",
        ]
        assert p["historial"][0]["estado_anterior"] is None
        assert p["comparte_ajustes"] is True
        assert p["puede_retirar"] is True
        entrevista = p["entrevista"]
        assert entrevista["estado"] == "agendada"
        assert entrevista["liga"].startswith("https://meet.google.com/")
        assert entrevista["puede_cancelar"] is True
        assert entrevista["duracion_min"] == 45
        assert entrevista["vacante"] == {"id": 1, "titulo": "Técnico de soporte de TI"}
        assert entrevista["empresa"] == {"id": 1, "nombre_comercial": "TecnoQro"}

    def test_si_faltan_menos_de_24_h_no_puede_cancelar(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text("UPDATE horario_entrevista SET inicio = now() + interval '5 hours' WHERE id = 1")
        )

        entrevista = cliente.get(f"{POSTULACIONES}/1", headers=_como(cliente, MARIANA)).json()[
            "entrevista"
        ]

        assert entrevista["puede_cancelar"] is False

    def test_la_postulacion_de_otro_candidato_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, JORGE)

        assert cliente.get(f"{POSTULACIONES}/1", headers=encabezado).status_code == 404
        assert cliente.get(f"{POSTULACIONES}/9999", headers=encabezado).status_code == 404
        assert cliente.get(f"{POSTULACIONES}/{10**30}", headers=encabezado).status_code == 404

    def test_solo_el_candidato(self, cliente: TestClient) -> None:
        assert cliente.get(f"{POSTULACIONES}/1", headers=_como(cliente, LAURA)).status_code == 403
        assert cliente.get(f"{POSTULACIONES}/1").status_code == 401


class TestRetirar:
    def test_retira_cancela_la_entrevista_y_libera_el_horario(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = cliente.patch(f"{POSTULACIONES}/1/retirar", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        p = respuesta.json()
        assert p["estado"] == "retirada"
        assert p["puede_retirar"] is False
        assert p["historial"][-1]["estado_anterior"] == "entrevista"
        assert p["historial"][-1]["estado_nuevo"] == "retirada"
        assert p["entrevista"] is None
        assert db.scalar(text("SELECT estado FROM horario_entrevista WHERE id = 1")) == "libre"
        assert db.scalar(text("SELECT estado FROM entrevista WHERE id = 1")) == "cancelada"

    def test_avisa_a_la_reclutadora_de_la_entrevista_cancelada(
        self, cliente: TestClient, db: Session
    ) -> None:
        cliente.patch(f"{POSTULACIONES}/1/retirar", headers=_como(cliente, MARIANA))

        avisos = _avisos(db, 2, "entrevista_cancelada")

        assert len(avisos) == 1
        assert (
            avisos[0][1]
            == "Mariana López García canceló la entrevista de Técnico de soporte de TI."
        )
        assert avisos[0][2] == "entrevista"

    def test_retirar_una_sin_entrevista_no_avisa(self, cliente: TestClient, db: Session) -> None:
        cliente.patch(f"{POSTULACIONES}/2/retirar", headers=_como(cliente, JORGE))

        assert _avisos(db, 5, "entrevista_cancelada") == []

    def test_una_postulacion_ya_finalizada_da_409(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.patch(f"{POSTULACIONES}/1/retirar", headers=encabezado)

        respuesta = cliente.patch(f"{POSTULACIONES}/1/retirar", headers=encabezado)

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "transicion_invalida"
        assert respuesta.json()["detail"] == "Esta postulación ya está finalizada."

    def test_no_se_retira_una_ajena(self, cliente: TestClient) -> None:
        assert (
            cliente.patch(f"{POSTULACIONES}/1/retirar", headers=_como(cliente, JORGE)).status_code
            == 404
        )


class TestPostuladosDeUnaVacante:
    def test_roberto_ve_a_jorge_con_la_compatibilidad_del_reclutador(
        self, cliente: TestClient
    ) -> None:
        respuesta = cliente.get(f"{VACANTES}/3/postulaciones", headers=_como(cliente, ROBERTO))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert cuerpo["total"] == 1
        assert cuerpo["items"][0] == {
            "postulacion_id": 2,
            "candidato": {
                "id": 4,
                "nombre": "Jorge",
                "apellidos": "Ramírez Soto",
                "foto_url": None,
            },
            "compatibilidad": 70,
            "estado": "postulada",
            "creado_en": cuerpo["items"][0]["creado_en"],
            "ajustes_por_confirmar": False,
        }

    def test_ordena_por_compatibilidad_del_reclutador_y_luego_por_fecha(
        self, cliente: TestClient
    ) -> None:
        cliente.post(
            POSTULACIONES,
            headers=_como(cliente, MARIANA),
            json={"vacante_id": 3, "compartir_ajustes": True},
        )

        items = cliente.get(f"{VACANTES}/3/postulaciones", headers=_como(cliente, ROBERTO)).json()[
            "items"
        ]

        # Jorge 70, Mariana 38 (la reclutadora no ve el componente A).
        assert [i["candidato"]["nombre"] for i in items] == ["Jorge", "Mariana"]
        assert [i["compatibilidad"] for i in items] == [70, 38]

    def test_las_necesidades_nunca_cambian_el_orden_ni_el_puntaje(
        self, cliente: TestClient, db: Session
    ) -> None:
        encabezado = _como(cliente, ROBERTO)
        cliente.post(
            POSTULACIONES,
            headers=_como(cliente, MARIANA),
            json={"vacante_id": 3, "compartir_ajustes": True},
        )
        antes = cliente.get(f"{VACANTES}/3/postulaciones", headers=encabezado).json()["items"]
        # Mariana pasa de 2 necesidades a 9: su puntaje de candidato cambia, el del reclutador no.
        db.execute(
            text(
                "INSERT INTO candidato_necesidad (candidato_id, ajuste_id) "
                "SELECT 3, id FROM ajuste WHERE id NOT IN (1, 3) LIMIT 7"
            )
        )
        despues = cliente.get(f"{VACANTES}/3/postulaciones", headers=encabezado).json()["items"]

        assert [(i["candidato"]["id"], i["compatibilidad"]) for i in antes] == [
            (i["candidato"]["id"], i["compatibilidad"]) for i in despues
        ]

    def test_marca_los_ajustes_por_confirmar(self, cliente: TestClient, db: Session) -> None:
        # Mariana comparte sus necesidades (1 y 3); la vacante 1 las tiene como «existente».
        encabezado = _como(cliente, LAURA)
        antes = cliente.get(f"{VACANTES}/1/postulaciones", headers=encabezado).json()["items"][0]
        db.execute(
            text(
                "UPDATE vacante_ajuste SET tipo = 'bajo_solicitud' "
                "WHERE vacante_id = 1 AND ajuste_id = 3"
            )
        )
        despues = cliente.get(f"{VACANTES}/1/postulaciones", headers=encabezado).json()["items"][0]

        assert antes["ajustes_por_confirmar"] is False
        assert despues["ajustes_por_confirmar"] is True

    def test_sin_compartir_nunca_se_marcan(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE postulacion SET comparte_ajustes = FALSE WHERE id = 1"))
        db.execute(text("DELETE FROM vacante_ajuste WHERE vacante_id = 1"))

        item = cliente.get(f"{VACANTES}/1/postulaciones", headers=_como(cliente, LAURA)).json()[
            "items"
        ][0]

        assert item["ajustes_por_confirmar"] is False

    def test_las_retiradas_no_salen_salvo_que_se_pidan(self, cliente: TestClient) -> None:
        cliente.patch(f"{POSTULACIONES}/1/retirar", headers=_como(cliente, MARIANA))
        encabezado = _como(cliente, LAURA)

        por_omision = cliente.get(f"{VACANTES}/1/postulaciones", headers=encabezado).json()
        retiradas = cliente.get(
            f"{VACANTES}/1/postulaciones", params={"estado": "retirada"}, headers=encabezado
        ).json()

        assert por_omision["items"] == []
        assert [i["estado"] for i in retiradas["items"]] == ["retirada"]

    def test_filtra_por_estado_y_compatibilidad_minima(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, ROBERTO)

        assert (
            cliente.get(
                f"{VACANTES}/3/postulaciones", params={"estado": "en_revision"}, headers=encabezado
            ).json()["items"]
            == []
        )
        assert (
            cliente.get(
                f"{VACANTES}/3/postulaciones", params={"compatibilidad_min": 71}, headers=encabezado
            ).json()["total"]
            == 0
        )
        assert (
            cliente.get(
                f"{VACANTES}/3/postulaciones", params={"compatibilidad_min": 70}, headers=encabezado
            ).json()["total"]
            == 1
        )

    def test_valida_los_filtros(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            f"{VACANTES}/3/postulaciones",
            params={"estado": "x", "compatibilidad_min": 101},
            headers=_como(cliente, ROBERTO),
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"estado", "compatibilidad_min"}

    def test_una_vacante_de_otra_empresa_da_403_y_una_inexistente_404(
        self, cliente: TestClient
    ) -> None:
        encabezado = _como(cliente, LAURA)

        ajena = cliente.get(f"{VACANTES}/3/postulaciones", headers=encabezado)

        assert ajena.status_code == 403
        assert ajena.json()["codigo"] == "sin_permiso"
        assert cliente.get(f"{VACANTES}/9999/postulaciones", headers=encabezado).status_code == 404

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        assert (
            cliente.get(f"{VACANTES}/3/postulaciones", headers=_como(cliente, JORGE)).status_code
            == 403
        )


class TestDetalleDelPostulado:
    def test_mariana_en_entrevista_muestra_contacto_y_necesidades_compartidas(
        self, cliente: TestClient
    ) -> None:
        respuesta = cliente.get(f"{POSTULACIONES}/1/candidato", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 200
        d = respuesta.json()
        assert list(d) == [
            "postulacion",
            "vacante",
            "candidato",
            "compatibilidad",
            "necesidades",
            "nota_ajustes",
            "transiciones_permitidas",
            "entrevista",
        ]
        assert d["postulacion"]["id"] == 1
        assert [e["estado_nuevo"] for e in d["postulacion"]["historial"]] == [
            "postulada",
            "en_revision",
            "entrevista",
        ]
        assert d["vacante"] == {"id": 1, "titulo": "Técnico de soporte de TI"}
        assert d["candidato"]["correo"] == MARIANA
        assert d["candidato"]["telefono"] == "4427654321"
        assert [n["id"] for n in d["necesidades"]] == [1, 3]
        assert {n["estado"] for n in d["necesidades"]} == {"existente"}
        assert set(d["necesidades"][0]) == {"id", "nombre", "categoria", "estado"}
        assert d["transiciones_permitidas"] == ["aceptada", "no_seleccionada"]
        assert d["entrevista"]["puede_cancelar"] is False

    def test_la_compatibilidad_del_reclutador_no_trae_el_componente_a(
        self, cliente: TestClient
    ) -> None:
        c = cliente.get(f"{POSTULACIONES}/1/candidato", headers=_como(cliente, LAURA)).json()[
            "compatibilidad"
        ]

        assert c["puntaje"] == 83
        assert c["componentes"] == {"h": 0.7, "m": 1.0, "f": 1.0}
        assert set(c) == {"puntaje", "componentes", "habilidades", "modalidad", "formacion"}
        assert [h["id"] for h in c["habilidades"]["obligatorias_cumplidas"]] == [4, 5, 11]
        assert c["formacion"]["cumple"] == "si"

    def test_antes_de_la_entrevista_no_hay_correo_ni_telefono(self, cliente: TestClient) -> None:
        d = cliente.get(f"{POSTULACIONES}/2/candidato", headers=_como(cliente, ROBERTO)).json()

        assert d["candidato"]["correo"] is None
        assert d["candidato"]["telefono"] is None
        assert d["transiciones_permitidas"] == ["en_revision", "no_seleccionada"]
        assert d["entrevista"] is None

    def test_si_no_compartio_las_necesidades_van_en_null(self, cliente: TestClient) -> None:
        d = cliente.get(f"{POSTULACIONES}/2/candidato", headers=_como(cliente, ROBERTO)).json()

        assert d["necesidades"] is None
        assert d["nota_ajustes"] is None

    def test_si_revoco_el_consentimiento_tampoco_se_ven(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text("UPDATE candidato SET consentimiento_sensibles_en = NULL WHERE usuario_id = 3")
        )

        d = cliente.get(f"{POSTULACIONES}/1/candidato", headers=_como(cliente, LAURA)).json()

        assert d["necesidades"] is None

    def test_la_nota_de_ajustes_solo_sale_si_compartio(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text("UPDATE candidato SET nota_ajustes = 'Prefiero luz natural' WHERE usuario_id = 3")
        )
        encabezado = _como(cliente, LAURA)

        comparte = cliente.get(f"{POSTULACIONES}/1/candidato", headers=encabezado).json()
        db.execute(text("UPDATE postulacion SET comparte_ajustes = FALSE WHERE id = 1"))
        no_comparte = cliente.get(f"{POSTULACIONES}/1/candidato", headers=encabezado).json()

        assert comparte["nota_ajustes"] == "Prefiero luz natural"
        assert no_comparte["nota_ajustes"] is None
        assert no_comparte["necesidades"] is None

    def test_abrirla_no_cambia_el_estado(self, cliente: TestClient, db: Session) -> None:
        cliente.get(f"{POSTULACIONES}/2/candidato", headers=_como(cliente, ROBERTO))

        assert db.scalar(text("SELECT estado FROM postulacion WHERE id = 2")) == "postulada"

    def test_de_otra_empresa_da_403_e_inexistente_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)

        ajena = cliente.get(f"{POSTULACIONES}/2/candidato", headers=encabezado)

        assert ajena.status_code == 403
        assert ajena.json()["codigo"] == "sin_permiso"
        assert cliente.get(f"{POSTULACIONES}/9999/candidato", headers=encabezado).status_code == 404
        assert (
            cliente.get(f"{POSTULACIONES}/{10**30}/candidato", headers=encabezado).status_code
            == 404
        )

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        assert (
            cliente.get(f"{POSTULACIONES}/1/candidato", headers=_como(cliente, MARIANA)).status_code
            == 403
        )


class TestCambiarEstado:
    def _estado(self, cliente: TestClient, id_: int, correo: str, estado: str, mensaje=None):
        return cliente.patch(
            f"{POSTULACIONES}/{id_}/estado",
            headers=_como(cliente, correo),
            json={"estado": estado, "mensaje": mensaje},
        )

    def test_pasar_a_en_revision_registra_el_historial(self, cliente: TestClient) -> None:
        respuesta = self._estado(cliente, 2, ROBERTO, "en_revision", " Revisando tu perfil. ")

        assert respuesta.status_code == 200
        r = respuesta.json()
        assert r["id"] == 2
        assert r["estado"] == "en_revision"
        assert r["transiciones_permitidas"] == ["entrevista", "no_seleccionada"]
        assert r["historial"][-1]["estado_anterior"] == "postulada"
        assert r["historial"][-1]["estado_nuevo"] == "en_revision"
        assert r["historial"][-1]["mensaje"] == "Revisando tu perfil."

    def test_avisa_al_candidato_por_app_y_por_correo(
        self, cliente: TestClient, db: Session
    ) -> None:
        self._estado(cliente, 2, ROBERTO, "en_revision")

        avisos = _avisos(db, 4, "cambio_estado")

        assert avisos == [
            (
                "Tu postulación avanzó",
                "Tu postulación a Analista de datos de operaciones pasó a En revisión.",
                "postulacion",
                2,
            )
        ]
        assert [e.correo for e in _entregas(db)] == [JORGE]

    def test_el_correo_respeta_las_preferencias(self, cliente: TestClient, db: Session) -> None:
        db.execute(
            text(
                "INSERT INTO preferencia_notificacion (usuario_id, tipo, push, correo) "
                "VALUES (4, 'cambio_estado', TRUE, FALSE)"
            )
        )

        self._estado(cliente, 2, ROBERTO, "en_revision")

        # El aviso en la app siempre se crea; sin push registrado y sin correo, no sale nada más.
        assert len(_avisos(db, 4, "cambio_estado")) == 1
        assert _entregas(db) == []

    def test_el_push_sale_si_hay_dispositivo_y_esta_activo(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text(
                "INSERT INTO dispositivo (usuario_id, expo_push_token, plataforma) "
                "VALUES (4, 'ExponentPushToken[jorge]', 'android')"
            )
        )

        self._estado(cliente, 2, ROBERTO, "en_revision")

        assert _entregas(db)[0].tokens_push == ["ExponentPushToken[jorge]"]

    def test_la_cadena_completa_hasta_aceptada(self, cliente: TestClient) -> None:
        for estado in ("en_revision", "entrevista", "aceptada"):
            assert self._estado(cliente, 2, ROBERTO, estado).status_code == 200

        d = cliente.get(f"{POSTULACIONES}/2/candidato", headers=_como(cliente, ROBERTO)).json()
        # Con «aceptada» ya se ve el contacto.
        assert d["postulacion"]["estado"] == "aceptada"
        assert d["transiciones_permitidas"] == []
        assert d["candidato"]["correo"] == JORGE

    def test_no_seleccionada_cancela_la_entrevista_y_deja_el_horario_cancelado(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = self._estado(cliente, 1, LAURA, "no_seleccionada")

        assert respuesta.status_code == 200
        assert db.scalar(text("SELECT estado FROM entrevista WHERE id = 1")) == "cancelada"
        assert db.scalar(text("SELECT estado FROM horario_entrevista WHERE id = 1")) == "cancelado"
        # El candidato recibe solo el aviso del cambio de estado, no uno de entrevista cancelada.
        assert len(_avisos(db, 3, "cambio_estado")) == 2
        assert _avisos(db, 3, "entrevista_cancelada") == []

    def test_las_transiciones_que_no_existen_dan_409(self, cliente: TestClient) -> None:
        respuesta = self._estado(cliente, 2, ROBERTO, "aceptada")

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "transicion_invalida"

    def test_una_finalizada_no_cambia(self, cliente: TestClient) -> None:
        self._estado(cliente, 2, ROBERTO, "no_seleccionada")

        assert self._estado(cliente, 2, ROBERTO, "en_revision").status_code == 409

    def test_una_retirada_no_se_mueve(self, cliente: TestClient) -> None:
        cliente.patch(f"{POSTULACIONES}/2/retirar", headers=_como(cliente, JORGE))

        assert self._estado(cliente, 2, ROBERTO, "en_revision").status_code == 409

    def test_valida_estado_y_mensaje(self, cliente: TestClient) -> None:
        malo = self._estado(cliente, 2, ROBERTO, "retirada", "x" * 501)

        assert malo.status_code == 422
        assert set(malo.json()["campos"]) == {"estado", "mensaje"}

    def test_de_otra_empresa_da_403_e_inexistente_404(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 2, LAURA, "en_revision").status_code == 403
        assert self._estado(cliente, 9999, LAURA, "en_revision").status_code == 404

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        respuesta = cliente.patch(
            f"{POSTULACIONES}/2/estado",
            headers=_como(cliente, JORGE),
            json={"estado": "en_revision"},
        )

        assert respuesta.status_code == 403

    def test_el_candidato_ve_el_mensaje_en_su_historial(self, cliente: TestClient) -> None:
        self._estado(cliente, 2, ROBERTO, "en_revision", "Te contactamos pronto.")

        historial = cliente.get(f"{POSTULACIONES}/2", headers=_como(cliente, JORGE)).json()[
            "historial"
        ]

        assert historial[-1]["mensaje"] == "Te contactamos pronto."


class TestObservaciones:
    def test_lista_las_de_la_postulacion_mas_recientes_primero(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        cliente.post(
            f"{POSTULACIONES}/1/observaciones", headers=encabezado, json={"texto": "Segunda nota"}
        )

        notas = cliente.get(f"{POSTULACIONES}/1/observaciones", headers=encabezado).json()

        assert [n["texto"] for n in notas] == [
            "Segunda nota",
            "Perfil sólido en soporte; confirmar disponibilidad de horario.",
        ]
        assert notas[0]["autor"] == {"id": 2, "nombre": "Laura", "apellidos": "Hernández Ruiz"}
        assert notas[0]["creado_en"].endswith("Z")

    def test_agrega_y_recorta_el_texto(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{POSTULACIONES}/2/observaciones",
            headers=_como(cliente, ROBERTO),
            json={"texto": "  Buena candidata  "},
        )

        assert respuesta.status_code == 201
        assert respuesta.json()["texto"] == "Buena candidata"

    def test_valida_el_texto(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, ROBERTO)

        vacia = cliente.post(
            f"{POSTULACIONES}/2/observaciones", headers=encabezado, json={"texto": "  "}
        )
        larga = cliente.post(
            f"{POSTULACIONES}/2/observaciones", headers=encabezado, json={"texto": "x" * 1001}
        )

        assert vacia.status_code == larga.status_code == 422
        assert vacia.json()["campos"] == {"texto": "Escribe la observación."}
        assert "1000" in larga.json()["campos"]["texto"]

    def test_el_candidato_nunca_las_ve(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        assert (
            cliente.get(f"{POSTULACIONES}/1/observaciones", headers=encabezado).status_code == 403
        )
        assert (
            cliente.post(
                f"{POSTULACIONES}/1/observaciones", headers=encabezado, json={"texto": "x"}
            ).status_code
            == 403
        )
        # Y no aparecen en el detalle que ve el candidato.
        assert "observaciones" not in cliente.get(f"{POSTULACIONES}/1", headers=encabezado).json()

    def test_de_otra_empresa_da_403(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, ROBERTO)

        assert (
            cliente.get(f"{POSTULACIONES}/1/observaciones", headers=encabezado).status_code == 403
        )
        assert (
            cliente.post(
                f"{POSTULACIONES}/1/observaciones", headers=encabezado, json={"texto": "x"}
            ).status_code
            == 403
        )
