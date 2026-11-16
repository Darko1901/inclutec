import threading

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.servicios import notificaciones as servicio
from app.servicios.notificaciones import Entrega
from app.servicios.recordatorios import enviar_recordatorios
from tests.conftest import iniciar_sesion

NOTIFICACIONES = "/api/v1/notificaciones"
DISPOSITIVOS = "/api/v1/dispositivos"
MARIANA = "mariana.lopez@correo.mx"  # S002: 1 notificación (cambio_estado), id 1
LAURA = "rh@tecnoqro.mx"  # S002: 1 notificación (entrevista_agendada), id 2
ROBERTO = "rh@logibajio.mx"  # S002: 1 notificación (nueva_postulacion), id 3
ADMIN = "admin@inclutec.mx"


def _como(cliente: TestClient, correo: str) -> dict[str, str]:
    return iniciar_sesion(cliente, correo)


class TestDispositivos:
    def test_registra_el_token(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(
            DISPOSITIVOS,
            headers=_como(cliente, MARIANA),
            json={"expo_push_token": "ExponentPushToken[abc]", "plataforma": "ios"},
        )

        assert respuesta.status_code == 204
        fila = db.execute(
            text(
                "SELECT usuario_id, plataforma FROM dispositivo WHERE expo_push_token = 'ExponentPushToken[abc]'"
            )
        ).one()
        assert tuple(fila) == (3, "ios")

    def test_si_el_token_ya_existe_se_reasigna_al_usuario_actual(
        self, cliente: TestClient, db: Session
    ) -> None:
        cuerpo = {"expo_push_token": "ExponentPushToken[abc]", "plataforma": "android"}
        cliente.post(DISPOSITIVOS, headers=_como(cliente, MARIANA), json=cuerpo)

        cliente.post(DISPOSITIVOS, headers=_como(cliente, LAURA), json=cuerpo)

        filas = db.execute(
            text(
                "SELECT usuario_id FROM dispositivo WHERE expo_push_token = 'ExponentPushToken[abc]'"
            )
        ).all()
        assert [f[0] for f in filas] == [2]

    def test_registrarlo_dos_veces_no_lo_duplica(self, cliente: TestClient, db: Session) -> None:
        cuerpo = {"expo_push_token": "ExponentPushToken[abc]", "plataforma": "ios"}
        for _ in range(2):
            cliente.post(DISPOSITIVOS, headers=_como(cliente, MARIANA), json=cuerpo)

        assert db.scalar(text("SELECT count(*) FROM dispositivo")) == 1

    def test_valida_token_y_plataforma(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            DISPOSITIVOS,
            headers=_como(cliente, MARIANA),
            json={"expo_push_token": "x" * 256, "plataforma": "windows"},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "expo_push_token": "El token del dispositivo no es válido.",
            "plataforma": "La plataforma debe ser android o ios.",
        }

    def test_el_administrador_no_registra_dispositivos(self, cliente: TestClient) -> None:
        cuerpo = {"expo_push_token": "ExponentPushToken[abc]", "plataforma": "ios"}

        assert (
            cliente.post(DISPOSITIVOS, headers=_como(cliente, ADMIN), json=cuerpo).status_code
            == 403
        )
        assert cliente.post(DISPOSITIVOS, json=cuerpo).status_code == 401


class TestListar:
    def test_trae_solo_las_del_usuario_con_la_forma_del_contrato(self, cliente: TestClient) -> None:
        respuesta = cliente.get(NOTIFICACIONES, headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert (cuerpo["total"], cuerpo["page"], cuerpo["size"]) == (1, 1, 20)
        n = cuerpo["items"][0]
        assert list(n) == ["id", "tipo", "titulo", "mensaje", "referencia", "leida", "creado_en"]
        assert n["tipo"] == "cambio_estado"
        assert n["referencia"] == {"tipo": "postulacion", "id": 1}
        assert n["leida"] is False
        assert n["creado_en"].endswith("Z")
        assert "usuario_id" not in n

    def test_las_mas_recientes_primero_y_se_pagina(self, cliente: TestClient, db: Session) -> None:
        for i in range(3):
            db.execute(
                text(
                    "INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, creado_en) "
                    "VALUES (3, 'cambio_estado', :t, 'm', now() + :d * interval '1 minute')"
                ),
                {"t": f"Aviso {i}", "d": i},
            )
        encabezado = _como(cliente, MARIANA)

        todas = cliente.get(NOTIFICACIONES, headers=encabezado).json()
        segunda = cliente.get(
            NOTIFICACIONES, params={"size": 2, "page": 2}, headers=encabezado
        ).json()

        assert [n["titulo"] for n in todas["items"]][:3] == ["Aviso 2", "Aviso 1", "Aviso 0"]
        assert todas["total"] == 4
        assert len(segunda["items"]) == 2

    def test_una_notificacion_sin_referencia_la_trae_en_null(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text(
                "INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES (3, 'reporte_resuelto', 't', 'm')"
            )
        )

        items = cliente.get(NOTIFICACIONES, headers=_como(cliente, MARIANA)).json()["items"]

        assert next(n for n in items if n["tipo"] == "reporte_resuelto")["referencia"] is None

    def test_solo_no_leidas(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.patch(f"{NOTIFICACIONES}/1/leida", headers=encabezado)

        todas = cliente.get(NOTIFICACIONES, headers=encabezado).json()
        no_leidas = cliente.get(
            NOTIFICACIONES, params={"solo_no_leidas": "true"}, headers=encabezado
        ).json()

        assert todas["total"] == 1
        assert no_leidas["total"] == 0

    def test_valida_page_y_size(self, cliente: TestClient) -> None:
        respuesta = cliente.get(NOTIFICACIONES, params={"page": 0}, headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 422

    def test_el_administrador_no_tiene_notificaciones(self, cliente: TestClient) -> None:
        assert cliente.get(NOTIFICACIONES, headers=_como(cliente, ADMIN)).status_code == 403
        assert cliente.get(NOTIFICACIONES).status_code == 401


class TestResumenYLeidas:
    def test_cuenta_las_no_leidas(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{NOTIFICACIONES}/resumen", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 200
        assert respuesta.json() == {"no_leidas": 1}

    def test_marcar_una_baja_el_contador(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)

        respuesta = cliente.patch(f"{NOTIFICACIONES}/2/leida", headers=encabezado)

        assert respuesta.status_code == 204
        assert cliente.get(f"{NOTIFICACIONES}/resumen", headers=encabezado).json() == {
            "no_leidas": 0
        }

    def test_no_se_marca_la_de_otra_persona(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        assert cliente.patch(f"{NOTIFICACIONES}/2/leida", headers=encabezado).status_code == 404
        assert cliente.patch(f"{NOTIFICACIONES}/9999/leida", headers=encabezado).status_code == 404
        assert (
            cliente.patch(f"{NOTIFICACIONES}/{10**30}/leida", headers=encabezado).status_code == 404
        )
        assert cliente.get(f"{NOTIFICACIONES}/resumen", headers=_como(cliente, LAURA)).json() == {
            "no_leidas": 1
        }

    def test_marcar_todas_solo_toca_las_propias(self, cliente: TestClient, db: Session) -> None:
        db.execute(
            text(
                "INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES (2, 'cambio_estado', 't', 'm')"
            )
        )
        encabezado = _como(cliente, LAURA)

        respuesta = cliente.patch(f"{NOTIFICACIONES}/leidas", headers=encabezado)

        assert respuesta.status_code == 204
        assert cliente.get(f"{NOTIFICACIONES}/resumen", headers=encabezado).json() == {
            "no_leidas": 0
        }
        assert cliente.get(f"{NOTIFICACIONES}/resumen", headers=_como(cliente, MARIANA)).json() == {
            "no_leidas": 1
        }

    def test_leidas_y_resumen_no_chocan_con_la_ruta_del_id(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        assert cliente.patch(f"{NOTIFICACIONES}/leidas", headers=encabezado).status_code == 204
        assert cliente.get(f"{NOTIFICACIONES}/resumen", headers=encabezado).status_code == 200


class TestPreferencias:
    def test_por_omision_todo_viene_en_true_con_los_tipos_del_rol(
        self, cliente: TestClient
    ) -> None:
        candidata = cliente.get(
            f"{NOTIFICACIONES}/preferencias", headers=_como(cliente, MARIANA)
        ).json()
        reclutadora = cliente.get(
            f"{NOTIFICACIONES}/preferencias", headers=_como(cliente, LAURA)
        ).json()

        assert [p["tipo"] for p in candidata] == [
            "cambio_estado",
            "entrevista_cancelada",
            "recordatorio_entrevista",
            "vacante_suspendida",
            "vacante_actualizada",
            "reporte_resuelto",
        ]
        assert "nueva_postulacion" in [p["tipo"] for p in reclutadora]
        assert len(reclutadora) == 8
        assert all(p["push"] is True and p["correo"] is True for p in candidata + reclutadora)

    def test_guarda_y_devuelve_la_lista(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        respuesta = cliente.put(
            f"{NOTIFICACIONES}/preferencias",
            headers=encabezado,
            json=[
                {"tipo": "cambio_estado", "push": False, "correo": True},
                {"tipo": "recordatorio_entrevista", "push": True, "correo": False},
            ],
        )

        assert respuesta.status_code == 200
        guardadas = {p["tipo"]: p for p in respuesta.json()}
        assert guardadas["cambio_estado"] == {
            "tipo": "cambio_estado",
            "push": False,
            "correo": True,
        }
        assert guardadas["recordatorio_entrevista"]["correo"] is False
        # Los tipos que no vinieron conservan su valor.
        assert guardadas["vacante_suspendida"]["push"] is True
        assert (
            cliente.get(f"{NOTIFICACIONES}/preferencias", headers=encabezado).json()
            == respuesta.json()
        )

    def test_guardar_dos_veces_reemplaza_no_duplica(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, MARIANA)
        for push in (False, True):
            cliente.put(
                f"{NOTIFICACIONES}/preferencias",
                headers=encabezado,
                json=[{"tipo": "cambio_estado", "push": push, "correo": push}],
            )

        assert (
            db.scalar(text("SELECT count(*) FROM preferencia_notificacion WHERE usuario_id = 3"))
            == 1
        )

    @pytest.mark.parametrize(
        "cuerpo",
        [
            [{"tipo": "nueva_postulacion", "push": True, "correo": True}],  # no aplica a candidatos
            [{"tipo": "inventado", "push": True, "correo": True}],
            [{"tipo": "cambio_estado", "push": "si", "correo": True}],
            [{"tipo": "cambio_estado", "push": True}],
            [
                {"tipo": "cambio_estado", "push": True, "correo": True},
                {"tipo": "cambio_estado", "push": False, "correo": False},
            ],
        ],
    )
    def test_valida_los_tipos_y_los_valores(self, cliente: TestClient, cuerpo: list) -> None:
        respuesta = cliente.put(
            f"{NOTIFICACIONES}/preferencias", headers=_como(cliente, MARIANA), json=cuerpo
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "validacion"

    def test_una_preferencia_invalida_no_guarda_nada(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        cliente.put(
            f"{NOTIFICACIONES}/preferencias",
            headers=encabezado,
            json=[
                {"tipo": "cambio_estado", "push": False, "correo": False},
                {"tipo": "inventado", "push": True, "correo": True},
            ],
        )

        primera = cliente.get(f"{NOTIFICACIONES}/preferencias", headers=encabezado).json()[0]
        assert primera["push"] is True

    def test_el_administrador_no_tiene_preferencias(self, cliente: TestClient) -> None:
        assert (
            cliente.get(f"{NOTIFICACIONES}/preferencias", headers=_como(cliente, ADMIN)).status_code
            == 403
        )


class TestEntrega:
    def test_el_push_va_a_expo_con_el_formato_de_su_api(self, monkeypatch) -> None:
        enviados: list[dict] = []

        def falso(url, json, timeout):
            enviados.append({"url": url, "json": json})

        monkeypatch.setattr(httpx, "post", falso)

        servicio.entregar(
            [
                Entrega(
                    tipo="cambio_estado",
                    titulo="Tu postulación avanzó",
                    mensaje="Pasó a En revisión.",
                    referencia={"tipo": "postulacion", "id": 7},
                    tokens_push=["ExponentPushToken[a]", "ExponentPushToken[b]"],
                )
            ]
        )

        assert enviados[0]["url"] == "https://exp.host/--/api/v2/push/send"
        assert enviados[0]["json"] == [
            {
                "to": token,
                "title": "Tu postulación avanzó",
                "body": "Pasó a En revisión.",
                "sound": "default",
                "data": {"tipo": "postulacion", "id": 7},
            }
            for token in ("ExponentPushToken[a]", "ExponentPushToken[b]")
        ]

    def test_el_correo_usa_el_texto_propio_si_lo_hay(self, monkeypatch) -> None:
        enviados: list[tuple] = []
        monkeypatch.setattr(
            servicio.servicio_correo, "enviar_por_smtp", lambda *datos: enviados.append(datos)
        )

        servicio.entregar(
            [
                Entrega("cambio_estado", "Asunto", "Mensaje", None, correo="a@correo.mx"),
                Entrega(
                    "cambio_estado",
                    "Otro",
                    "Mensaje",
                    None,
                    correo="b@correo.mx",
                    correo_texto="Texto largo",
                ),
            ]
        )

        assert enviados == [
            ("a@correo.mx", "Asunto", "Mensaje"),
            ("b@correo.mx", "Otro", "Texto largo"),
        ]

    def test_un_fallo_del_push_no_rompe_ni_detiene_los_demas(self, monkeypatch) -> None:
        enviados: list[str] = []

        def falla(url, json, timeout):
            raise httpx.ConnectError("sin red")

        monkeypatch.setattr(httpx, "post", falla)
        monkeypatch.setattr(
            servicio.servicio_correo,
            "enviar_por_smtp",
            lambda destino, *_: enviados.append(destino),
        )

        servicio.entregar(
            [
                Entrega(
                    "cambio_estado",
                    "t",
                    "m",
                    None,
                    tokens_push=["ExponentPushToken[a]"],
                    correo="a@correo.mx",
                )
            ]
        )

        assert enviados == ["a@correo.mx"]

    def test_un_error_inesperado_en_un_aviso_no_impide_los_siguientes(self, monkeypatch) -> None:
        enviados: list[str] = []

        def envia(destino, *_):
            if destino == "malo@correo.mx":
                raise RuntimeError("falla")
            enviados.append(destino)

        monkeypatch.setattr(servicio.servicio_correo, "enviar_por_smtp", envia)

        servicio.entregar(
            [
                Entrega("cambio_estado", "t", "m", None, correo="malo@correo.mx"),
                Entrega("cambio_estado", "t", "m", None, correo="bueno@correo.mx"),
            ]
        )

        assert enviados == ["bueno@correo.mx"]

    def test_despachar_corre_en_otro_hilo(self, monkeypatch) -> None:
        hilos: list[str] = []
        listo = threading.Event()

        def entregar(_):
            hilos.append(threading.current_thread().name)
            listo.set()

        monkeypatch.setattr(servicio, "entregar", entregar)

        servicio.despachar_en_segundo_plano(
            [Entrega("cambio_estado", "t", "m", None, correo="a@correo.mx")]
        )

        assert listo.wait(timeout=5)
        assert hilos[0] != threading.current_thread().name

    def test_sin_avisos_no_lanza_ningun_hilo(self, monkeypatch) -> None:
        monkeypatch.setattr(servicio, "entregar", lambda _: pytest.fail("no debía entregar"))

        servicio.despachar_en_segundo_plano([])

    def test_crear_programa_push_y_correo_segun_las_preferencias(self, db: Session) -> None:
        db.execute(
            text(
                "INSERT INTO dispositivo (usuario_id, expo_push_token, plataforma) VALUES (3, 'ExponentPushToken[m]', 'ios')"
            )
        )

        servicio.crear(db, 3, "cambio_estado", "Título", "Mensaje", "postulacion", 1)

        entrega = db.info["entregas"][0]
        assert entrega.tokens_push == ["ExponentPushToken[m]"]
        assert entrega.correo == MARIANA
        assert entrega.referencia == {"tipo": "postulacion", "id": 1}

    def test_con_ambos_canales_apagados_solo_queda_el_aviso_en_la_app(self, db: Session) -> None:
        db.execute(
            text(
                "INSERT INTO preferencia_notificacion (usuario_id, tipo, push, correo) VALUES (3, 'cambio_estado', FALSE, FALSE)"
            )
        )

        servicio.crear(db, 3, "cambio_estado", "Título", "Mensaje")

        assert "entregas" not in db.info
        # El aviso dentro de la app siempre se crea, sin importar las preferencias.
        assert (
            db.scalar(
                text("SELECT count(*) FROM notificacion WHERE usuario_id = 3 AND titulo = 'Título'")
            )
            == 1
        )


class TestRecordatorios:
    def _preparar(
        self, db: Session, horas_para_la_entrevista: float, agendada_hace_dias: float = 3
    ) -> None:
        db.execute(
            text(
                "UPDATE horario_entrevista SET inicio = now() + :h * interval '1 hour' WHERE id = 1"
            ),
            {"h": horas_para_la_entrevista},
        )
        db.execute(
            text("UPDATE entrevista SET creado_en = now() - :d * interval '1 day' WHERE id = 1"),
            {"d": agendada_hace_dias},
        )

    def test_a_24_horas_o_menos_avisa_al_candidato_y_al_reclutador(self, db: Session) -> None:
        self._preparar(db, 20)

        recordadas = enviar_recordatorios(db)

        assert recordadas == 1
        candidata = db.execute(
            text(
                "SELECT titulo, mensaje, referencia_tipo, referencia_id FROM notificacion WHERE usuario_id = 3 AND tipo = 'recordatorio_entrevista'"
            )
        ).one()
        reclutadora = db.execute(
            text(
                "SELECT mensaje, referencia_tipo, referencia_id FROM notificacion WHERE usuario_id = 2 AND tipo = 'recordatorio_entrevista'"
            )
        ).one()
        assert candidata[0] == "Recordatorio de entrevista"
        assert "Técnico de soporte de TI" in candidata[1]
        assert "en 24 horas" in candidata[1]
        assert candidata[2:] == ("postulacion", 1)
        assert "Mariana López García" in reclutadora[0]
        assert reclutadora[1:] == ("entrevista", 1)
        assert sorted(e.correo for e in db.info["entregas"]) == [MARIANA, LAURA]
        assert all("meet.google.com" in e.correo_texto for e in db.info["entregas"])

    def test_se_recuerda_una_sola_vez(self, db: Session) -> None:
        self._preparar(db, 20)

        primera = enviar_recordatorios(db)
        segunda = enviar_recordatorios(db)

        assert (primera, segunda) == (1, 0)
        assert (
            db.scalar(text("SELECT recordatorio_en IS NOT NULL FROM entrevista WHERE id = 1"))
            is True
        )
        assert (
            db.scalar(
                text("SELECT count(*) FROM notificacion WHERE tipo = 'recordatorio_entrevista'")
            )
            == 2
        )

    def test_con_mas_de_24_horas_todavia_no(self, db: Session) -> None:
        self._preparar(db, 30)

        assert enviar_recordatorios(db) == 0
        assert (
            db.scalar(text("SELECT recordatorio_en IS NULL FROM entrevista WHERE id = 1")) is True
        )

    def test_una_entrevista_que_ya_empezo_no_se_recuerda(self, db: Session) -> None:
        self._preparar(db, -1)

        assert enviar_recordatorios(db) == 0

    def test_una_entrevista_agendada_a_ultima_hora_no_se_recuerda(self, db: Session) -> None:
        self._preparar(db, 20, agendada_hace_dias=0)

        assert enviar_recordatorios(db) == 0
        # Pero queda revisada para no volver a considerarla en cada ciclo.
        assert (
            db.scalar(text("SELECT recordatorio_en IS NOT NULL FROM entrevista WHERE id = 1"))
            is True
        )

    def test_una_entrevista_cancelada_no_se_recuerda(self, db: Session) -> None:
        self._preparar(db, 20)
        db.execute(text("UPDATE entrevista SET estado = 'cancelada' WHERE id = 1"))

        assert enviar_recordatorios(db) == 0

    def test_respeta_las_preferencias_de_cada_quien(self, db: Session) -> None:
        self._preparar(db, 20)
        db.execute(
            text(
                "INSERT INTO preferencia_notificacion (usuario_id, tipo, push, correo) VALUES (3, 'recordatorio_entrevista', FALSE, FALSE)"
            )
        )

        enviar_recordatorios(db)

        # El aviso en la app siempre se crea; el correo solo le llega a la reclutadora.
        assert (
            db.scalar(
                text(
                    "SELECT count(*) FROM notificacion WHERE usuario_id = 3 AND tipo = 'recordatorio_entrevista'"
                )
            )
            == 1
        )
        assert [e.correo for e in db.info["entregas"]] == [LAURA]
