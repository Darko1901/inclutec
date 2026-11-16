import threading
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modelos import Postulacion
from app.servicios import horarios as servicio_horarios
from tests.conftest import iniciar_sesion

HORARIOS = "/api/v1/horarios-entrevista"
ENTREVISTAS = "/api/v1/entrevistas"
POSTULACIONES = "/api/v1/postulaciones"
MARIANA = "mariana.lopez@correo.mx"  # postulación 1 (vacante 1) con la entrevista 1 en el horario 1
JORGE = "jorge.ramirez@correo.mx"  # postulación 2 (vacante 3), «postulada»
LAURA = "rh@tecnoqro.mx"  # TecnoQro: vacantes 1, 6 y 7
ROBERTO = "rh@logibajio.mx"  # LogiBajío: vacantes 2 y 3
DANIEL = "contacto@estudiotrazo.mx"

LIGA = "https://meet.google.com/aaa-bbbb-ccc"


def _como(cliente: TestClient, correo: str) -> dict[str, str]:
    return iniciar_sesion(cliente, correo)


def _en(dias: float = 5, horas: float = 0) -> str:
    """Un instante futuro en UTC con Z, redondeado al minuto."""
    futuro = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(days=dias, hours=horas)
    return futuro.strftime("%Y-%m-%dT%H:%M:%SZ")


def _publicar(cliente: TestClient, correo: str = LAURA, **cambios):
    datos = {"vacante_id": 1, "inicio": _en(10), "duracion_min": 30, "liga": LIGA, **cambios}
    return cliente.post(HORARIOS, headers=_como(cliente, correo), json=datos)


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


