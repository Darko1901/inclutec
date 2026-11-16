import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

RUTA = "/api/v1/catalogos"

# Campos que debe traer cada tipo además de `id` y `nombre` (sección CatalogoItem del contrato).
CAMPOS_POR_TIPO = {
    "entidades": [],
    "municipios": ["entidad_federativa_id"],
    "modalidades": [],
    "jornadas": [],
    "tipos-contrato": [],
    "niveles-educativos": ["orden"],
    "sectores": [],
    "tamanos-empresa": ["rango"],
    "categorias": ["descripcion"],
    "habilidades": ["categoria_id"],
    "ajustes": ["descripcion", "categoria"],
    "motivos-reporte": ["aplica_a"],
}


@pytest.mark.parametrize("tipo", CAMPOS_POR_TIPO)
def test_cada_tipo_es_publico_y_trae_solo_sus_campos(cliente: TestClient, tipo: str) -> None:
    respuesta = cliente.get(f"{RUTA}/{tipo}")

    assert respuesta.status_code == 200
    items = respuesta.json()
    assert isinstance(items, list)
    assert items, f"el catálogo {tipo} no debería estar vacío"
    for item in items:
        assert set(item) == {"id", "nombre", *CAMPOS_POR_TIPO[tipo]}


def test_ordena_por_nombre(cliente: TestClient) -> None:
    nombres = [i["nombre"] for i in cliente.get(f"{RUTA}/modalidades").json()]

    assert nombres == sorted(nombres, key=str.casefold)


def test_niveles_educativos_van_por_orden(cliente: TestClient) -> None:
    ordenes = [i["orden"] for i in cliente.get(f"{RUTA}/niveles-educativos").json()]

    assert ordenes == sorted(ordenes)


def test_solo_devuelve_los_activos(cliente: TestClient, db: Session) -> None:
    antes = {i["id"] for i in cliente.get(f"{RUTA}/modalidades").json()}
    db.execute(text("UPDATE modalidad SET activo = FALSE WHERE id = 1"))

    despues = {i["id"] for i in cliente.get(f"{RUTA}/modalidades").json()}

    assert 1 in antes
    assert despues == antes - {1}


def test_municipios_se_filtran_por_entidad(cliente: TestClient) -> None:
    todos = cliente.get(f"{RUTA}/municipios").json()
    entidad = todos[0]["entidad_federativa_id"]

    filtrados = cliente.get(f"{RUTA}/municipios", params={"entidad_id": entidad}).json()

    assert 0 < len(filtrados) <= len(todos)
    assert {m["entidad_federativa_id"] for m in filtrados} == {entidad}


def test_habilidades_se_filtran_por_categoria(cliente: TestClient) -> None:
    filtradas = cliente.get(f"{RUTA}/habilidades", params={"categoria_id": 1}).json()

    assert filtradas
    assert {h["categoria_id"] for h in filtradas} == {1}


def test_habilidades_autocompletan_con_q(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/habilidades", params={"q": "pyth"})

    assert [h["nombre"] for h in respuesta.json()] == ["Python"]


def test_q_de_menos_de_dos_caracteres_da_422(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/habilidades", params={"q": "p"})

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "validacion"
    assert "q" in respuesta.json()["campos"]


def test_q_trae_maximo_20_resultados(cliente: TestClient, db: Session) -> None:
    db.execute(
        text(
            "INSERT INTO habilidad (categoria_id, nombre) "
            "SELECT 1, 'Zzz habilidad ' || n FROM generate_series(1, 25) AS n"
        )
    )

    resultados = cliente.get(f"{RUTA}/habilidades", params={"q": "zzz habilidad"}).json()

    assert len(resultados) == 20


def test_motivos_incluyen_los_de_todos(cliente: TestClient) -> None:
    motivos = cliente.get(f"{RUTA}/motivos-reporte", params={"aplica_a": "vacante"}).json()

    assert motivos
    assert {m["aplica_a"] for m in motivos} <= {"vacante", "todos"}


def test_aplica_a_desconocido_da_422(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/motivos-reporte", params={"aplica_a": "usuario"})

    assert respuesta.status_code == 422
    assert "aplica_a" in respuesta.json()["campos"]


def test_tipo_inexistente_da_404_con_la_forma_del_contrato(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/colores")

    assert respuesta.status_code == 404
    assert respuesta.json() == {
        "detail": "El catálogo no existe.",
        "codigo": "no_encontrado",
        "campos": None,
    }
