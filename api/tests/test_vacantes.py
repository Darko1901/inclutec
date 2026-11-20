from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import iniciar_sesion

VACANTES = "/api/v1/vacantes"
EMPRESAS = "/api/v1/empresas"
MARIANA = "mariana.lopez@correo.mx"  # candidata, necesidades 1 y 3, postulada a la vacante 1
JORGE = "jorge.ramirez@correo.mx"  # candidato sin necesidades, postulado a la vacante 3
LAURA = "rh@tecnoqro.mx"  # TecnoQro (vacantes 1, 6 y 7)
ROBERTO = "rh@logibajio.mx"  # LogiBajío (vacantes 2 y 3)
DANIEL = "contacto@estudiotrazo.mx"  # empresa pendiente: solo borradores
ADMIN = "admin@inclutec.mx"


def _como(cliente: TestClient, correo: str) -> dict[str, str]:
    return iniciar_sesion(cliente, correo)


def _ids(respuesta) -> list[int]:
    return [v["id"] for v in respuesta.json()["items"]]


ENTRADA = {
    "titulo": "Técnico de redes",
    "categoria_id": 1,
    "descripcion": "Instala y da mantenimiento a la red de la empresa.",
    "jornada_id": 1,
    "tipo_contrato_id": 1,
    "plazas": 2,
    "modalidad_id": 3,
    "municipio_id": 3,
    "direccion": "Av. Constituyentes 100, Querétaro",
    "salario_min": 12000,
    "salario_max": 15000,
    "mostrar_salario": True,
    "nivel_educativo_id": 4,
    "experiencia_anios": 1,
    "habilidades": [
        {"habilidad_id": 5, "obligatoria": True},
        {"habilidad_id": 6, "obligatoria": False},
    ],
    "ajustes": [
        {"ajuste_id": 1, "tipo": "existente"},
        {"ajuste_id": 12, "tipo": "bajo_solicitud"},
    ],
    "sin_condiciones_accesibilidad": False,
    "notas_accesibilidad": None,
    "estado": "publicada",
}