class TestPublicarHorario:
    def test_crea_un_horario_libre_con_su_fin(self, cliente: TestClient) -> None:
        inicio = _en(10)

        respuesta = _publicar(cliente, inicio=inicio, duracion_min=45)

        assert respuesta.status_code == 201
        h = respuesta.json()
        assert list(h) == ["id", "vacante_id", "inicio", "fin", "duracion_min", "estado", "liga"]
        assert h["estado"] == "libre"
        assert h["inicio"] == inicio
        assert h["liga"] == LIGA
        fin = datetime.fromisoformat(h["fin"].replace("Z", "+00:00"))
        assert fin - datetime.fromisoformat(inicio.replace("Z", "+00:00")) == timedelta(minutes=45)

    def test_acepta_ligas_de_meet_y_de_teams(self, cliente: TestClient) -> None:
        meet = _publicar(cliente, inicio=_en(10), liga="https://meet.google.com/xyz-abcd-efg")
        teams = _publicar(
            cliente, inicio=_en(11), liga="https://teams.microsoft.com/l/meetup-join/abc"
        )

        assert meet.status_code == teams.status_code == 201

    def test_valida_inicio_duracion_y_liga(self, cliente: TestClient) -> None:
        respuesta = _publicar(
            cliente, inicio=_en(-1), duracion_min=50, liga="https://zoom.us/j/123"
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "inicio": "Elige una fecha y una hora que aún no pasen.",
            "duracion_min": "La duración puede ser de 30, 45 o 60 minutos.",
            "liga": "Escribe una liga de Google Meet o de Microsoft Teams.",
        }

    def test_una_hora_sin_zona_horaria_o_ilegible_da_422(self, cliente: TestClient) -> None:
        for inicio in ("2030-01-01T10:00:00", "mañana", ""):
            respuesta = _publicar(cliente, inicio=inicio)
            assert respuesta.status_code == 422, inicio
            assert "inicio" in respuesta.json()["campos"]

    def test_un_horario_que_se_traslapa_da_409(self, cliente: TestClient) -> None:
        inicio = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(days=10)
        _publicar(cliente, inicio=inicio.strftime("%Y-%m-%dT%H:%M:%SZ"), duracion_min=60)

        dentro = _publicar(
            cliente, inicio=(inicio + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        pegado = _publicar(
            cliente, inicio=(inicio + timedelta(minutes=60)).strftime("%Y-%m-%dT%H:%M:%SZ")
        )

        assert dentro.status_code == 409
        assert dentro.json()["codigo"] == "horario_traslapado"
        # Uno que empieza justo cuando termina el otro no se traslapa.
        assert pegado.status_code == 201

    def test_los_horarios_cancelados_no_estorban(self, cliente: TestClient, db: Session) -> None:
        inicio = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(days=10)
        creado = _publicar(cliente, inicio=inicio.strftime("%Y-%m-%dT%H:%M:%SZ")).json()
        db.execute(
            text("UPDATE horario_entrevista SET estado = 'cancelado' WHERE id = :i"),
            {"i": creado["id"]},
        )

        assert _publicar(cliente, inicio=inicio.strftime("%Y-%m-%dT%H:%M:%SZ")).status_code == 201

    def test_el_traslape_es_por_reclutador_no_por_vacante(self, cliente: TestClient) -> None:
        inicio = _en(10)
        _publicar(cliente, LAURA, inicio=inicio)

        otro = _publicar(cliente, ROBERTO, vacante_id=2, inicio=inicio)

        assert otro.status_code == 201

    def test_la_vacante_debe_ser_de_mi_empresa_y_estar_publicada(self, cliente: TestClient) -> None:
        ajena = _publicar(cliente, vacante_id=2)
        borrador = _publicar(cliente, vacante_id=7)
        inexistente = _publicar(cliente, vacante_id=9999)

        assert ajena.status_code == inexistente.status_code == 404
        assert borrador.status_code == 422
        assert borrador.json()["campos"] == {"vacante_id": "Elige una vacante publicada."}

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        cuerpo = {"vacante_id": 1, "inicio": _en(10), "duracion_min": 30, "liga": LIGA}

        assert (
            cliente.post(HORARIOS, headers=_como(cliente, MARIANA), json=cuerpo).status_code == 403
        )
        assert cliente.post(HORARIOS, json=cuerpo).status_code == 401


class TestHorariosDisponibles:
    def test_mariana_solo_ve_los_libres_y_futuros_sin_la_liga(self, cliente: TestClient) -> None:
        respuesta = cliente.get(HORARIOS, params={"vacante_id": 1}, headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        horarios = respuesta.json()
        # S002: el horario 1 está agendado y el 2 libre.
        assert [h["id"] for h in horarios] == [2]
        assert horarios[0]["liga"] is None
        assert horarios[0]["estado"] == "libre"

    def test_los_ordena_del_mas_proximo_al_mas_lejano(
        self, cliente: TestClient, db: Session
    ) -> None:
        _publicar(cliente, inicio=_en(20))
        _publicar(cliente, inicio=_en(8))

        ids_por_inicio = [
            h["inicio"]
            for h in cliente.get(
                HORARIOS, params={"vacante_id": 1}, headers=_como(cliente, MARIANA)
            ).json()
        ]

        assert ids_por_inicio == sorted(ids_por_inicio)
        assert len(ids_por_inicio) == 3

    def test_no_ofrece_horarios_pasados(self, cliente: TestClient, db: Session) -> None:
        db.execute(
            text("UPDATE horario_entrevista SET inicio = now() - interval '1 hour' WHERE id = 2")
        )

        respuesta = cliente.get(HORARIOS, params={"vacante_id": 1}, headers=_como(cliente, MARIANA))

        assert respuesta.json() == []

    def test_sin_estar_en_entrevista_da_403(self, cliente: TestClient) -> None:
        # Jorge está «postulada» en la vacante 3.
        respuesta = cliente.get(HORARIOS, params={"vacante_id": 3}, headers=_como(cliente, JORGE))

        assert respuesta.status_code == 403
        assert respuesta.json()["codigo"] == "sin_permiso"

    def test_para_otra_vacante_tambien_da_403(self, cliente: TestClient) -> None:
        assert (
            cliente.get(
                HORARIOS, params={"vacante_id": 6}, headers=_como(cliente, MARIANA)
            ).status_code
            == 403
        )

    def test_sin_vacante_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.get(HORARIOS, headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {"vacante_id": "Indica la vacante."}

    def test_solo_el_candidato(self, cliente: TestClient) -> None:
        assert (
            cliente.get(
                HORARIOS, params={"vacante_id": 1}, headers=_como(cliente, LAURA)
            ).status_code
            == 403
        )


class TestEliminarHorario:
    def test_borra_un_horario_libre_sin_historial(self, cliente: TestClient, db: Session) -> None:
        creado = _publicar(cliente).json()

        respuesta = cliente.delete(f"{HORARIOS}/{creado['id']}", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 204
        assert (
            db.scalar(
                text("SELECT count(*) FROM horario_entrevista WHERE id = :i"), {"i": creado["id"]}
            )
            == 0
        )

    def test_un_horario_agendado_da_409(self, cliente: TestClient) -> None:
        respuesta = cliente.delete(f"{HORARIOS}/1", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "estado_invalido"

    def test_un_horario_liberado_con_entrevistas_canceladas_se_conserva_como_cancelado(
        self, cliente: TestClient, db: Session
    ) -> None:
        # Mariana cancela: el horario 1 queda libre pero tiene una entrevista cancelada.
        cliente.delete(f"{ENTREVISTAS}/1", headers=_como(cliente, MARIANA))

        respuesta = cliente.delete(f"{HORARIOS}/1", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 204
        assert db.scalar(text("SELECT estado FROM horario_entrevista WHERE id = 1")) == "cancelado"
        assert db.scalar(text("SELECT count(*) FROM entrevista WHERE id = 1")) == 1

    def test_el_de_otra_empresa_o_inexistente_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, ROBERTO)

        assert cliente.delete(f"{HORARIOS}/2", headers=encabezado).status_code == 404
        assert cliente.delete(f"{HORARIOS}/9999", headers=encabezado).status_code == 404
        assert cliente.delete(f"{HORARIOS}/{10**30}", headers=encabezado).status_code == 404

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        assert cliente.delete(f"{HORARIOS}/2", headers=_como(cliente, MARIANA)).status_code == 403


class TestAgendarEntrevista:
    def _en_entrevista(self, cliente: TestClient) -> dict[str, str]:
        """Jorge pasa a «entrevista» en la vacante 3 y Roberto le publica un horario."""
        for estado in ("en_revision", "entrevista"):
            cliente.patch(
                f"{POSTULACIONES}/2/estado",
                headers=_como(cliente, ROBERTO),
                json={"estado": estado},
            )
        horario = _publicar(cliente, ROBERTO, vacante_id=3, inicio=_en(7)).json()
        return {"horario": horario["id"], "liga": horario["liga"]}

    def test_mariana_agenda_el_horario_2(self, cliente: TestClient, db: Session) -> None:
        cliente.delete(f"{ENTREVISTAS}/1", headers=_como(cliente, MARIANA))

        respuesta = cliente.post(
            f"{POSTULACIONES}/1/entrevista", headers=_como(cliente, MARIANA), json={"horario_id": 2}
        )

        assert respuesta.status_code == 201
        e = respuesta.json()
        assert list(e) == [
            "id",
            "estado",
            "inicio",
            "fin",
            "duracion_min",
            "liga",
            "puede_cancelar",
            "vacante",
            "empresa",
            "creado_en",
        ]
        assert e["estado"] == "agendada"
        assert e["liga"].startswith("https://meet.google.com/")
        assert e["puede_cancelar"] is True
        assert db.scalar(text("SELECT estado FROM horario_entrevista WHERE id = 2")) == "agendado"

    def test_avisa_al_reclutador_y_manda_el_correo_de_confirmacion_a_ambos(
        self, cliente: TestClient, db: Session
    ) -> None:
        datos = self._en_entrevista(cliente)
        db.info.pop("entregas", None)

        respuesta = cliente.post(
            f"{POSTULACIONES}/2/entrevista",
            headers=_como(cliente, JORGE),
            json={"horario_id": datos["horario"]},
        )

        assert respuesta.status_code == 201
        avisos = _avisos(db, 5, "entrevista_agendada")
        assert (
            avisos[-1][1]
            == "Jorge Ramírez Soto agendó una entrevista para Analista de datos de operaciones."
        )
        assert avisos[-1][2] == "entrevista"
        entregas = db.info["entregas"]
        assert sorted(e.correo for e in entregas) == ["jorge.ramirez@correo.mx", "rh@logibajio.mx"]
        assert all(datos["liga"] in e.correo_texto for e in entregas)
        assert all("Ciudad de México" in e.correo_texto for e in entregas)

    def test_el_correo_de_confirmacion_sale_aunque_desactive_el_correo(
        self, cliente: TestClient, db: Session
    ) -> None:
        datos = self._en_entrevista(cliente)
        db.execute(
            text(
                "INSERT INTO preferencia_notificacion (usuario_id, tipo, push, correo) "
                "VALUES (5, 'entrevista_agendada', FALSE, FALSE)"
            )
        )
        db.info.pop("entregas", None)

        cliente.post(
            f"{POSTULACIONES}/2/entrevista",
            headers=_como(cliente, JORGE),
            json={"horario_id": datos["horario"]},
        )

        assert "rh@logibajio.mx" in [e.correo for e in db.info["entregas"]]

    def test_un_horario_ocupado_da_409_horario_ocupado(self, cliente: TestClient) -> None:
        # El horario 1 de la vacante 1 ya lo tiene Mariana. Otro candidato en entrevista lo pide.
        respuesta = cliente.post(
            f"{POSTULACIONES}/1/entrevista", headers=_como(cliente, MARIANA), json={"horario_id": 1}
        )

        # Mariana ya tiene una entrevista agendada: no puede agendar otra.
        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "estado_invalido"

    def test_otro_candidato_no_puede_tomar_un_horario_ya_agendado(
        self, cliente: TestClient, db: Session
    ) -> None:
        # Jorge se postula a la vacante 1 y llega a «entrevista»; el horario 1 ya es de Mariana.
        cliente.post(
            POSTULACIONES,
            headers=_como(cliente, JORGE),
            json={"vacante_id": 1, "compartir_ajustes": False},
        )
        nueva = db.scalar(
            text("SELECT id FROM postulacion WHERE candidato_id = 4 AND vacante_id = 1")
        )
        for estado in ("en_revision", "entrevista"):
            cliente.patch(
                f"{POSTULACIONES}/{nueva}/estado",
                headers=_como(cliente, LAURA),
                json={"estado": estado},
            )

        respuesta = cliente.post(
            f"{POSTULACIONES}/{nueva}/entrevista",
            headers=_como(cliente, JORGE),
            json={"horario_id": 1},
        )

        assert respuesta.status_code == 409
        assert respuesta.json() == {
            "detail": "Ese horario acaba de ser tomado, elige otro.",
            "codigo": "horario_ocupado",
            "campos": None,
        }

    def test_solo_si_la_postulacion_esta_en_entrevista(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{POSTULACIONES}/2/entrevista", headers=_como(cliente, JORGE), json={"horario_id": 2}
        )

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "estado_invalido"

    def test_un_horario_de_otra_vacante_o_inexistente_da_404(self, cliente: TestClient) -> None:
        datos = self._en_entrevista(cliente)
        encabezado = _como(cliente, JORGE)

        # El horario 2 es de la vacante 1; Jorge está en entrevista de la vacante 3.
        otra_vacante = cliente.post(
            f"{POSTULACIONES}/2/entrevista", headers=encabezado, json={"horario_id": 2}
        )
        inexistente = cliente.post(
            f"{POSTULACIONES}/2/entrevista", headers=encabezado, json={"horario_id": 9999}
        )
        enorme = cliente.post(
            f"{POSTULACIONES}/2/entrevista", headers=encabezado, json={"horario_id": 10**30}
        )

        assert otra_vacante.status_code == inexistente.status_code == enorme.status_code == 404
        assert datos["horario"] > 0

    def test_un_horario_que_ya_paso_da_409(self, cliente: TestClient, db: Session) -> None:
        datos = self._en_entrevista(cliente)
        db.execute(
            text("UPDATE horario_entrevista SET inicio = now() - interval '1 hour' WHERE id = :i"),
            {"i": datos["horario"]},
        )

        respuesta = cliente.post(
            f"{POSTULACIONES}/2/entrevista",
            headers=_como(cliente, JORGE),
            json={"horario_id": datos["horario"]},
        )

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "horario_ocupado"

    def test_valida_el_horario(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{POSTULACIONES}/1/entrevista", headers=_como(cliente, MARIANA), json={}
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {"horario_id": "Elige un horario."}

    def test_la_postulacion_ajena_da_404_y_el_reclutador_403(self, cliente: TestClient) -> None:
        cuerpo = {"horario_id": 2}

        assert (
            cliente.post(
                f"{POSTULACIONES}/1/entrevista", headers=_como(cliente, JORGE), json=cuerpo
            ).status_code
            == 404
        )
        assert (
            cliente.post(
                f"{POSTULACIONES}/1/entrevista", headers=_como(cliente, LAURA), json=cuerpo
            ).status_code
            == 403
        )

    def test_dos_candidatos_a_la_vez_solo_uno_gana(self, motor) -> None:
        """Con transacciones reales: `SELECT … FOR UPDATE` deja pasar solo a uno."""
        from sqlalchemy.orm import Session as Sesion

        resultados: list[str] = []

        with Sesion(motor) as preparacion:
            # Dos postulaciones en «entrevista» a la vacante 6 y un solo horario libre.
            preparacion.execute(
                text(
                    "INSERT INTO postulacion (candidato_id, vacante_id, estado) "
                    "VALUES (3, 6, 'entrevista'), (4, 6, 'entrevista')"
                )
            )
            horario_id = preparacion.scalar(
                text(
                    "INSERT INTO horario_entrevista "
                    "(vacante_id, reclutador_id, inicio, duracion_min, liga) "
                    "VALUES (6, 2, now() + interval '9 days', 30, "
                    "'https://meet.google.com/aaa-bbbb-ccc') "
                    "RETURNING id"
                )
            )
            ids = [
                r[0]
                for r in preparacion.execute(
                    text("SELECT id FROM postulacion WHERE vacante_id = 6 ORDER BY candidato_id")
                )
            ]
            preparacion.commit()

        barrera = threading.Barrier(2)

        def intentar(postulacion_id: int) -> None:
            with Sesion(motor) as sesion:
                postulacion = sesion.get(Postulacion, postulacion_id)
                barrera.wait()
                try:
                    servicio_horarios.reservar(sesion, postulacion, horario_id)
                    sesion.commit()
                    resultados.append("gana")
                except Exception as error:  # noqa: BLE001
                    sesion.rollback()
                    resultados.append(getattr(error, "codigo", repr(error)))

        hilos = [threading.Thread(target=intentar, args=(i,)) for i in ids]
        try:
            for hilo in hilos:
                hilo.start()
            for hilo in hilos:
                hilo.join(timeout=30)
            assert sorted(resultados) == ["gana", "horario_ocupado"]
            with Sesion(motor) as comprobacion:
                vigentes = comprobacion.scalar(
                    text(
                        "SELECT count(*) FROM entrevista "
                        "WHERE horario_id = :h AND estado <> 'cancelada'"
                    ),
                    {"h": horario_id},
                )
            assert vigentes == 1
        finally:
            with Sesion(motor) as limpieza:
                limpieza.execute(
                    text("DELETE FROM entrevista WHERE horario_id = :h"), {"h": horario_id}
                )
                limpieza.execute(
                    text("DELETE FROM horario_entrevista WHERE id = :h"), {"h": horario_id}
                )
                limpieza.execute(
                    text(
                        "DELETE FROM notificacion WHERE tipo = 'entrevista_agendada' "
                        "AND referencia_tipo = 'entrevista' AND referencia_id > 1"
                    )
                )
                limpieza.execute(text("DELETE FROM postulacion WHERE id = ANY(:ids)"), {"ids": ids})
                limpieza.commit()


class TestAgenda:
    def test_agrupa_por_dia_con_la_entrevista_y_el_candidato(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{ENTREVISTAS}/me", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 200
        dias = respuesta.json()
        assert all(set(d) == {"fecha", "horarios"} for d in dias)
        horarios = [h for d in dias for h in d["horarios"]]
        assert [h["id"] for h in horarios] == [1, 2]
        agendado, libre = horarios
        assert set(agendado) == {
            "id",
            "inicio",
            "fin",
            "duracion_min",
            "liga",
            "estado",
            "vacante",
            "entrevista",
        }
        assert agendado["estado"] == "agendado"
        assert agendado["vacante"] == {"id": 1, "titulo": "Técnico de soporte de TI"}
        assert agendado["entrevista"]["estado"] == "agendada"
        assert agendado["entrevista"]["postulacion_id"] == 1
        assert agendado["entrevista"]["candidato"] == {
            "id": 3,
            "nombre": "Mariana",
            "apellidos": "López García",
        }
        assert libre["estado"] == "libre"
        assert libre["entrevista"] is None

    def test_el_dia_es_el_de_la_ciudad_de_mexico(self, cliente: TestClient, db: Session) -> None:
        # 03:00 UTC del día 20 son las 21:00 del día 19 en la Ciudad de México (UTC−6).
        db.execute(text("DELETE FROM entrevista"))
        db.execute(text("DELETE FROM horario_entrevista"))
        db.execute(
            text(
                "INSERT INTO horario_entrevista "
                "(vacante_id, reclutador_id, inicio, duracion_min, liga) "
                "VALUES (1, 2, now()::date + interval '5 days 3 hours', 30, 'https://meet.google.com/a-b-c')"
            )
        )

        dias = cliente.get(
            f"{ENTREVISTAS}/me", params={"hasta": _en(20)[:10]}, headers=_como(cliente, LAURA)
        ).json()

        inicio = datetime.fromisoformat(dias[0]["horarios"][0]["inicio"].replace("Z", "+00:00"))
        assert dias[0]["fecha"] == (inicio - timedelta(hours=6)).date().isoformat()

    def test_por_omision_cubre_de_hoy_a_30_dias(self, cliente: TestClient, db: Session) -> None:
        _publicar(cliente, inicio=_en(25))
        _publicar(cliente, inicio=_en(40))

        horarios = [
            h
            for d in cliente.get(f"{ENTREVISTAS}/me", headers=_como(cliente, LAURA)).json()
            for h in d["horarios"]
        ]

        assert len(horarios) == 3

    def test_filtra_por_fechas_y_por_vacante(self, cliente: TestClient) -> None:
        _publicar(cliente, vacante_id=6, inicio=_en(12))
        encabezado = _como(cliente, LAURA)

        de_la_6 = cliente.get(
            f"{ENTREVISTAS}/me", params={"vacante_id": 6}, headers=encabezado
        ).json()
        lejano = cliente.get(
            f"{ENTREVISTAS}/me",
            params={"desde": _en(11)[:10], "hasta": _en(13)[:10]},
            headers=encabezado,
        ).json()

        assert [h["vacante"]["id"] for d in de_la_6 for h in d["horarios"]] == [6]
        assert [h["vacante"]["id"] for d in lejano for h in d["horarios"]] == [6]

    def test_no_muestra_los_horarios_cancelados(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE horario_entrevista SET estado = 'cancelado' WHERE id = 2"))

        horarios = [
            h
            for d in cliente.get(f"{ENTREVISTAS}/me", headers=_como(cliente, LAURA)).json()
            for h in d["horarios"]
        ]

        assert [h["id"] for h in horarios] == [1]

    def test_cada_reclutador_ve_solo_los_suyos(self, cliente: TestClient) -> None:
        assert cliente.get(f"{ENTREVISTAS}/me", headers=_como(cliente, ROBERTO)).json() == []

    def test_valida_las_fechas(self, cliente: TestClient) -> None:
        malas = cliente.get(
            f"{ENTREVISTAS}/me",
            params={"desde": "ayer", "hasta": "2026-02-30"},
            headers=_como(cliente, LAURA),
        )
        invertidas = cliente.get(
            f"{ENTREVISTAS}/me",
            params={"desde": "2026-12-10", "hasta": "2026-12-01"},
            headers=_como(cliente, LAURA),
        )

        assert malas.status_code == invertidas.status_code == 422
        assert set(malas.json()["campos"]) == {"desde", "hasta"}
        assert invertidas.json()["campos"] == {
            "hasta": "La fecha final no puede ser anterior a la inicial."
        }

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        assert cliente.get(f"{ENTREVISTAS}/me", headers=_como(cliente, MARIANA)).status_code == 403


class TestResultadoDeLaEntrevista:
    def _patch(self, cliente: TestClient, correo: str, cuerpo: dict, id_: int = 1):
        return cliente.patch(f"{ENTREVISTAS}/{id_}", headers=_como(cliente, correo), json=cuerpo)

    def test_realizada_solo_despues_de_la_hora_de_inicio(
        self, cliente: TestClient, db: Session
    ) -> None:
        antes = self._patch(cliente, LAURA, {"estado": "realizada"})
        db.execute(
            text("UPDATE horario_entrevista SET inicio = now() - interval '2 hours' WHERE id = 1")
        )
        despues = self._patch(cliente, LAURA, {"estado": "realizada"})

        assert antes.status_code == 409
        assert antes.json()["codigo"] == "transicion_invalida"
        assert "aún no empieza" in antes.json()["detail"]
        assert despues.status_code == 200
        assert despues.json()["estado"] == "realizada"
        assert despues.json()["puede_cancelar"] is False

    def test_no_asistio(self, cliente: TestClient, db: Session) -> None:
        db.execute(
            text("UPDATE horario_entrevista SET inicio = now() - interval '2 hours' WHERE id = 1")
        )

        respuesta = self._patch(cliente, LAURA, {"estado": "no_asistio"})

        assert respuesta.json()["estado"] == "no_asistio"

    def test_un_resultado_ya_registrado_no_se_cambia(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text("UPDATE horario_entrevista SET inicio = now() - interval '2 hours' WHERE id = 1")
        )
        self._patch(cliente, LAURA, {"estado": "realizada"})

        respuesta = self._patch(cliente, LAURA, {"estado": "no_asistio"})

        assert respuesta.status_code == 409
        assert respuesta.json()["detail"] == "Esta entrevista ya tiene un resultado o se canceló."

    def test_cancelar_deja_el_horario_cancelado_y_avisa_al_candidato(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = self._patch(
            cliente, LAURA, {"estado": "cancelada", "motivo_cancelacion": " Surgió un imprevisto. "}
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["estado"] == "cancelada"
        assert db.scalar(text("SELECT estado FROM horario_entrevista WHERE id = 1")) == "cancelado"
        assert (
            db.scalar(text("SELECT motivo_cancelacion FROM entrevista WHERE id = 1"))
            == "Surgió un imprevisto."
        )
        aviso = _avisos(db, 3, "entrevista_cancelada")
        assert aviso == [
            (
                "Entrevista cancelada",
                "TecnoQro canceló tu entrevista de Técnico de soporte de TI. "
                "Motivo: Surgió un imprevisto.",
                "postulacion",
                1,
            )
        ]
        assert [e.correo for e in db.info["entregas"]] == [MARIANA]

    def test_tras_cancelar_la_postulacion_sigue_en_entrevista_para_elegir_otro_horario(
        self, cliente: TestClient
    ) -> None:
        self._patch(cliente, LAURA, {"estado": "cancelada", "motivo_cancelacion": "Imprevisto"})

        nuevo = cliente.post(
            f"{POSTULACIONES}/1/entrevista", headers=_como(cliente, MARIANA), json={"horario_id": 2}
        )

        assert nuevo.status_code == 201

    def test_cancelar_sin_motivo_da_422(self, cliente: TestClient) -> None:
        respuesta = self._patch(cliente, LAURA, {"estado": "cancelada", "motivo_cancelacion": "  "})

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "motivo_cancelacion": "Escribe el motivo de la cancelación."
        }

    def test_valida_estado_y_longitud_del_motivo(self, cliente: TestClient) -> None:
        mal = self._patch(cliente, LAURA, {"estado": "contratada"})
        largo = self._patch(
            cliente, LAURA, {"estado": "cancelada", "motivo_cancelacion": "x" * 256}
        )

        assert mal.json()["campos"] == {"estado": "Elige realizada, no asistió o cancelada."}
        assert "255" in largo.json()["campos"]["motivo_cancelacion"]

    def test_de_otra_empresa_o_inexistente_da_404(self, cliente: TestClient) -> None:
        assert (
            self._patch(
                cliente, ROBERTO, {"estado": "cancelada", "motivo_cancelacion": "x"}
            ).status_code
            == 404
        )
        assert self._patch(cliente, LAURA, {"estado": "realizada"}, id_=9999).status_code == 404
        assert self._patch(cliente, LAURA, {"estado": "realizada"}, id_=10**30).status_code == 404

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        assert self._patch(cliente, MARIANA, {"estado": "realizada"}).status_code == 403


class TestCancelarMiEntrevista:
    def test_cancela_libera_el_horario_y_avisa_a_la_reclutadora(
        self, cliente: TestClient, db: Session
    ) -> None:
        respuesta = cliente.request(
            "DELETE",
            f"{ENTREVISTAS}/1",
            headers=_como(cliente, MARIANA),
            json={"motivo": " Ya no puedo "},
        )

        assert respuesta.status_code == 204
        assert db.scalar(text("SELECT estado FROM horario_entrevista WHERE id = 1")) == "libre"
        assert db.scalar(text("SELECT estado FROM entrevista WHERE id = 1")) == "cancelada"
        assert (
            db.scalar(text("SELECT motivo_cancelacion FROM entrevista WHERE id = 1"))
            == "Ya no puedo"
        )
        assert db.scalar(text("SELECT cancelada_por FROM entrevista WHERE id = 1")) == 3
        aviso = _avisos(db, 2, "entrevista_cancelada")
        assert (
            aviso[0][1] == "Mariana López García canceló la entrevista de Técnico de soporte de TI."
        )
        assert aviso[0][2:] == ("entrevista", 1)

    def test_el_motivo_es_opcional(self, cliente: TestClient) -> None:
        assert (
            cliente.delete(f"{ENTREVISTAS}/1", headers=_como(cliente, MARIANA)).status_code == 204
        )

    def test_con_menos_de_24_h_da_cancelacion_tardia(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text("UPDATE horario_entrevista SET inicio = now() + interval '23 hours' WHERE id = 1")
        )

        respuesta = cliente.delete(f"{ENTREVISTAS}/1", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "cancelacion_tardia"
        assert db.scalar(text("SELECT estado FROM entrevista WHERE id = 1")) == "agendada"

    def test_una_entrevista_que_ya_no_esta_agendada_da_409(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.delete(f"{ENTREVISTAS}/1", headers=encabezado)

        respuesta = cliente.delete(f"{ENTREVISTAS}/1", headers=encabezado)

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "estado_invalido"

    def test_la_de_otro_candidato_o_inexistente_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, JORGE)

        assert cliente.delete(f"{ENTREVISTAS}/1", headers=encabezado).status_code == 404
        assert cliente.delete(f"{ENTREVISTAS}/9999", headers=encabezado).status_code == 404
        assert cliente.delete(f"{ENTREVISTAS}/{10**30}", headers=encabezado).status_code == 404

    def test_valida_el_motivo(self, cliente: TestClient) -> None:
        respuesta = cliente.request(
            "DELETE",
            f"{ENTREVISTAS}/1",
            headers=_como(cliente, MARIANA),
            json={"motivo": "x" * 256},
        )

        assert respuesta.status_code == 422
        assert "motivo" in respuesta.json()["campos"]

    def test_solo_el_candidato(self, cliente: TestClient) -> None:
        assert cliente.delete(f"{ENTREVISTAS}/1", headers=_como(cliente, LAURA)).status_code == 403
        assert cliente.delete(f"{ENTREVISTAS}/1").status_code == 401
