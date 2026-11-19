import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import iniciar_sesion

BASE = "/api/v1/admin"
CATEGORIAS = f"{BASE}/categorias"
HABILIDADES = f"{BASE}/habilidades"
CATALOGOS = f"{BASE}/catalogos"
ADMIN = "admin@inclutec.mx"


@pytest.fixture
def admin(cliente: TestClient) -> dict[str, str]:
    return iniciar_sesion(cliente, ADMIN)


class TestCategorias:
    def test_lista_todas_con_sus_conteos(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        db.execute(text("UPDATE categoria SET activo = false WHERE id = 5"))

        respuesta = cliente.get(CATEGORIAS, headers=admin)

        assert respuesta.status_code == 200
        items = respuesta.json()
        assert len(items) == 5
        assert list(items[0]) == [
            "id",
            "nombre",
            "descripcion",
            "activo",
            "habilidades",
            "vacantes",
        ]
        assert [c["nombre"] for c in items] == sorted((c["nombre"] for c in items), key=str.lower)
        ti = next(c for c in items if c["id"] == 1)
        assert ti["habilidades"] == 5
        assert ti["vacantes"] == db.scalar(
            text("SELECT count(*) FROM vacante WHERE categoria_id = 1")
        )
        assert next(c for c in items if c["id"] == 5)["activo"] is False

    def test_busca_por_nombre(self, cliente: TestClient, admin: dict) -> None:
        items = cliente.get(CATEGORIAS, params={"q": "DISEÑO"}, headers=admin).json()

        assert [c["id"] for c in items] == [4]

    def test_crear_editar_desactivar_y_eliminar(self, cliente: TestClient, admin: dict) -> None:
        creada = cliente.post(
            CATEGORIAS, headers=admin, json={"nombre": "  Salud  ", "descripcion": ""}
        )
        assert creada.status_code == 201
        c = creada.json()
        assert c | {"id": 0} == {
            "id": 0,
            "nombre": "Salud",
            "descripcion": None,
            "activo": True,
            "habilidades": 0,
            "vacantes": 0,
        }

        editada = cliente.put(
            f"{CATEGORIAS}/{c['id']}",
            headers=admin,
            json={"nombre": "Salud y bienestar", "descripcion": "Clínicas y hospitales"},
        ).json()
        assert (editada["nombre"], editada["descripcion"]) == (
            "Salud y bienestar",
            "Clínicas y hospitales",
        )

        apagada = cliente.patch(f"{CATEGORIAS}/{c['id']}", headers=admin, json={"activo": False})
        assert apagada.json()["activo"] is False

        assert cliente.delete(f"{CATEGORIAS}/{c['id']}", headers=admin).status_code == 204
        assert cliente.put(
            f"{CATEGORIAS}/{c['id']}", headers=admin, json={"nombre": "x"}
        ).json() == {"detail": "La categoría no existe.", "codigo": "no_encontrado", "campos": None}

    def test_nombre_duplicado_sin_importar_mayusculas(
        self, cliente: TestClient, admin: dict
    ) -> None:
        respuesta = cliente.post(CATEGORIAS, headers=admin, json={"nombre": "administración"})

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "nombre_duplicado"
        assert respuesta.json()["detail"] == "Ya existe una categoría con ese nombre."
        # Conservar su propio nombre al editar no es duplicado.
        assert (
            cliente.put(f"{CATEGORIAS}/2", headers=admin, json={"nombre": "ADMINISTRACIÓN"}).json()[
                "nombre"
            ]
            == "ADMINISTRACIÓN"
        )

    def test_valida_los_campos(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.post(
            CATEGORIAS, headers=admin, json={"nombre": " ", "descripcion": "x" * 256}
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "nombre": "Escribe el nombre.",
            "descripcion": "Debe tener máximo 255 caracteres.",
        }
        assert cliente.post(CATEGORIAS, headers=admin, json={"nombre": "x" * 81}).json()[
            "campos"
        ] == {"nombre": "Debe tener máximo 80 caracteres."}

    def test_en_uso_no_se_elimina(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.delete(f"{CATEGORIAS}/1", headers=admin)

        assert respuesta.status_code == 409
        assert respuesta.json() == {
            "detail": "La categoría está en uso; solo se puede desactivar.",
            "codigo": "en_uso",
            "campos": None,
        }

    def test_activacion_invalida(self, cliente: TestClient, admin: dict) -> None:
        assert cliente.patch(f"{CATEGORIAS}/1", headers=admin, json={}).status_code == 422
        assert (
            cliente.patch(f"{CATEGORIAS}/1", headers=admin, json={"activo": "quizá"}).status_code
            == 422
        )

    def test_desactivada_deja_de_ofrecerse(self, cliente: TestClient, admin: dict) -> None:
        cliente.patch(f"{CATEGORIAS}/5", headers=admin, json={"activo": False})

        publicas = cliente.get("/api/v1/catalogos/categorias").json()

        assert 5 not in [c["id"] for c in publicas]

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        laura = iniciar_sesion(cliente, "rh@tecnoqro.mx")

        assert cliente.get(CATEGORIAS, headers=laura).status_code == 403
        assert cliente.delete(f"{CATEGORIAS}/1", headers=laura).status_code == 403


class TestHabilidades:
    def test_lista_paginada_con_conteos(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        cuerpo = cliente.get(HABILIDADES, headers=admin).json()

        assert (cuerpo["total"], cuerpo["page"], cuerpo["size"]) == (15, 1, 25)
        assert list(cuerpo["items"][0]) == [
            "id",
            "nombre",
            "categoria",
            "activo",
            "candidatos",
            "vacantes",
        ]
        python = next(h for h in cuerpo["items"] if h["nombre"] == "Python")
        assert python["categoria"] == {"id": 1, "nombre": "Tecnologías de la información"}
        assert python["candidatos"] == db.scalar(
            text("SELECT count(*) FROM candidato_habilidad WHERE habilidad_id = 1")
        )
        assert python["vacantes"] == db.scalar(
            text("SELECT count(*) FROM vacante_habilidad WHERE habilidad_id = 1")
        )

    def test_filtra_y_pagina(self, cliente: TestClient, admin: dict) -> None:
        def nombres(**params):
            return [
                h["nombre"]
                for h in cliente.get(HABILIDADES, params=params, headers=admin).json()["items"]
            ]

        assert nombres(categoria_id=4) == ["Diseño gráfico", "Redacción"]
        assert nombres(q="manejo") == ["Manejo de CRM", "Manejo de ERP"]
        assert len(nombres(size=4, page=4)) == 3

    def test_crear_editar_y_eliminar(self, cliente: TestClient, admin: dict) -> None:
        creada = cliente.post(
            HABILIDADES, headers=admin, json={"nombre": "Figma", "categoria_id": 4}
        )
        assert creada.status_code == 201
        h = creada.json()
        assert h["categoria"] == {"id": 4, "nombre": "Diseño y comunicación"}
        assert (h["activo"], h["candidatos"], h["vacantes"]) == (True, 0, 0)

        movida = cliente.put(
            f"{HABILIDADES}/{h['id']}", headers=admin, json={"nombre": "Figma", "categoria_id": 1}
        ).json()
        assert movida["categoria"]["id"] == 1
        assert (
            cliente.patch(f"{HABILIDADES}/{h['id']}", headers=admin, json={"activo": False}).json()[
                "activo"
            ]
            is False
        )
        assert cliente.delete(f"{HABILIDADES}/{h['id']}", headers=admin).status_code == 204

    def test_valida_y_rechaza_duplicados(self, cliente: TestClient, admin: dict) -> None:
        invalida = cliente.post(HABILIDADES, headers=admin, json={"nombre": "", "categoria_id": 99})
        assert invalida.json()["campos"] == {
            "nombre": "Escribe el nombre.",
            "categoria_id": "Elige una categoría de la lista.",
        }
        repetida = cliente.post(
            HABILIDADES, headers=admin, json={"nombre": "sql", "categoria_id": 2}
        )
        assert (repetida.status_code, repetida.json()["detail"]) == (
            409,
            "Ya existe una habilidad con ese nombre.",
        )

    def test_en_uso_no_se_elimina(self, cliente: TestClient, admin: dict, db: Session) -> None:
        usada = db.scalar(text("SELECT habilidad_id FROM candidato_habilidad LIMIT 1"))

        respuesta = cliente.delete(f"{HABILIDADES}/{usada}", headers=admin)

        assert respuesta.status_code == 409
        assert respuesta.json()["detail"] == "La habilidad está en uso; solo se puede desactivar."

    def test_inexistente_da_404(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.patch(f"{HABILIDADES}/99999", headers=admin, json={"activo": True})

        assert respuesta.status_code == 404
        assert respuesta.json()["detail"] == "La habilidad no existe."


class TestCatalogos:
    def test_tipo_inexistente_da_404(self, cliente: TestClient, admin: dict) -> None:
        for tipo in ("entidades", "municipios", "x"):
            respuesta = cliente.get(f"{CATALOGOS}/{tipo}", headers=admin)
            assert respuesta.status_code == 404
            assert respuesta.json()["detail"] == "El tipo de catálogo no existe."

    @pytest.mark.parametrize(
        ("tipo", "total", "campos"),
        [
            ("modalidades", 3, ["id", "nombre", "activo", "en_uso"]),
            ("jornadas", 4, ["id", "nombre", "activo", "en_uso"]),
            ("tipos-contrato", 4, ["id", "nombre", "activo", "en_uso"]),
            ("niveles-educativos", 6, ["id", "nombre", "activo", "en_uso", "orden"]),
            ("sectores", 7, ["id", "nombre", "activo", "en_uso"]),
            ("tamanos-empresa", 4, ["id", "nombre", "activo", "en_uso", "rango"]),
            ("ajustes", 13, ["id", "nombre", "activo", "en_uso", "descripcion", "categoria"]),
            ("motivos-reporte", 6, ["id", "nombre", "activo", "en_uso", "aplica_a"]),
        ],
    )
    def test_lista_cada_tipo_con_sus_campos(
        self, cliente: TestClient, admin: dict, tipo: str, total: int, campos: list[str]
    ) -> None:
        items = cliente.get(f"{CATALOGOS}/{tipo}", headers=admin).json()

        assert len(items) == total
        assert all(sorted(i) == sorted(campos) for i in items)

    def test_niveles_por_orden_y_conteo_en_uso(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        niveles = cliente.get(f"{CATALOGOS}/niveles-educativos", headers=admin).json()
        assert [n["orden"] for n in niveles] == [1, 2, 3, 4, 5, 6]

        modalidades = {
            m["id"]: m["en_uso"]
            for m in cliente.get(f"{CATALOGOS}/modalidades", headers=admin).json()
        }
        assert modalidades[2] == db.scalar(
            text(
                "SELECT (SELECT count(*) FROM vacante WHERE modalidad_id = 2)"
                " + (SELECT count(*) FROM candidato_modalidad WHERE modalidad_id = 2)"
            )
        )

    def test_crear_editar_desactivar_y_eliminar(self, cliente: TestClient, admin: dict) -> None:
        creado = cliente.post(
            f"{CATALOGOS}/tamanos-empresa",
            headers=admin,
            json={"nombre": "Unipersonal", "rango": "1 trabajador"},
        )
        assert creado.status_code == 201
        e = creado.json()
        assert e | {"id": 0} == {
            "id": 0,
            "nombre": "Unipersonal",
            "activo": True,
            "en_uso": 0,
            "rango": "1 trabajador",
        }
        ruta = f"{CATALOGOS}/tamanos-empresa/{e['id']}"
        assert (
            cliente.put(ruta, headers=admin, json={"nombre": "Una persona", "rango": "1"}).json()[
                "nombre"
            ]
            == "Una persona"
        )
        assert cliente.patch(ruta, headers=admin, json={"activo": False}).json()["activo"] is False
        assert cliente.delete(ruta, headers=admin).status_code == 204
        assert cliente.delete(ruta, headers=admin).json()["detail"] == "El elemento no existe."

    def test_el_elemento_de_otro_tipo_no_existe(self, cliente: TestClient, admin: dict) -> None:
        # El id 7 existe en sectores pero no en modalidades.
        respuesta = cliente.patch(
            f"{CATALOGOS}/modalidades/7", headers=admin, json={"activo": True}
        )

        assert respuesta.status_code == 404

    def test_campos_obligatorios_segun_el_tipo(self, cliente: TestClient, admin: dict) -> None:
        def campos(tipo, cuerpo):
            return cliente.post(f"{CATALOGOS}/{tipo}", headers=admin, json=cuerpo).json()["campos"]

        assert campos("ajustes", {"nombre": "Silla ergonómica", "categoria": "otra"}) == {
            "descripcion": "Escribe la descripción en lenguaje claro.",
            "categoria": "Elige una categoría de la lista.",
        }
        assert campos("niveles-educativos", {"nombre": "Doctorado"}) == {
            "orden": "Escribe el orden como un número entero."
        }
        assert campos("niveles-educativos", {"nombre": "Doctorado", "orden": 6}) == {
            "orden": "Ya hay un nivel con ese orden."
        }
        assert campos("tamanos-empresa", {"nombre": "Enorme"}) == {
            "rango": "Escribe el rango de trabajadores."
        }
        assert campos("motivos-reporte", {"nombre": "Spam", "aplica_a": "nadie"}) == {
            "aplica_a": "Elige a qué aplica el motivo."
        }
        assert campos("modalidades", {"nombre": ""}) == {"nombre": "Escribe el nombre."}

    def test_crear_con_campos_propios(self, cliente: TestClient, admin: dict) -> None:
        ajuste = cliente.post(
            f"{CATALOGOS}/ajustes",
            headers=admin,
            json={
                "nombre": "Silla ergonómica",
                "descripcion": "Silla adaptable a la persona",
                "categoria": "movilidad",
            },
        ).json()
        nivel = cliente.post(
            f"{CATALOGOS}/niveles-educativos",
            headers=admin,
            json={"nombre": "Doctorado", "orden": 7},
        ).json()
        # Editar un nivel conservando su propio orden es válido.
        mismo = cliente.put(
            f"{CATALOGOS}/niveles-educativos/{nivel['id']}",
            headers=admin,
            json={"nombre": "Doctorado (PhD)", "orden": 7},
        )

        assert (ajuste["categoria"], ajuste["descripcion"]) == (
            "movilidad",
            "Silla adaptable a la persona",
        )
        assert mismo.status_code == 200
        assert mismo.json()["orden"] == 7

    def test_duplicado_y_en_uso(self, cliente: TestClient, admin: dict) -> None:
        duplicado = cliente.post(
            f"{CATALOGOS}/modalidades", headers=admin, json={"nombre": "remoto"}
        )
        en_uso = cliente.delete(f"{CATALOGOS}/modalidades/1", headers=admin)

        assert (duplicado.status_code, duplicado.json()["detail"]) == (
            409,
            "Ya existe un elemento con ese nombre en el catálogo.",
        )
        assert (en_uso.status_code, en_uso.json()["detail"]) == (
            409,
            "El elemento está en uso; solo se puede desactivar.",
        )

    def test_nombre_respeta_el_limite_de_la_base(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.post(
            f"{CATALOGOS}/modalidades", headers=admin, json={"nombre": "x" * 100}
        )

        assert respuesta.status_code == 422
        assert "nombre" in respuesta.json()["campos"]

    def test_ids_extremos_no_rompen(self, cliente: TestClient, admin: dict) -> None:
        for ruta in (
            f"{CATALOGOS}/modalidades/{2**40}",
            f"{CATEGORIAS}/{2**40}",
            f"{HABILIDADES}/-1",
        ):
            assert cliente.delete(ruta, headers=admin).status_code in (404, 422)
