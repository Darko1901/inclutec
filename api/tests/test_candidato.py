from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import CONTRASENA_PRUEBA, iniciar_sesion

ME = "/api/v1/candidatos/me"
MARIANA = "mariana.lopez@correo.mx"
JORGE = "jorge.ramirez@correo.mx"

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 64

PERFIL_ENTRADA = {
    "nombre": "Mariana",
    "apellidos": "López García",
    "telefono": "4427654321",
    "municipio_id": 2,
    "jornada_id": 1,
    "resumen": "Técnica en sistemas con experiencia en soporte y atención a usuarios.",
    "disponible_reubicacion": False,
    "modalidad_ids": [2, 3],
    "categoria_ids": [1],
    "compartir_ajustes": "preguntar",
}


def _como(cliente: TestClient, correo: str) -> dict[str, str]:
    return iniciar_sesion(cliente, correo)


class TestAcceso:
    def test_sin_token_da_401(self, cliente: TestClient) -> None:
        assert cliente.get(ME).status_code == 401

    def test_un_reclutador_recibe_403_sin_permiso(self, cliente: TestClient) -> None:
        respuesta = cliente.get(ME, headers=_como(cliente, "rh@tecnoqro.mx"))

        assert respuesta.status_code == 403
        assert respuesta.json()["codigo"] == "sin_permiso"

    def test_el_administrador_tampoco_entra(self, cliente: TestClient) -> None:
        assert cliente.get(ME, headers=_como(cliente, "admin@inclutec.mx")).status_code == 403