class TestRecomendadas:
    def test_solo_el_candidato_entra(self, cliente: TestClient) -> None:
        assert cliente.get(f"{VACANTES}/recomendadas").status_code == 401
        assert (
            cliente.get(f"{VACANTES}/recomendadas", headers=_como(cliente, LAURA)).status_code
            == 403
        )

    def test_ordena_a_mariana_por_compatibilidad_de_mayor_a_menor(
        self, cliente: TestClient
    ) -> None:
        respuesta = cliente.get(f"{VACANTES}/recomendadas", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert _ids(respuesta) == [1, 2, 4, 3, 5, 6]
        assert [v["compatibilidad"] for v in cuerpo["items"]] == [88, 55, 43, 26, 25, 15]
        assert cuerpo["total"] == 6
        assert (cuerpo["page"], cuerpo["size"]) == (1, 20)

    def test_ordena_a_jorge_con_sus_propios_puntajes(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{VACANTES}/recomendadas", headers=_como(cliente, JORGE))

        assert _ids(respuesta) == [3, 2, 6, 1, 5, 4]
        assert [v["compatibilidad"] for v in respuesta.json()["items"]] == [79, 63, 58, 57, 53, 51]

    def test_la_tarjeta_trae_los_campos_del_contrato(self, cliente: TestClient) -> None:
        primera = cliente.get(f"{VACANTES}/recomendadas", headers=_como(cliente, MARIANA)).json()[
            "items"
        ][0]

        assert list(primera) == [
            "id",
            "titulo",
            "empresa",
            "categoria",
            "modalidad",
            "jornada",
            "municipio",
            "salario",
            "compatibilidad",
            "ajustes",
            "cubre_mis_necesidades",
            "publicada_en",
            "postulacion_id",
        ]
        assert primera["titulo"] == "Técnico de soporte de TI"
        assert primera["empresa"] == {
            "id": 1,
            "nombre_comercial": "TecnoQro",
            "logo_url": None,
            "validada": True,
        }
        assert primera["modalidad"] == {"id": 3, "nombre": "Híbrido"}
        assert primera["salario"] == {"min": 14000, "max": 18000}
        assert primera["cubre_mis_necesidades"] is True
        assert primera["postulacion_id"] == 1
        assert [(a["id"], a["tipo"]) for a in primera["ajustes"]] == [
            (1, "existente"),
            (3, "existente"),
            (12, "bajo_solicitud"),
        ]
        assert set(primera["ajustes"][0]) == {"id", "nombre", "categoria", "tipo"}
        assert primera["publicada_en"].endswith("Z")

    def test_el_salario_oculto_va_en_null_para_el_candidato(self, cliente: TestClient) -> None:
        items = cliente.get(f"{VACANTES}/recomendadas", headers=_como(cliente, MARIANA)).json()[
            "items"
        ]

        assert next(v for v in items if v["id"] == 4)["salario"] is None

    def test_pagina(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            f"{VACANTES}/recomendadas",
            params={"size": 2, "page": 2},
            headers=_como(cliente, MARIANA),
        )

        assert _ids(respuesta) == [4, 3]
        assert respuesta.json()["total"] == 6

    def test_no_incluye_borradores_ni_pausadas_ni_empresas_no_validadas(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE vacante SET estado = 'pausada' WHERE id = 1"))
        db.execute(text("UPDATE empresa SET estado = 'suspendida' WHERE id = 3"))

        respuesta = cliente.get(f"{VACANTES}/recomendadas", headers=_como(cliente, MARIANA))

        assert _ids(respuesta) == [2, 3, 6]


class TestBuscar:
    def _buscar(self, cliente: TestClient, correo: str = MARIANA, **params):
        return cliente.get(VACANTES, params=params, headers=_como(cliente, correo))

    def test_sin_filtros_es_igual_que_recomendadas(self, cliente: TestClient) -> None:
        assert _ids(self._buscar(cliente)) == [1, 2, 4, 3, 5, 6]

    def test_busca_texto_sin_importar_acentos_ni_mayusculas(self, cliente: TestClient) -> None:
        assert _ids(self._buscar(cliente, q="soporte")) == [1]
        assert _ids(self._buscar(cliente, q="ALMACEN")) == [2]
        # También busca en el nombre de la empresa y en la descripción.
        assert _ids(self._buscar(cliente, q="logibajio")) == [2, 3]

    def test_el_texto_de_menos_de_3_caracteres_da_422(self, cliente: TestClient) -> None:
        respuesta = self._buscar(cliente, q="ab")

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {"q": "Escribe al menos 3 caracteres."}

    def test_los_comodines_se_toman_literal(self, cliente: TestClient) -> None:
        assert _ids(self._buscar(cliente, q="%%%")) == []

    def test_filtros_por_catalogo(self, cliente: TestClient) -> None:
        assert _ids(self._buscar(cliente, modalidad_id=3)) == [1, 3]
        assert _ids(self._buscar(cliente, categoria_id=1)) == [1, 3, 6]
        assert _ids(self._buscar(cliente, municipio_id=1)) == [4, 5]
        assert _ids(self._buscar(cliente, jornada_id=2)) == [4]

    def test_filtra_por_entidad_federativa(self, cliente: TestClient) -> None:
        todas = _ids(self._buscar(cliente, entidad_id=22))
        ninguna = _ids(self._buscar(cliente, entidad_id=1))

        assert sorted(todas) == [1, 2, 3, 4, 5, 6]
        assert ninguna == []

    def test_salario_solo_cuenta_si_la_empresa_lo_publica(self, cliente: TestClient) -> None:
        # La vacante 4 paga hasta 9000 pero no lo muestra; las demás se comparan por su máximo.
        assert _ids(self._buscar(cliente, salario_min=15000)) == [1, 3, 6]
        assert _ids(self._buscar(cliente, salario_min=1)) == [1, 2, 3, 5, 6]

    def test_compatibilidad_minima(self, cliente: TestClient) -> None:
        assert _ids(self._buscar(cliente, compatibilidad_min=50)) == [1, 2]
        assert _ids(self._buscar(cliente, compatibilidad_min=0)) == [1, 2, 4, 3, 5, 6]

    def test_ajustes_se_combinan_con_y(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            VACANTES, params=[("ajuste_id", 1), ("ajuste_id", 3)], headers=_como(cliente, MARIANA)
        )

        assert _ids(respuesta) == [1, 2]
        solo_uno = cliente.get(
            VACANTES, params=[("ajuste_id", 12)], headers=_como(cliente, MARIANA)
        )
        assert _ids(solo_uno) == [1, 3, 6]

    def test_solo_las_que_cubren_mis_necesidades(self, cliente: TestClient) -> None:
        assert _ids(self._buscar(cliente, cubre_mis_necesidades="true")) == [1, 2]

    def test_sin_necesidades_todas_las_cubren(self, cliente: TestClient) -> None:
        assert len(_ids(self._buscar(cliente, JORGE, cubre_mis_necesidades="true"))) == 6

    def test_orden_recientes(self, cliente: TestClient, db: Session) -> None:
        db.execute(
            text("UPDATE vacante SET publicada_en = now() - id * interval '1 day' WHERE id < 7")
        )

        respuesta = self._buscar(cliente, orden="recientes")

        assert _ids(respuesta) == [1, 2, 3, 4, 5, 6]

    def test_filtros_invalidos_dan_422(self, cliente: TestClient) -> None:
        respuesta = self._buscar(cliente, compatibilidad_min=101, orden="azar", salario_min=-1)

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"compatibilidad_min", "orden", "salario_min"}

    def test_los_filtros_se_combinan(self, cliente: TestClient) -> None:
        assert _ids(
            self._buscar(cliente, modalidad_id=3, categoria_id=1, compatibilidad_min=50)
        ) == [1]


class TestCompatibilidadSeRecalcula:
    def test_quitar_las_habilidades_baja_el_puntaje(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        cliente.put(
            "/api/v1/candidatos/me/habilidades", headers=encabezado, json={"habilidades": []}
        )

        primera = cliente.get(f"{VACANTES}/recomendadas", headers=encabezado).json()["items"]
        # H = 0 con A, M y F en 1 → 100·(0.3 + 0.15 + 0.15) = 60.
        assert next(v for v in primera if v["id"] == 1)["compatibilidad"] == 60

    def test_revocar_el_consentimiento_quita_las_necesidades_del_calculo(
        self, cliente: TestClient
    ) -> None:
        encabezado = _como(cliente, MARIANA)
        antes = next(
            v
            for v in cliente.get(f"{VACANTES}/recomendadas", headers=encabezado).json()["items"]
            if v["id"] == 3
        )

        cliente.put(
            "/api/v1/candidatos/me/consentimiento", headers=encabezado, json={"otorgado": False}
        )

        despues = next(
            v
            for v in cliente.get(f"{VACANTES}/recomendadas", headers=encabezado).json()["items"]
            if v["id"] == 3
        )
        assert antes["compatibilidad"] == 26
        # Sin necesidades A vale 1: suma los 30 puntos que antes no tenía.
        assert despues["compatibilidad"] == 56
        assert despues["cubre_mis_necesidades"] is True

    def test_cambiar_la_modalidad_preferida_cambia_el_puntaje(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        perfil = cliente.get("/api/v1/candidatos/me", headers=encabezado).json()
        datos = {
            "nombre": perfil["usuario"]["nombre"],
            "apellidos": perfil["usuario"]["apellidos"],
            "telefono": perfil["usuario"]["telefono"],
            "municipio_id": 2,
            "jornada_id": 1,
            "resumen": perfil["resumen"],
            "disponible_reubicacion": False,
            "modalidad_ids": [1],
            "categoria_ids": [1],
            "compartir_ajustes": "preguntar",
        }

        cliente.put("/api/v1/candidatos/me", headers=encabezado, json=datos)

        v1 = next(
            v
            for v in cliente.get(f"{VACANTES}/recomendadas", headers=encabezado).json()["items"]
            if v["id"] == 1
        )
        # La vacante 1 es híbrida: M pasa de 1 a 0.5 → 88 − 7.5 = 80.5 → 81.
        assert v1["compatibilidad"] == 81


class TestDetalle:
    def test_el_candidato_ve_una_vacante_publicada(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{VACANTES}/1", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        v = respuesta.json()
        assert v["titulo"] == "Técnico de soporte de TI"
        assert v["tipo_contrato"]["id"] > 0
        assert v["nivel_educativo"] == {
            "id": 4,
            "nombre": "Técnico superior universitario",
            "orden": 4,
        }
        assert v["salario"] == {"min": 14000, "max": 18000}
        assert v["postulacion_id"] == 1
        assert v["postulados"] is None
        assert all(set(h) == {"id", "nombre", "obligatoria"} for h in v["habilidades"])
        assert all(
            set(a) == {"id", "nombre", "categoria", "descripcion", "tipo"} for a in v["ajustes"]
        )
        assert v["estado"] == "publicada"
        assert v["motivo_estado"] is None

    def test_el_salario_oculto_va_en_null_para_el_candidato_y_lleno_para_el_reclutador(
        self, cliente: TestClient
    ) -> None:
        candidata = cliente.get(f"{VACANTES}/4", headers=_como(cliente, MARIANA)).json()
        dueno = cliente.get(f"{VACANTES}/4", headers=_como(cliente, "talento@concentro.mx")).json()
        admin = cliente.get(f"{VACANTES}/4", headers=_como(cliente, ADMIN)).json()

        assert candidata["salario"] is None
        assert dueno["salario"] == {"min": 8000, "max": 9000}
        assert admin["salario"] == dueno["salario"]
        assert candidata["mostrar_salario"] is False

    def test_un_borrador_no_es_visible_para_el_candidato(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{VACANTES}/7", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 404
        assert respuesta.json()["codigo"] == "no_encontrado"

    def test_el_candidato_sigue_viendo_la_vacante_a_la_que_se_postulo(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE vacante SET estado = 'cerrada' WHERE id = 1"))

        assert cliente.get(f"{VACANTES}/1", headers=_como(cliente, MARIANA)).status_code == 200
        # Pero no una cerrada a la que no se postuló.
        assert cliente.get(f"{VACANTES}/1", headers=_como(cliente, JORGE)).status_code == 404

    def test_el_reclutador_ve_cualquier_estado_de_su_empresa_con_los_postulados(
        self, cliente: TestClient
    ) -> None:
        borrador = cliente.get(f"{VACANTES}/7", headers=_como(cliente, LAURA))
        publicada = cliente.get(f"{VACANTES}/1", headers=_como(cliente, LAURA))

        assert borrador.status_code == 200
        assert borrador.json()["estado"] == "borrador"
        assert publicada.json()["postulados"] == 1
        assert publicada.json()["postulacion_id"] is None

    def test_una_vacante_de_otra_empresa_responde_404_al_reclutador(
        self, cliente: TestClient
    ) -> None:
        assert cliente.get(f"{VACANTES}/2", headers=_como(cliente, LAURA)).status_code == 404

    def test_el_administrador_ve_todas(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, ADMIN)

        assert cliente.get(f"{VACANTES}/7", headers=encabezado).status_code == 200
        assert cliente.get(f"{VACANTES}/1", headers=encabezado).json()["postulados"] == 1

    def test_inexistente_o_enorme_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        assert cliente.get(f"{VACANTES}/9999", headers=encabezado).status_code == 404
        assert cliente.get(f"{VACANTES}/{10**30}", headers=encabezado).status_code == 404

    def test_sin_sesion_da_401(self, cliente: TestClient) -> None:
        assert cliente.get(f"{VACANTES}/1").status_code == 401


class TestDesglose:
    def test_mariana_con_la_vacante_1_coincide_con_el_ejemplo_del_contrato(
        self, cliente: TestClient
    ) -> None:
        respuesta = cliente.get(f"{VACANTES}/1/compatibilidad", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        d = respuesta.json()
        assert d["puntaje"] == 88
        assert d["componentes"] == {"h": 0.7, "a": 1.0, "m": 1.0, "f": 1.0}
        assert [h["id"] for h in d["habilidades"]["obligatorias_cumplidas"]] == [4, 5, 11]
        assert d["habilidades"]["obligatorias_faltantes"] == [{"id": 3, "nombre": "SQL"}]
        assert d["habilidades"]["deseables_cumplidas"] == [{"id": 6, "nombre": "Excel"}]
        assert d["habilidades"]["deseables_faltantes"] == [{"id": 2, "nombre": "JavaScript"}]
        assert d["necesidades"]["cubiertas"] == [
            {"id": 1, "nombre": "Acceso con rampa", "categoria": "movilidad", "tipo": "existente"},
            {"id": 3, "nombre": "Baño accesible", "categoria": "movilidad", "tipo": "existente"},
        ]
        assert d["necesidades"]["no_cubiertas"] == []
        assert d["modalidad"] == {"vacante": {"id": 3, "nombre": "Híbrido"}, "coincide": True}
        assert d["formacion"]["cumple"] == "si"
        assert d["formacion"]["requerida"]["orden"] == 4
        assert d["calculado_en"].endswith("Z")

    def test_las_necesidades_no_cubiertas_salen_en_su_lista(self, cliente: TestClient) -> None:
        d = cliente.get(f"{VACANTES}/3/compatibilidad", headers=_como(cliente, MARIANA)).json()

        assert d["puntaje"] == 26
        assert [n["id"] for n in d["necesidades"]["no_cubiertas"]] == [1, 3]
        assert d["necesidades"]["cubiertas"] == []

    def test_sin_consentimiento_no_hay_necesidades_en_el_desglose(
        self, cliente: TestClient
    ) -> None:
        d = cliente.get(f"{VACANTES}/1/compatibilidad", headers=_como(cliente, JORGE)).json()

        assert d["necesidades"] == {"cubiertas": [], "no_cubiertas": []}
        assert d["componentes"]["a"] == 1.0
        assert d["puntaje"] == 57

    def test_un_borrador_no_tiene_desglose(self, cliente: TestClient) -> None:
        assert (
            cliente.get(f"{VACANTES}/7/compatibilidad", headers=_como(cliente, MARIANA)).status_code
            == 404
        )

    def test_solo_el_candidato(self, cliente: TestClient) -> None:
        assert (
            cliente.get(f"{VACANTES}/1/compatibilidad", headers=_como(cliente, LAURA)).status_code
            == 403
        )

    def test_una_vacante_que_ya_no_ve_tampoco_tiene_desglose(
        self, cliente: TestClient, db: Session
    ) -> None:
        """Misma visibilidad que el detalle: el desglose trae los requisitos de la vacante."""
        db.execute(text("UPDATE vacante SET estado = 'suspendida' WHERE id IN (1, 3)"))
        mariana = _como(cliente, MARIANA)

        # A la 3 no se postuló: ya no la ve. A la 1 sí: la sigue viendo, como en el detalle.
        assert cliente.get(f"{VACANTES}/3/compatibilidad", headers=mariana).status_code == 404
        assert cliente.get(f"{VACANTES}/3", headers=mariana).status_code == 404
        assert cliente.get(f"{VACANTES}/1/compatibilidad", headers=mariana).status_code == 200

    def test_se_guarda_en_la_tabla(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("DELETE FROM compatibilidad WHERE candidato_id = 3 AND vacante_id = 1"))

        cliente.get(f"{VACANTES}/1/compatibilidad", headers=_como(cliente, MARIANA))

        fila = db.execute(
            text(
                "SELECT puntaje_candidato, puntaje_reclutador FROM compatibilidad "
                "WHERE candidato_id = 3 AND vacante_id = 1"
            )
        ).one()
        assert tuple(fila) == (88, 83)


class TestCrear:
    def test_publica_una_vacante_completa(self, cliente: TestClient, db: Session) -> None:
        respuesta = cliente.post(VACANTES, headers=_como(cliente, LAURA), json=ENTRADA)

        assert respuesta.status_code == 201
        cuerpo = respuesta.json()
        assert set(cuerpo) == {"vacante", "postulados_notificados"}
        assert cuerpo["postulados_notificados"] == 0
        v = cuerpo["vacante"]
        assert v["estado"] == "publicada"
        assert v["publicada_en"].endswith("Z")
        assert v["postulados"] == 0
        assert v["salario"] == {"min": 12000, "max": 15000}
        assert {h["id"]: h["obligatoria"] for h in v["habilidades"]} == {5: True, 6: False}
        assert {a["id"]: a["tipo"] for a in v["ajustes"]} == {1: "existente", 12: "bajo_solicitud"}
        # Al publicar se calcula la compatibilidad con los candidatos.
        calculados = db.scalar(
            text("SELECT count(*) FROM compatibilidad WHERE vacante_id = :v"), {"v": v["id"]}
        )
        assert calculados == 2

    def test_la_vacante_nueva_aparece_en_la_busqueda_del_candidato(
        self, cliente: TestClient
    ) -> None:
        nueva = cliente.post(VACANTES, headers=_como(cliente, LAURA), json=ENTRADA).json()[
            "vacante"
        ]

        items = cliente.get(
            VACANTES, params={"q": "redes"}, headers=_como(cliente, MARIANA)
        ).json()["items"]

        propia = next(v for v in items if v["id"] == nueva["id"])
        assert propia["titulo"] == "Técnico de redes"
        assert propia["compatibilidad"] is not None

    def test_guarda_un_borrador_con_menos_exigencias(self, cliente: TestClient) -> None:
        datos = {
            **ENTRADA,
            "estado": "borrador",
            "habilidades": [],
            "ajustes": [],
            "direccion": None,
        }

        respuesta = cliente.post(VACANTES, headers=_como(cliente, LAURA), json=datos)

        assert respuesta.status_code == 201
        v = respuesta.json()["vacante"]
        assert v["estado"] == "borrador"
        assert v["publicada_en"] is None

    def test_un_borrador_no_calcula_compatibilidad(self, cliente: TestClient, db: Session) -> None:
        v = cliente.post(
            VACANTES, headers=_como(cliente, LAURA), json={**ENTRADA, "estado": "borrador"}
        ).json()["vacante"]

        assert (
            db.scalar(
                text("SELECT count(*) FROM compatibilidad WHERE vacante_id = :v"), {"v": v["id"]}
            )
            == 0
        )

    def test_una_empresa_pendiente_solo_crea_borradores(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, DANIEL)

        borrador = cliente.post(
            VACANTES, headers=encabezado, json={**ENTRADA, "estado": "borrador"}
        )
        publicar = cliente.post(VACANTES, headers=encabezado, json=ENTRADA)

        assert borrador.status_code == 201
        assert publicar.status_code == 403
        assert publicar.json()["codigo"] == "empresa_no_validada"

    def test_publicar_incompleta_da_vacante_incompleta_con_los_campos(
        self, cliente: TestClient
    ) -> None:
        datos = {
            **ENTRADA,
            "habilidades": [{"habilidad_id": 6, "obligatoria": False}],
            "direccion": " ",
            "ajustes": [],
            "sin_condiciones_accesibilidad": False,
        }

        respuesta = cliente.post(VACANTES, headers=_como(cliente, LAURA), json=datos)

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "vacante_incompleta"
        assert set(respuesta.json()["campos"]) == {"habilidades", "direccion", "ajustes"}

    def test_una_vacante_remota_no_necesita_direccion(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            VACANTES,
            headers=_como(cliente, LAURA),
            json={**ENTRADA, "modalidad_id": 2, "direccion": None},
        )

        assert respuesta.status_code == 201

    def test_sin_condiciones_de_accesibilidad_basta_para_publicar(
        self, cliente: TestClient
    ) -> None:
        datos = {**ENTRADA, "ajustes": [], "sin_condiciones_accesibilidad": True}

        assert cliente.post(VACANTES, headers=_como(cliente, LAURA), json=datos).status_code == 201

    def test_sin_condiciones_y_con_ajustes_a_la_vez_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            VACANTES,
            headers=_como(cliente, LAURA),
            json={**ENTRADA, "sin_condiciones_accesibilidad": True},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "validacion"
        assert "ajustes" in respuesta.json()["campos"]

    def test_valida_los_formatos(self, cliente: TestClient) -> None:
        datos = {
            "titulo": " ",
            "categoria_id": 999,
            "descripcion": "",
            "jornada_id": 999,
            "tipo_contrato_id": 999,
            "plazas": 0,
            "modalidad_id": 999,
            "municipio_id": 999,
            "salario_min": 5000,
            "salario_max": 1000,
            "nivel_educativo_id": 999,
            "experiencia_anios": 51,
            "habilidades": [
                {"habilidad_id": 5, "obligatoria": True},
                {"habilidad_id": 5, "obligatoria": False},
            ],
            "ajustes": [{"ajuste_id": 999, "tipo": "existente"}],
            "notas_accesibilidad": "x" * 501,
            "estado": "cerrada",
        }

        respuesta = cliente.post(VACANTES, headers=_como(cliente, LAURA), json=datos)

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "validacion"
        assert set(respuesta.json()["campos"]) == {
            "titulo",
            "categoria_id",
            "descripcion",
            "jornada_id",
            "tipo_contrato_id",
            "plazas",
            "modalidad_id",
            "municipio_id",
            "salario_max",
            "mostrar_salario",
            "nivel_educativo_id",
            "experiencia_anios",
            "habilidades",
            "ajustes",
            "sin_condiciones_accesibilidad",
            "notas_accesibilidad",
            "estado",
        }
        assert respuesta.json()["campos"]["salario_max"] == (
            "El salario máximo no puede ser menor que el mínimo."
        )

    def test_numeros_fuera_de_rango_dan_422_no_500(self, cliente: TestClient) -> None:
        respuesta = cliente.post(
            VACANTES,
            headers=_como(cliente, LAURA),
            json={**ENTRADA, "plazas": 10**9, "salario_max": 10**12, "categoria_id": 10**30},
        )

        assert respuesta.status_code == 422
        assert {"plazas", "salario_max", "categoria_id"} <= set(respuesta.json()["campos"])

    def test_solo_el_reclutador_crea(self, cliente: TestClient) -> None:
        assert (
            cliente.post(VACANTES, headers=_como(cliente, MARIANA), json=ENTRADA).status_code == 403
        )
        assert cliente.post(VACANTES, json=ENTRADA).status_code == 401


class TestEditar:
    def test_cambiar_los_requisitos_avisa_a_los_postulados_y_recalcula(
        self, cliente: TestClient, db: Session
    ) -> None:
        encabezado = _como(cliente, LAURA)
        v1 = cliente.get(f"{VACANTES}/1", headers=encabezado).json()
        datos = {
            "titulo": v1["titulo"],
            "categoria_id": v1["categoria"]["id"],
            "descripcion": v1["descripcion"],
            "jornada_id": v1["jornada"]["id"],
            "tipo_contrato_id": v1["tipo_contrato"]["id"],
            "plazas": v1["plazas"],
            "modalidad_id": 2,
            "municipio_id": v1["municipio"]["id"],
            "direccion": v1["direccion"],
            "salario_min": v1["salario"]["min"],
            "salario_max": v1["salario"]["max"],
            "mostrar_salario": v1["mostrar_salario"],
            "nivel_educativo_id": v1["nivel_educativo"]["id"],
            "experiencia_anios": v1["experiencia_anios"],
            "habilidades": [
                {"habilidad_id": h["id"], "obligatoria": h["obligatoria"]}
                for h in v1["habilidades"]
            ],
            "ajustes": [{"ajuste_id": a["id"], "tipo": a["tipo"]} for a in v1["ajustes"]],
            "sin_condiciones_accesibilidad": v1["sin_condiciones_accesibilidad"],
            "notas_accesibilidad": v1["notas_accesibilidad"],
            "estado": "publicada",
        }

        respuesta = cliente.put(f"{VACANTES}/1", headers=encabezado, json=datos)

        assert respuesta.status_code == 200
        assert respuesta.json()["postulados_notificados"] == 1
        assert respuesta.json()["vacante"]["modalidad"]["id"] == 2
        # Se avisa a Mariana, sin datos sensibles, y la notificación lleva a su postulación.
        aviso = db.execute(
            text(
                "SELECT tipo, mensaje, referencia_tipo, referencia_id FROM notificacion "
                "WHERE usuario_id = 3 AND tipo = 'vacante_actualizada'"
            )
        ).one()
        assert aviso[0] == "vacante_actualizada"
        assert aviso[2:] == ("postulacion", 1)
        assert "Técnico de soporte de TI" in aviso[1]
        # La compatibilidad se recalculó: ahora es remota y Mariana la prefiere (M = 1).
        puntaje = db.scalar(
            text(
                "SELECT puntaje_candidato FROM compatibilidad "
                "WHERE candidato_id = 3 AND vacante_id = 1"
            )
        )
        assert puntaje == 88

    def test_editar_solo_el_titulo_no_avisa(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, LAURA)
        v = cliente.get(f"{VACANTES}/6", headers=encabezado).json()
        datos = _entrada_de(v)

        respuesta = cliente.put(
            f"{VACANTES}/6", headers=encabezado, json={**datos, "titulo": "Otro título"}
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["postulados_notificados"] == 0
        assert respuesta.json()["vacante"]["titulo"] == "Otro título"
        assert (
            db.scalar(text("SELECT count(*) FROM notificacion WHERE tipo = 'vacante_actualizada'"))
            == 0
        )

    def test_un_borrador_se_puede_publicar_al_editarlo(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        v7 = cliente.get(f"{VACANTES}/7", headers=encabezado).json()
        datos = {
            **_entrada_de(v7),
            **{k: ENTRADA[k] for k in ("habilidades", "ajustes", "direccion")},
        }

        respuesta = cliente.put(
            f"{VACANTES}/7", headers=encabezado, json={**datos, "estado": "publicada"}
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["vacante"]["estado"] == "publicada"
        assert respuesta.json()["vacante"]["publicada_en"] is not None

    def test_una_vacante_publicada_no_vuelve_a_borrador_ni_se_pausa_al_editar(
        self, cliente: TestClient
    ) -> None:
        encabezado = _como(cliente, LAURA)
        datos = _entrada_de(cliente.get(f"{VACANTES}/6", headers=encabezado).json())

        respuesta = cliente.put(
            f"{VACANTES}/6", headers=encabezado, json={**datos, "estado": "borrador"}
        )

        assert respuesta.json()["vacante"]["estado"] == "publicada"

    def test_una_publicada_debe_seguir_siendo_publicable(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        datos = _entrada_de(cliente.get(f"{VACANTES}/6", headers=encabezado).json())

        respuesta = cliente.put(
            f"{VACANTES}/6",
            headers=encabezado,
            json={**datos, "habilidades": [], "estado": "borrador"},
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "vacante_incompleta"

    def test_cerrada_o_suspendida_no_se_edita(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, LAURA)
        datos = _entrada_de(cliente.get(f"{VACANTES}/6", headers=encabezado).json())
        db.execute(text("UPDATE vacante SET estado = 'cerrada' WHERE id = 6"))
        cerrada = cliente.put(f"{VACANTES}/6", headers=encabezado, json=datos)
        db.execute(text("UPDATE vacante SET estado = 'suspendida' WHERE id = 6"))
        suspendida = cliente.put(f"{VACANTES}/6", headers=encabezado, json=datos)

        assert cerrada.status_code == suspendida.status_code == 409
        assert cerrada.json()["codigo"] == suspendida.json()["codigo"] == "estado_invalido"
        assert "cerrada" in cerrada.json()["detail"]
        assert "suspendida" in suspendida.json()["detail"]

    def test_la_vacante_de_otra_empresa_da_404(self, cliente: TestClient) -> None:
        assert (
            cliente.put(f"{VACANTES}/2", headers=_como(cliente, LAURA), json=ENTRADA).status_code
            == 404
        )

    def test_valida_formatos(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            f"{VACANTES}/6", headers=_como(cliente, LAURA), json={**ENTRADA, "titulo": ""}
        )

        assert respuesta.status_code == 422
        assert "titulo" in respuesta.json()["campos"]


def _entrada_de(v: dict) -> dict:
    """Convierte un VacanteDetalle en el cuerpo que lo vuelve a guardar igual."""
    return {
        "titulo": v["titulo"],
        "categoria_id": v["categoria"]["id"],
        "descripcion": v["descripcion"],
        "jornada_id": v["jornada"]["id"],
        "tipo_contrato_id": v["tipo_contrato"]["id"],
        "plazas": v["plazas"],
        "modalidad_id": v["modalidad"]["id"],
        "municipio_id": v["municipio"]["id"],
        "direccion": v["direccion"],
        "salario_min": v["salario"]["min"] if v["salario"] else None,
        "salario_max": v["salario"]["max"] if v["salario"] else None,
        "mostrar_salario": v["mostrar_salario"],
        "nivel_educativo_id": v["nivel_educativo"]["id"] if v["nivel_educativo"] else None,
        "experiencia_anios": v["experiencia_anios"],
        "habilidades": [
            {"habilidad_id": h["id"], "obligatoria": h["obligatoria"]} for h in v["habilidades"]
        ],
        "ajustes": [{"ajuste_id": a["id"], "tipo": a["tipo"]} for a in v["ajustes"]],
        "sin_condiciones_accesibilidad": v["sin_condiciones_accesibilidad"],
        "notas_accesibilidad": v["notas_accesibilidad"],
        "estado": "publicada" if v["estado"] != "borrador" else "borrador",
    }


class TestEstado:
    def _estado(self, cliente: TestClient, id_: int, estado: str, correo: str = LAURA):
        return cliente.patch(
            f"{VACANTES}/{id_}/estado", headers=_como(cliente, correo), json={"estado": estado}
        )

    def test_pausar_reanudar_y_cerrar(self, cliente: TestClient) -> None:
        pausada = self._estado(cliente, 6, "pausada")
        reanudada = self._estado(cliente, 6, "publicada")
        pausada_otra_vez = self._estado(cliente, 6, "pausada")
        cerrada = self._estado(cliente, 6, "cerrada")

        assert [r.status_code for r in (pausada, reanudada, pausada_otra_vez, cerrada)] == [200] * 4
        assert pausada.json()["estado"] == "pausada"
        assert cerrada.json()["estado"] == "cerrada"
        assert cerrada.json()["postulados"] == 0

    def test_una_pausada_deja_de_verse_para_el_candidato(self, cliente: TestClient) -> None:
        self._estado(cliente, 6, "pausada")

        items = cliente.get(VACANTES, headers=_como(cliente, MARIANA)).json()["items"]

        assert 6 not in [v["id"] for v in items]

    def test_publicar_un_borrador_completo(self, cliente: TestClient, db: Session) -> None:
        creada = cliente.post(
            VACANTES, headers=_como(cliente, LAURA), json={**ENTRADA, "estado": "borrador"}
        ).json()["vacante"]

        respuesta = self._estado(cliente, creada["id"], "publicada")

        assert respuesta.status_code == 200
        assert respuesta.json()["estado"] == "publicada"
        assert respuesta.json()["publicada_en"] is not None
        assert (
            db.scalar(
                text("SELECT count(*) FROM compatibilidad WHERE vacante_id = :v"),
                {"v": creada["id"]},
            )
            == 2
        )

    def test_publicar_un_borrador_incompleto_da_422(self, cliente: TestClient) -> None:
        # S002: el borrador 7 no tiene habilidades ni ajustes.
        respuesta = self._estado(cliente, 7, "publicada")

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "vacante_incompleta"
        assert "ajustes" in respuesta.json()["campos"]

    def test_una_empresa_no_validada_no_publica(self, cliente: TestClient) -> None:
        creada = cliente.post(
            VACANTES, headers=_como(cliente, DANIEL), json={**ENTRADA, "estado": "borrador"}
        ).json()["vacante"]

        respuesta = self._estado(cliente, creada["id"], "publicada", DANIEL)

        assert respuesta.status_code == 403
        assert respuesta.json()["codigo"] == "empresa_no_validada"

    def test_transiciones_que_no_existen_dan_409(self, cliente: TestClient, db: Session) -> None:
        # borrador → pausada, publicada → publicada, cerrada → publicada.
        assert self._estado(cliente, 7, "pausada").json()["codigo"] == "transicion_invalida"
        assert self._estado(cliente, 6, "publicada").status_code == 409
        self._estado(cliente, 6, "cerrada")
        reabrir = self._estado(cliente, 6, "publicada")
        assert reabrir.status_code == 409
        assert reabrir.json()["detail"] == "No se puede pasar una vacante de cerrada a publicada."
        db.execute(text("UPDATE vacante SET estado = 'suspendida' WHERE id = 1"))
        assert self._estado(cliente, 1, "publicada").status_code == 409

    def test_un_estado_desconocido_da_422(self, cliente: TestClient) -> None:
        respuesta = self._estado(cliente, 6, "suspendida")

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "estado": "El estado puede ser publicada, pausada o cerrada."
        }

    def test_la_vacante_de_otra_empresa_da_404(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 2, "pausada").status_code == 404

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        assert self._estado(cliente, 1, "pausada", MARIANA).status_code == 403


class TestDuplicar:
    def test_copia_datos_habilidades_y_ajustes_como_borrador(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        original = cliente.get(f"{VACANTES}/1", headers=encabezado).json()

        respuesta = cliente.post(f"{VACANTES}/1/duplicar", headers=encabezado)

        assert respuesta.status_code == 201
        copia = respuesta.json()
        assert copia["id"] != 1
        assert copia["titulo"] == "Técnico de soporte de TI (copia)"
        assert copia["estado"] == "borrador"
        assert copia["publicada_en"] is None
        assert copia["postulados"] == 0
        assert copia["habilidades"] == original["habilidades"]
        assert copia["ajustes"] == original["ajustes"]
        assert copia["salario"] == original["salario"]
        assert copia["modalidad"] == original["modalidad"]
        # La original no cambia.
        assert cliente.get(f"{VACANTES}/1", headers=encabezado).json()["estado"] == "publicada"

    def test_recorta_el_titulo_para_que_quepa_el_sufijo(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        largo = _entrada_de(cliente.get(f"{VACANTES}/6", headers=encabezado).json())
        creada = cliente.put(
            f"{VACANTES}/6", headers=encabezado, json={**largo, "titulo": "x" * 120}
        ).json()

        copia = cliente.post(f"{VACANTES}/6/duplicar", headers=encabezado).json()

        assert len(copia["titulo"]) == 120
        assert copia["titulo"].endswith(" (copia)")
        assert creada["vacante"]["titulo"] == "x" * 120

    def test_la_vacante_de_otra_empresa_da_404(self, cliente: TestClient) -> None:
        assert (
            cliente.post(f"{VACANTES}/2/duplicar", headers=_como(cliente, LAURA)).status_code == 404
        )


class TestMisVacantes:
    def test_lista_las_de_mi_empresa_con_contadores(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{EMPRESAS}/me/vacantes", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert cuerpo["total"] == 3
        assert sorted(v["id"] for v in cuerpo["items"]) == [1, 6, 7]
        assert set(cuerpo["items"][0]) == {
            "id",
            "titulo",
            "estado",
            "modalidad",
            "postulados",
            "nuevas",
            "publicada_en",
            "actualizado_en",
        }
        v1 = next(v for v in cuerpo["items"] if v["id"] == 1)
        # Mariana está en «entrevista»: cuenta como postulada pero no como nueva.
        assert (v1["postulados"], v1["nuevas"]) == (1, 0)

    def test_las_retiradas_no_cuentan_y_las_nuevas_si(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE postulacion SET estado = 'postulada' WHERE id = 1"))
        encabezado = _como(cliente, LAURA)
        antes = next(
            v
            for v in cliente.get(f"{EMPRESAS}/me/vacantes", headers=encabezado).json()["items"]
            if v["id"] == 1
        )
        db.execute(text("UPDATE postulacion SET estado = 'retirada' WHERE id = 1"))
        despues = next(
            v
            for v in cliente.get(f"{EMPRESAS}/me/vacantes", headers=encabezado).json()["items"]
            if v["id"] == 1
        )

        assert (antes["postulados"], antes["nuevas"]) == (1, 1)
        assert (despues["postulados"], despues["nuevas"]) == (0, 0)

    def test_filtra_por_estado(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            f"{EMPRESAS}/me/vacantes", params={"estado": "borrador"}, headers=_como(cliente, LAURA)
        )

        assert [v["id"] for v in respuesta.json()["items"]] == [7]

    def test_un_estado_desconocido_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            f"{EMPRESAS}/me/vacantes",
            params={"estado": "cualquiera"},
            headers=_como(cliente, LAURA),
        )

        assert respuesta.status_code == 422
        assert "estado" in respuesta.json()["campos"]

    def test_las_mas_recientes_primero(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE vacante SET publicada_en = now() + interval '1 day' WHERE id = 6"))

        items = cliente.get(f"{EMPRESAS}/me/vacantes", headers=_como(cliente, LAURA)).json()[
            "items"
        ]

        assert items[0]["id"] == 6

    def test_solo_el_reclutador(self, cliente: TestClient) -> None:
        assert (
            cliente.get(f"{EMPRESAS}/me/vacantes", headers=_como(cliente, MARIANA)).status_code
            == 403
        )
        assert cliente.get(f"{EMPRESAS}/me/vacantes").status_code == 401


class TestFichaDeEmpresa:
    def test_el_candidato_ve_la_empresa_y_sus_vacantes_con_compatibilidad(
        self, cliente: TestClient
    ) -> None:
        respuesta = cliente.get(f"{EMPRESAS}/1", headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        ficha = respuesta.json()
        assert list(ficha) == [
            "id",
            "nombre_comercial",
            "logo_url",
            "sector",
            "tamano_empresa",
            "municipio",
            "descripcion",
            "sitio_web",
            "practicas_inclusion",
            "vacantes",
        ]
        assert ficha["nombre_comercial"] == "TecnoQro"
        assert "rfc" not in ficha and "razon_social" not in ficha and "documento_url" not in ficha
        # Solo las publicadas: la 7 es borrador.
        assert sorted(v["id"] for v in ficha["vacantes"]) == [1, 6]
        v1 = next(v for v in ficha["vacantes"] if v["id"] == 1)
        assert v1["compatibilidad"] == 88
        assert v1["postulacion_id"] == 1

    def test_el_reclutador_ve_la_ficha_sin_compatibilidad(self, cliente: TestClient) -> None:
        ficha = cliente.get(f"{EMPRESAS}/2", headers=_como(cliente, LAURA)).json()

        assert ficha["vacantes"]
        assert all(v["compatibilidad"] is None for v in ficha["vacantes"])
        assert all(v["postulacion_id"] is None for v in ficha["vacantes"])
        assert all(v["cubre_mis_necesidades"] is False for v in ficha["vacantes"])

    def test_una_empresa_no_validada_o_inexistente_da_404(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        pendiente = cliente.get(f"{EMPRESAS}/4", headers=encabezado)

        assert pendiente.status_code == 404
        assert pendiente.json()["codigo"] == "no_encontrado"
        assert cliente.get(f"{EMPRESAS}/9999", headers=encabezado).status_code == 404
        assert cliente.get(f"{EMPRESAS}/{10**30}", headers=encabezado).status_code == 404

    def test_requiere_sesion(self, cliente: TestClient) -> None:
        assert cliente.get(f"{EMPRESAS}/1").status_code == 401

    def test_me_sigue_siendo_mi_organizacion_y_no_una_ficha(self, cliente: TestClient) -> None:
        respuesta = cliente.get(f"{EMPRESAS}/me", headers=_como(cliente, LAURA))

        assert respuesta.status_code == 200
        assert "razon_social" in respuesta.json()