class TestPerfil:
    def test_mariana_coincide_con_el_ejemplo_del_contrato(self, cliente: TestClient) -> None:
        perfil = cliente.get(ME, headers=_como(cliente, MARIANA)).json()

        assert list(perfil) == [
            "usuario",
            "municipio",
            "jornada",
            "resumen",
            "foto_url",
            "disponible_reubicacion",
            "modalidades",
            "categorias",
            "compartir_ajustes",
            "consentimiento_sensibles_en",
            "necesidades",
            "nota_ajustes",
            "completitud",
            "secciones_pendientes",
            "perfil_minimo",
            "actualizado_en",
        ]
        assert perfil["usuario"] == {
            "id": 3,
            "nombre": "Mariana",
            "apellidos": "López García",
            "correo": MARIANA,
            "telefono": "4427654321",
        }
        assert perfil["municipio"] == {
            "id": 2,
            "nombre": "El Marqués",
            "entidad": {"id": 22, "nombre": "Querétaro"},
        }
        assert perfil["jornada"] == {"id": 1, "nombre": "Tiempo completo"}
        assert perfil["modalidades"] == [
            {"id": 2, "nombre": "Remoto"},
            {"id": 3, "nombre": "Híbrido"},
        ]
        assert perfil["categorias"] == [{"id": 1, "nombre": "Tecnologías de la información"}]
        assert perfil["necesidades"] == [
            {"id": 1, "nombre": "Acceso con rampa", "categoria": "movilidad"},
            {"id": 3, "nombre": "Baño accesible", "categoria": "movilidad"},
        ]
        assert perfil["foto_url"] is None
        assert perfil["nota_ajustes"] is None
        assert perfil["completitud"] == 90
        assert perfil["secciones_pendientes"] == ["foto"]
        assert perfil["perfil_minimo"] is True
        assert perfil["consentimiento_sensibles_en"].endswith("Z")
        assert perfil["actualizado_en"].endswith("Z")

    def test_jorge_no_tiene_consentimiento_ni_necesidades(self, cliente: TestClient) -> None:
        perfil = cliente.get(ME, headers=_como(cliente, JORGE)).json()

        assert perfil["consentimiento_sensibles_en"] is None
        assert perfil["necesidades"] == []
        assert perfil["completitud"] == 80
        assert perfil["secciones_pendientes"] == ["foto", "experiencia"]

    def test_actualizar_guarda_y_devuelve_el_perfil(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        datos = {
            **PERFIL_ENTRADA,
            "nombre": " Mariana Sofía ",
            "telefono": None,
            "jornada_id": 2,
            "resumen": "Nuevo resumen.",
            "disponible_reubicacion": True,
            "modalidad_ids": [1],
            "categoria_ids": [1, 2],
            "compartir_ajustes": "siempre",
        }

        respuesta = cliente.put(ME, headers=encabezado, json=datos)

        assert respuesta.status_code == 200
        perfil = respuesta.json()
        assert perfil["usuario"]["nombre"] == "Mariana Sofía"
        assert perfil["usuario"]["telefono"] is None
        assert perfil["jornada"]["id"] == 2
        assert perfil["resumen"] == "Nuevo resumen."
        assert perfil["disponible_reubicacion"] is True
        assert [m["id"] for m in perfil["modalidades"]] == [1]
        assert [c["id"] for c in perfil["categorias"]] == [1, 2]
        assert perfil["compartir_ajustes"] == "siempre"
        assert cliente.get(ME, headers=encabezado).json() == perfil

    def test_actualizar_recalcula_la_completitud(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        perfil = cliente.put(
            ME, headers=encabezado, json={**PERFIL_ENTRADA, "resumen": None}
        ).json()

        assert perfil["completitud"] == 80
        assert perfil["secciones_pendientes"] == ["resumen", "foto"]

    def test_un_resumen_en_blanco_se_guarda_como_null(self, cliente: TestClient) -> None:
        perfil = cliente.put(
            ME, headers=_como(cliente, MARIANA), json={**PERFIL_ENTRADA, "resumen": "   "}
        ).json()

        assert perfil["resumen"] is None

    def test_valida_cada_campo(self, cliente: TestClient) -> None:
        datos = {
            "nombre": "",
            "apellidos": "x" * 121,
            "telefono": "12",
            "municipio_id": 99999,
            "jornada_id": 99999,
            "resumen": "x" * 501,
            "disponible_reubicacion": None,
            "modalidad_ids": [99999],
            "categoria_ids": [99999],
            "compartir_ajustes": "tal vez",
        }

        respuesta = cliente.put(ME, headers=_como(cliente, MARIANA), json=datos)

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == set(datos)
        assert respuesta.json()["campos"]["telefono"] == (
            "Escribe un teléfono de 10 dígitos, sin espacios ni guiones."
        )

    def test_una_validacion_fallida_no_cambia_nada(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        cliente.put(
            ME, headers=encabezado, json={**PERFIL_ENTRADA, "nombre": "Otra", "telefono": "1"}
        )

        assert cliente.get(ME, headers=encabezado).json()["usuario"]["nombre"] == "Mariana"

    def test_ids_repetidos_se_guardan_una_vez(self, cliente: TestClient) -> None:
        perfil = cliente.put(
            ME, headers=_como(cliente, MARIANA), json={**PERFIL_ENTRADA, "modalidad_ids": [2, 2, 3]}
        ).json()

        assert [m["id"] for m in perfil["modalidades"]] == [2, 3]


class TestFoto:
    def test_sube_la_foto_la_sirve_y_suma_10_puntos(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        respuesta = cliente.post(
            f"{ME}/foto", headers=encabezado, files={"archivo": ("a.png", PNG)}
        )

        assert respuesta.status_code == 200
        assert respuesta.json() == {"url": "/archivos/fotos/candidato-3.png"}
        descarga = cliente.get("/archivos/fotos/candidato-3.png")
        assert descarga.status_code == 200
        assert descarga.headers["content-type"] == "image/png"
        assert descarga.content == PNG
        perfil = cliente.get(ME, headers=encabezado).json()
        assert perfil["foto_url"] == "/archivos/fotos/candidato-3.png"
        assert perfil["completitud"] == 100
        assert perfil["secciones_pendientes"] == []

    def test_la_foto_nueva_reemplaza_a_la_anterior(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.post(f"{ME}/foto", headers=encabezado, files={"archivo": ("a.png", PNG)})

        nueva = cliente.post(f"{ME}/foto", headers=encabezado, files={"archivo": ("b.jpg", JPG)})

        assert nueva.json()["url"] == "/archivos/fotos/candidato-3.jpg"
        assert cliente.get("/archivos/fotos/candidato-3.png").status_code == 404
        assert cliente.get("/archivos/fotos/candidato-3.jpg").status_code == 200

    def test_el_tipo_se_valida_por_el_contenido_no_por_el_nombre(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{ME}/foto",
            headers=_como(cliente, MARIANA),
            files={"archivo": ("foto.png", b"esto no es una imagen", "image/png")},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "archivo_invalido"
        assert respuesta.json()["detail"] == "La foto debe ser JPG o PNG."

    def test_mas_de_2_mb_se_rechaza(self, cliente: TestClient) -> None:
        grande = PNG + b"\x00" * (2 * 1024 * 1024)

        respuesta = cliente.post(
            f"{ME}/foto", headers=_como(cliente, MARIANA), files={"archivo": ("a.png", grande)}
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["detail"] == "La foto pesa más de 2 MB. Elige una más ligera."

    def test_exactamente_2_mb_se_acepta(self, cliente: TestClient) -> None:
        justo = PNG + b"\x00" * (2 * 1024 * 1024 - len(PNG))

        respuesta = cliente.post(
            f"{ME}/foto", headers=_como(cliente, MARIANA), files={"archivo": ("a.png", justo)}
        )

        assert respuesta.status_code == 200

    def test_sin_archivo_da_422_archivo_invalido(self, cliente: TestClient) -> None:
        respuesta = cliente.post(f"{ME}/foto", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "archivo_invalido"

    def test_quitar_la_foto_borra_el_archivo(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.post(f"{ME}/foto", headers=encabezado, files={"archivo": ("a.png", PNG)})

        respuesta = cliente.delete(f"{ME}/foto", headers=encabezado)

        assert respuesta.status_code == 204
        assert cliente.get(ME, headers=encabezado).json()["foto_url"] is None
        assert cliente.get("/archivos/fotos/candidato-3.png").status_code == 404

    def test_no_sirve_rutas_fuera_de_las_carpetas_publicas(self, cliente: TestClient) -> None:
        assert cliente.get("/archivos/fotos/..%2Fsecreto.png").status_code == 404
        assert cliente.get("/archivos/otra/candidato-3.png").status_code == 404
        assert cliente.get("/archivos/fotos/candidato-3.pdf").status_code == 404


class TestConsentimiento:
    def test_revocarlo_borra_las_necesidades_y_la_nota(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.put(
            f"{ME}/necesidades",
            headers=encabezado,
            json={"ajuste_ids": [1], "nota_ajustes": "Nota"},
        )

        respuesta = cliente.put(
            f"{ME}/consentimiento", headers=encabezado, json={"otorgado": False}
        )

        assert respuesta.status_code == 200
        perfil = respuesta.json()
        assert perfil["consentimiento_sensibles_en"] is None
        assert perfil["necesidades"] == []
        assert perfil["nota_ajustes"] is None

    def test_las_necesidades_borradas_no_regresan_al_volver_a_otorgarlo(
        self, cliente: TestClient
    ) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.put(f"{ME}/consentimiento", headers=encabezado, json={"otorgado": False})

        perfil = cliente.put(
            f"{ME}/consentimiento", headers=encabezado, json={"otorgado": True}
        ).json()

        assert perfil["consentimiento_sensibles_en"] is not None
        assert perfil["necesidades"] == []

    def test_otorgarlo_dos_veces_conserva_la_fecha_original(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        antes = cliente.get(ME, headers=encabezado).json()["consentimiento_sensibles_en"]

        despues = cliente.put(
            f"{ME}/consentimiento", headers=encabezado, json={"otorgado": True}
        ).json()["consentimiento_sensibles_en"]

        assert antes == despues

    def test_otorgado_debe_ser_booleano(self, cliente: TestClient) -> None:
        respuesta = cliente.put(f"{ME}/consentimiento", headers=_como(cliente, MARIANA), json={})

        assert respuesta.status_code == 422
        assert "otorgado" in respuesta.json()["campos"]

    def test_el_consentimiento_se_refleja_en_la_sesion(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.put(f"{ME}/consentimiento", headers=encabezado, json={"otorgado": False})

        usuario = cliente.get("/api/v1/auth/me", headers=encabezado).json()

        assert usuario["consentimiento_sensibles"] is False


class TestNecesidades:
    def test_sin_consentimiento_da_403_y_no_guarda_nada(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, JORGE)

        respuesta = cliente.put(f"{ME}/necesidades", headers=encabezado, json={"ajuste_ids": [1]})

        assert respuesta.status_code == 403
        assert respuesta.json()["codigo"] == "sin_consentimiento"
        assert cliente.get(ME, headers=encabezado).json()["necesidades"] == []

    def test_reemplaza_la_lista_completa(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        respuesta = cliente.put(
            f"{ME}/necesidades",
            headers=encabezado,
            json={"ajuste_ids": [2, 2], "nota_ajustes": " Nota "},
        )

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert [n["id"] for n in cuerpo["necesidades"]] == [2]
        assert set(cuerpo["necesidades"][0]) == {"id", "nombre", "categoria"}
        assert cuerpo["nota_ajustes"] == "Nota"
        perfil = cliente.get(ME, headers=encabezado).json()
        assert [n["id"] for n in perfil["necesidades"]] == [2]

    def test_una_lista_vacia_borra_todo(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        cuerpo = cliente.put(
            f"{ME}/necesidades", headers=encabezado, json={"ajuste_ids": [], "nota_ajustes": None}
        ).json()

        assert cuerpo == {"necesidades": [], "nota_ajustes": None}

    def test_valida_ids_y_nota(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            f"{ME}/necesidades",
            headers=_como(cliente, MARIANA),
            json={"ajuste_ids": [99999], "nota_ajustes": "x" * 301},
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"ajuste_ids", "nota_ajustes"}

    def test_las_necesidades_no_cambian_la_completitud(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        cliente.put(f"{ME}/necesidades", headers=encabezado, json={"ajuste_ids": []})

        assert cliente.get(ME, headers=encabezado).json()["completitud"] == 90


class TestEliminarCuenta:
    def test_con_contrasena_incorrecta_da_400_y_no_borra_nada(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        respuesta = cliente.request(
            "DELETE", ME, headers=encabezado, json={"contrasena": "Equivocada1"}
        )

        assert respuesta.status_code == 400
        assert respuesta.json()["codigo"] == "contrasena_incorrecta"
        assert cliente.get(ME, headers=encabezado).status_code == 200

    def test_sin_cuerpo_tambien_da_400(self, cliente: TestClient) -> None:
        assert cliente.delete(ME, headers=_como(cliente, MARIANA)).status_code == 400

    def test_da_de_baja_la_cuenta_y_borra_los_datos(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.post(f"{ME}/foto", headers=encabezado, files={"archivo": ("a.png", PNG)})
        db.execute(
            text(
                "INSERT INTO dispositivo (usuario_id, expo_push_token, plataforma) "
                "VALUES (3, 'ExponentPushToken[m]', 'ios')"
            )
        )

        respuesta = cliente.request(
            "DELETE", ME, headers=encabezado, json={"contrasena": CONTRASENA_PRUEBA}
        )

        assert respuesta.status_code == 204
        assert db.scalar(text("SELECT estado FROM usuario WHERE id = 3")) == "eliminado"
        for tabla in ("experiencia", "formacion", "candidato_habilidad", "candidato_necesidad"):
            assert db.scalar(text(f"SELECT count(*) FROM {tabla} WHERE candidato_id = 3")) == 0
        assert db.scalar(text("SELECT count(*) FROM dispositivo WHERE usuario_id = 3")) == 0
        assert db.scalar(text("SELECT foto_url FROM candidato WHERE usuario_id = 3")) is None
        assert (
            db.scalar(
                text("SELECT consentimiento_sensibles_en FROM candidato WHERE usuario_id = 3")
            )
            is None
        )
        assert cliente.get("/archivos/fotos/candidato-3.png").status_code == 404
        # La sesión ya no sirve y no se puede volver a entrar.
        assert cliente.get(ME, headers=encabezado).status_code == 423
        login = cliente.post(
            "/api/v1/auth/login", json={"correo": MARIANA, "contrasena": CONTRASENA_PRUEBA}
        )
        assert login.status_code == 423

    def test_las_postulaciones_activas_pasan_a_retirada_y_la_entrevista_se_cancela(
        self, cliente: TestClient, db: Session
    ) -> None:
        # S002: Mariana tiene la postulación 1 en «entrevista» con una entrevista agendada.
        antes = db.execute(text("SELECT estado FROM postulacion WHERE id = 1")).scalar()
        assert antes == "entrevista"

        cliente.request(
            "DELETE", ME, headers=_como(cliente, MARIANA), json={"contrasena": CONTRASENA_PRUEBA}
        )

        assert db.scalar(text("SELECT estado FROM postulacion WHERE id = 1")) == "retirada"
        assert (
            db.scalar(text("SELECT estado FROM entrevista WHERE postulacion_id = 1")) == "cancelada"
        )
        horario = db.scalar(
            text(
                "SELECT h.estado FROM horario_entrevista h JOIN entrevista e "
                "ON e.horario_id = h.id WHERE e.postulacion_id = 1"
            )
        )
        assert horario == "libre"
        ultimo = db.execute(
            text(
                "SELECT estado_anterior, estado_nuevo, usuario_id FROM historial_postulacion "
                "WHERE postulacion_id = 1 ORDER BY id DESC LIMIT 1"
            )
        ).one()
        assert tuple(ultimo) == ("entrevista", "retirada", 3)


class TestExperiencias:
    EXPERIENCIA = {
        "puesto": "Técnico",
        "empresa": "Empresa SA",
        "fecha_inicio": "2024-01-01",
        "fecha_fin": "2024-12-31",
        "actual": False,
        "descripcion": "Soporte.",
    }

    def test_lista_la_de_mariana(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{ME}/experiencias", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        assert respuesta.json() == [
            {
                "id": 1,
                "puesto": "Auxiliar de soporte técnico",
                "empresa": "Servicios Integrales del Bajío",
                "fecha_inicio": "2023-02-01",
                "fecha_fin": "2025-06-30",
                "actual": False,
                "descripcion": "Atención de tickets y mantenimiento de equipos.",
            }
        ]

    def test_crear_devuelve_201_y_suma_a_la_completitud(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, JORGE)

        respuesta = cliente.post(f"{ME}/experiencias", headers=encabezado, json=self.EXPERIENCIA)

        assert respuesta.status_code == 201
        assert respuesta.json()["puesto"] == "Técnico"
        perfil = cliente.get(ME, headers=encabezado).json()
        assert perfil["completitud"] == 90
        assert perfil["secciones_pendientes"] == ["foto"]

    def test_ordena_primero_el_trabajo_actual_y_luego_por_fecha(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        cliente.post(
            f"{ME}/experiencias",
            headers=encabezado,
            json={
                **self.EXPERIENCIA,
                "puesto": "Anterior",
                "fecha_inicio": "2019-01-01",
                "fecha_fin": "2020-01-01",
            },
        )
        cliente.post(
            f"{ME}/experiencias",
            headers=encabezado,
            json={**self.EXPERIENCIA, "puesto": "Actual", "fecha_fin": None, "actual": True},
        )

        puestos = [
            e["puesto"] for e in cliente.get(f"{ME}/experiencias", headers=encabezado).json()
        ]

        assert puestos == ["Actual", "Auxiliar de soporte técnico", "Anterior"]

    def test_fecha_de_fin_igual_a_la_de_inicio_es_valida(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{ME}/experiencias",
            headers=_como(cliente, MARIANA),
            json={**self.EXPERIENCIA, "fecha_inicio": "2024-05-01", "fecha_fin": "2024-05-01"},
        )

        assert respuesta.status_code == 201

    def test_fecha_de_fin_anterior_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{ME}/experiencias",
            headers=_como(cliente, MARIANA),
            json={**self.EXPERIENCIA, "fecha_inicio": "2024-05-02", "fecha_fin": "2024-05-01"},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "fecha_fin": "La fecha de fin no puede ser anterior a la de inicio."
        }

    def test_un_empleo_actual_no_lleva_fecha_de_fin(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{ME}/experiencias",
            headers=_como(cliente, MARIANA),
            json={**self.EXPERIENCIA, "actual": True},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "fecha_fin": "Déjala vacía si trabajas aquí actualmente."
        }

    def test_un_empleo_actual_guarda_la_fecha_de_fin_en_null(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{ME}/experiencias",
            headers=_como(cliente, MARIANA),
            json={**self.EXPERIENCIA, "actual": True, "fecha_fin": None},
        )

        assert respuesta.json()["fecha_fin"] is None
        assert respuesta.json()["actual"] is True

    def test_valida_los_campos_obligatorios_y_las_fechas_imposibles(
        self, cliente: TestClient
    ) -> None:
        respuesta = cliente.post(
            f"{ME}/experiencias",
            headers=_como(cliente, MARIANA),
            json={"puesto": "", "empresa": "x" * 121, "fecha_inicio": "2024-02-30"},
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {
            "puesto",
            "empresa",
            "fecha_inicio",
            "actual",
            "fecha_fin",
        }

    def test_editar_y_eliminar(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        editada = cliente.put(
            f"{ME}/experiencias/1", headers=encabezado, json={**self.EXPERIENCIA, "puesto": "Jefe"}
        )
        assert editada.status_code == 200
        assert editada.json()["id"] == 1
        assert editada.json()["puesto"] == "Jefe"

        assert cliente.delete(f"{ME}/experiencias/1", headers=encabezado).status_code == 204
        assert cliente.get(f"{ME}/experiencias", headers=encabezado).json() == []
        assert cliente.get(ME, headers=encabezado).json()["secciones_pendientes"] == [
            "foto",
            "experiencia",
        ]

    def test_la_experiencia_de_otro_candidato_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, JORGE)

        assert (
            cliente.put(
                f"{ME}/experiencias/1", headers=encabezado, json=self.EXPERIENCIA
            ).status_code
            == 404
        )
        assert cliente.delete(f"{ME}/experiencias/1", headers=encabezado).status_code == 404
        assert (
            cliente.delete(f"{ME}/experiencias/999", headers=encabezado).json()["codigo"]
            == "no_encontrado"
        )
        # Y la de Mariana sigue ahí.
        assert len(cliente.get(f"{ME}/experiencias", headers=_como(cliente, MARIANA)).json()) == 1


class TestFormaciones:
    FORMACION = {
        "nivel_educativo_id": 4,
        "institucion": "Universidad Tecnológica de Querétaro",
        "carrera": "TSU en Tecnologías de la Información",
        "estado": "concluida",
        "fecha_inicio": "2020-09-01",
        "fecha_fin": "2022-08-31",
    }

    def test_lista_con_el_nivel_como_objeto(self, cliente: TestClient) -> None:
        formaciones = cliente.get(f"{ME}/formaciones", headers=_como(cliente, MARIANA)).json()

        assert formaciones
        assert set(formaciones[0]) == {
            "id",
            "nivel_educativo",
            "institucion",
            "carrera",
            "estado",
            "fecha_inicio",
            "fecha_fin",
        }
        assert set(formaciones[0]["nivel_educativo"]) == {"id", "nombre", "orden"}

    def test_crear_editar_y_eliminar(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        creada = cliente.post(f"{ME}/formaciones", headers=encabezado, json=self.FORMACION)
        assert creada.status_code == 201
        nueva_id = creada.json()["id"]
        assert creada.json()["nivel_educativo"]["id"] == 4

        editada = cliente.put(
            f"{ME}/formaciones/{nueva_id}",
            headers=encabezado,
            json={**self.FORMACION, "estado": "en_curso", "fecha_fin": None, "carrera": None},
        )
        assert editada.status_code == 200
        assert editada.json()["estado"] == "en_curso"
        assert editada.json()["carrera"] is None

        assert cliente.delete(f"{ME}/formaciones/{nueva_id}", headers=encabezado).status_code == 204

    def test_sin_fechas_es_valido(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{ME}/formaciones",
            headers=_como(cliente, MARIANA),
            json={**self.FORMACION, "fecha_inicio": None, "fecha_fin": None},
        )

        assert respuesta.status_code == 201

    def test_valida_campos_y_fechas(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            f"{ME}/formaciones",
            headers=_como(cliente, MARIANA),
            json={
                "nivel_educativo_id": 999,
                "institucion": "",
                "estado": "terminada",
                "fecha_inicio": "2022-01-01",
                "fecha_fin": "2021-01-01",
            },
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {
            "nivel_educativo_id",
            "institucion",
            "estado",
            "fecha_fin",
        }

    def test_la_formacion_de_otro_candidato_da_404(self, cliente: TestClient) -> None:
        propia = cliente.get(f"{ME}/formaciones", headers=_como(cliente, MARIANA)).json()[0]["id"]
        encabezado = _como(cliente, JORGE)

        assert (
            cliente.put(
                f"{ME}/formaciones/{propia}", headers=encabezado, json=self.FORMACION
            ).status_code
            == 404
        )
        assert cliente.delete(f"{ME}/formaciones/{propia}", headers=encabezado).status_code == 404

    def test_borrar_la_ultima_formacion_quita_el_perfil_minimo(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        for formacion in cliente.get(f"{ME}/formaciones", headers=encabezado).json():
            cliente.delete(f"{ME}/formaciones/{formacion['id']}", headers=encabezado)

        perfil = cliente.get(ME, headers=encabezado).json()

        assert perfil["perfil_minimo"] is False
        assert "formacion" in perfil["secciones_pendientes"]


class TestHabilidades:
    def test_lista_con_su_nivel(self, cliente: TestClient) -> None:
        habilidades = cliente.get(f"{ME}/habilidades", headers=_como(cliente, MARIANA)).json()

        assert habilidades
        assert all(set(h) == {"id", "nombre", "nivel"} for h in habilidades)
        nombres = [h["nombre"] for h in habilidades]
        assert nombres == sorted(nombres)

    def test_reemplaza_la_lista_completa(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        respuesta = cliente.put(
            f"{ME}/habilidades",
            headers=encabezado,
            json={
                "habilidades": [
                    {"habilidad_id": 4, "nivel": "avanzado"},
                    {"habilidad_id": 5, "nivel": "basico"},
                ]
            },
        )

        assert respuesta.status_code == 200
        assert {(h["id"], h["nivel"]) for h in respuesta.json()} == {(4, "avanzado"), (5, "basico")}
        assert len(cliente.get(f"{ME}/habilidades", headers=encabezado).json()) == 2

    def test_una_lista_vacia_las_borra_y_quita_el_perfil_minimo(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        respuesta = cliente.put(f"{ME}/habilidades", headers=encabezado, json={"habilidades": []})

        assert respuesta.json() == []
        perfil = cliente.get(ME, headers=encabezado).json()
        assert perfil["perfil_minimo"] is False
        assert "habilidades" in perfil["secciones_pendientes"]

    def test_mas_de_30_da_limite_habilidades(self, cliente: TestClient, db: Session) -> None:
        db.execute(
            text(
                "INSERT INTO habilidad (categoria_id, nombre) "
                "SELECT 1, 'Extra ' || n FROM generate_series(1, 31) n"
            )
        )
        ids = [r[0] for r in db.execute(text("SELECT id FROM habilidad ORDER BY id DESC LIMIT 31"))]

        respuesta = cliente.put(
            f"{ME}/habilidades",
            headers=_como(cliente, MARIANA),
            json={"habilidades": [{"habilidad_id": i, "nivel": "basico"} for i in ids]},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "limite_habilidades"

    def test_repetidas_dan_limite_habilidades(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            f"{ME}/habilidades",
            headers=_como(cliente, MARIANA),
            json={
                "habilidades": [
                    {"habilidad_id": 4, "nivel": "basico"},
                    {"habilidad_id": 4, "nivel": "avanzado"},
                ]
            },
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "limite_habilidades"
        assert respuesta.json()["detail"] == "Hay habilidades repetidas. Quita las duplicadas."

    def test_un_error_no_cambia_la_lista(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        antes = cliente.get(f"{ME}/habilidades", headers=encabezado).json()

        cliente.put(
            f"{ME}/habilidades",
            headers=encabezado,
            json={"habilidades": [{"habilidad_id": 4, "nivel": "experto"}]},
        )

        assert cliente.get(f"{ME}/habilidades", headers=encabezado).json() == antes

    def test_valida_habilidad_y_nivel_con_indice(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            f"{ME}/habilidades",
            headers=_como(cliente, MARIANA),
            json={"habilidades": [{"habilidad_id": 99999, "nivel": "experto"}]},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "habilidades.0.habilidad_id": "Elige una habilidad de la lista.",
            "habilidades.0.nivel": "Elige básico, intermedio o avanzado.",
        }

    def test_sin_la_lista_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.put(f"{ME}/habilidades", headers=_como(cliente, MARIANA), json={})

        assert respuesta.status_code == 422
        assert "habilidades" in respuesta.json()["campos"]


class TestVistaPrevia:
    def test_el_cv_no_trae_contacto_ni_necesidades(self, cliente: TestClient) -> None:
        cv = cliente.get(f"{ME}/vista-previa", headers=_como(cliente, MARIANA)).json()

        assert list(cv) == [
            "id",
            "nombre",
            "apellidos",
            "foto_url",
            "municipio",
            "resumen",
            "modalidades",
            "experiencias",
            "formaciones",
            "habilidades",
            "correo",
            "telefono",
        ]
        assert cv["id"] == 3
        assert cv["correo"] is None
        assert cv["telefono"] is None
        assert "necesidades" not in cv
        assert len(cv["experiencias"]) == 1
        assert cv["municipio"]["nombre"] == "El Marqués"


class TestIdsFueraDeRango:
    """Un id enorme nunca debe llegar a la base: ahí produciría un 500."""

    def test_id_de_ruta_enorme_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        enorme = 10**30

        assert cliente.delete(f"{ME}/experiencias/{enorme}", headers=encabezado).status_code == 404
        assert cliente.delete(f"{ME}/formaciones/{enorme}", headers=encabezado).status_code == 404

    def test_id_de_catalogo_enorme_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            ME,
            headers=_como(cliente, MARIANA),
            json={**PERFIL_ENTRADA, "municipio_id": 10**30, "modalidad_ids": [10**30]},
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"municipio_id", "modalidad_ids"}


class TestCatalogosDesactivados:
    """Lo desactivado deja de ofrecerse en registros nuevos, pero lo ya guardado no cambia."""

    def test_volver_a_guardar_el_perfil_con_lo_ya_elegido(
        self, cliente: TestClient, db: Session
    ) -> None:
        # Mariana ya tenía la jornada 1, las modalidades 2 y 3 y la categoría 1.
        for tabla, id_ in (("jornada", 1), ("modalidad", 2), ("categoria", 1)):
            db.execute(text(f"UPDATE {tabla} SET activo = false WHERE id = {id_}"))

        respuesta = cliente.put(ME, headers=iniciar_sesion(cliente, MARIANA), json=PERFIL_ENTRADA)

        assert respuesta.status_code == 200, respuesta.json()

    def test_no_se_elige_una_opcion_nueva_desactivada(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE modalidad SET activo = false WHERE id = 1"))

        respuesta = cliente.put(
            ME,
            headers=iniciar_sesion(cliente, MARIANA),
            json=PERFIL_ENTRADA | {"modalidad_ids": [1, 2, 3]},
        )

        assert respuesta.status_code == 422
        assert "modalidad_ids" in respuesta.json()["campos"]

    def test_habilidades_y_necesidades_ya_guardadas(self, cliente: TestClient, db: Session) -> None:
        mariana = iniciar_sesion(cliente, MARIANA)
        habilidades = cliente.get(f"{ME}/habilidades", headers=mariana).json()
        db.execute(text(f"UPDATE habilidad SET activo = false WHERE id = {habilidades[0]['id']}"))
        # Mariana ya tenía las necesidades 1 y 3; la 12 sería nueva.
        db.execute(text("UPDATE ajuste SET activo = false WHERE id IN (1, 12)"))

        mismas = cliente.put(
            f"{ME}/habilidades",
            headers=mariana,
            json={
                "habilidades": [{"habilidad_id": h["id"], "nivel": h["nivel"]} for h in habilidades]
            },
        )
        necesidades = cliente.put(
            f"{ME}/necesidades", headers=mariana, json={"ajuste_ids": [1, 3], "nota_ajustes": None}
        )
        nueva = cliente.put(
            f"{ME}/necesidades",
            headers=mariana,
            json={"ajuste_ids": [1, 3, 12], "nota_ajustes": None},
        )

        assert mismas.status_code == 200, mismas.json()
        assert necesidades.status_code == 200, necesidades.json()
        assert nueva.status_code == 422
