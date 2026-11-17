"""Revisión transversal: toda ruta protegida exige sesión y ninguna responde 500 ante entradas raras."""

import re

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import iniciar_sesion

PREFIJO = "/api/v1"
CUENTAS = {
    "candidato": "mariana.lopez@correo.mx",
    "reclutador": "rh@tecnoqro.mx",
    "administrador": "admin@inclutec.mx",
}

# Rutas que no piden sesión: login, registro, recuperación de contraseña, catálogos y archivos
# públicos (fotos y logotipos).
PUBLICAS = {
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/registro/candidato"),
    ("POST", "/api/v1/auth/registro/reclutador"),
    ("POST", "/api/v1/auth/password/solicitar"),
    ("POST", "/api/v1/auth/password/verificar"),
    ("POST", "/api/v1/auth/password/restablecer"),
    ("GET", "/api/v1/catalogos/{tipo}"),
    ("GET", "/archivos/{carpeta}/{nombre}"),
}
METODOS = ("get", "post", "put", "patch", "delete")


def _operaciones() -> list[tuple[str, str, dict]]:
    esquema = app.openapi()
    return [
        (metodo.upper(), ruta, operacion)
        for ruta, metodos in esquema["paths"].items()
        for metodo, operacion in metodos.items()
        if metodo in METODOS
    ]


def _con_valores(ruta: str, valor: str) -> str:
    """Rellena los parámetros de ruta: ids numéricos, `tipo` de catálogo, carpeta y nombre."""
    ruta = ruta.replace("{tipo}", "modalidades")
    ruta = ruta.replace("{carpeta}", "fotos").replace("{nombre}", "candidato-3.png")
    return re.sub(r"\{[^}]+\}", valor, ruta)


OPERACIONES = _operaciones()
IDENTIFICADORES = [(m, r) for m, r, _ in OPERACIONES]


@pytest.mark.parametrize(("metodo", "ruta"), IDENTIFICADORES)
def test_toda_ruta_protegida_responde_401_sin_token(
    cliente: TestClient, metodo: str, ruta: str
) -> None:
    if (metodo, ruta) in PUBLICAS:
        pytest.skip("ruta pública")

    respuesta = cliente.request(metodo, _con_valores(ruta, "1"), json={})

    assert respuesta.status_code == 401, f"{metodo} {ruta} dejó pasar a un usuario sin sesión"
    assert respuesta.json()["codigo"] == "no_autenticado"


def test_la_lista_de_rutas_publicas_es_exacta() -> None:
    """Si aparece una ruta pública nueva, hay que decidirlo aquí a propósito."""
    sin_seguridad = {(m, r) for m, r, operacion in OPERACIONES if not operacion.get("security")}

    assert sin_seguridad == PUBLICAS


@pytest.mark.parametrize("rol", CUENTAS)
def test_ninguna_ruta_responde_500_con_entradas_raras(cliente: TestClient, rol: str) -> None:
    """Cada rol golpea todas las rutas con ids inexistentes, enormes y cuerpos basura.

    No se revisa el resultado exacto (eso lo hacen las demás pruebas), solo que el API nunca
    responda con un error interno.
    """
    encabezado = iniciar_sesion(cliente, CUENTAS[rol])
    cuerpos = [
        {},
        {"x": [1, 2], "y": None},
        [],
        "texto",
        {"vacante_id": "a", "horario_id": -1, "estado": 7, "correo": ["a"], "texto": {"a": 1}},
    ]
    fallas: list[str] = []
    for metodo, ruta, operacion in OPERACIONES:
        if (metodo, ruta) in PUBLICAS and ruta != "/api/v1/catalogos/{tipo}":
            continue
        multipart = "multipart/form-data" in operacion.get("requestBody", {}).get("content", {})
        for valor in ("1", "9999", str(10**30), "abc", "-5"):
            url = _con_valores(ruta, valor)
            llamadas = (
                [{"files": {"archivo": ("x.bin", b"no es un archivo valido")}}]
                if multipart
                else [{"json": cuerpo} for cuerpo in cuerpos]
            )
            for argumentos in llamadas:
                respuesta = cliente.request(metodo, url, headers=encabezado, **argumentos)
                if respuesta.status_code >= 500:
                    fallas.append(f"{rol} {metodo} {url} → {respuesta.status_code}")
    assert not fallas, "\n".join(fallas[:20])


def _parametros_enteros(operacion: dict) -> list[str]:
    nombres = []
    for p in operacion.get("parameters", []):
        if p["in"] != "query":
            continue
        esquema = p.get("schema", {})
        tipos = [esquema.get("type")] + [a.get("type") for a in esquema.get("anyOf", [])]
        items = esquema.get("items", {})
        tipos += [items.get("type")] + [a.get("type") for a in items.get("anyOf", [])]
        if "integer" in tipos:
            nombres.append(p["name"])
    return nombres


@pytest.mark.parametrize("rol", CUENTAS)
def test_ningun_parametro_entero_de_consulta_enorme_da_500(cliente: TestClient, rol: str) -> None:
    encabezado = iniciar_sesion(cliente, CUENTAS[rol])
    fallas = []
    for metodo, ruta, operacion in OPERACIONES:
        if metodo != "GET":
            continue
        for nombre in _parametros_enteros(operacion):
            for valor in (str(10**30), "-1", "0"):
                url = f"{_con_valores(ruta, '1')}?{nombre}={valor}"
                respuesta = cliente.get(url, headers=encabezado)
                if respuesta.status_code >= 500:
                    fallas.append(f"{rol} {url} → {respuesta.status_code}")
    assert not fallas, "\n".join(fallas[:20])


def test_parametros_de_consulta_basura_no_dan_500(cliente: TestClient) -> None:
    encabezado = iniciar_sesion(cliente, CUENTAS["candidato"])
    consultas = [
        "?page=abc",
        "?page=-1&size=0",
        "?size=999999999999999999999",
        f"?q={'x' * 5000}",
        "?compatibilidad_min=1e9",
        "?ajuste_id=a&ajuste_id=",
        "?salario_min=nan",
        "?modalidad_id=99999999999999999999",
        "?orden[]=1",
    ]
    fallas = []
    for ruta in (
        "/vacantes",
        "/vacantes/recomendadas",
        "/postulaciones/me",
        "/notificaciones",
        "/empresas",
    ):
        for consulta in consultas:
            respuesta = cliente.get(f"{PREFIJO}{ruta}{consulta}", headers=encabezado)
            if respuesta.status_code >= 500:
                fallas.append(f"{ruta}{consulta} → {respuesta.status_code}")
    assert not fallas, "\n".join(fallas)


def _campos_del_cuerpo(operacion: dict) -> list[str]:
    """Nombres de los campos de primer nivel del cuerpo JSON, según el OpenAPI del propio API."""
    esquema = app.openapi()
    contenido = operacion.get("requestBody", {}).get("content", {}).get("application/json")
    if not contenido:
        return []
    cuerpo = contenido["schema"]
    if "$ref" in cuerpo:
        cuerpo = esquema["components"]["schemas"][cuerpo["$ref"].split("/")[-1]]
    return list(cuerpo.get("properties", {}))


@pytest.mark.parametrize("rol", CUENTAS)
def test_ningun_cuerpo_con_valores_extremos_da_500(cliente: TestClient, rol: str) -> None:
    """Cada campo del cuerpo con un entero enorme, un texto larguísimo y una lista de enormes."""
    encabezado = iniciar_sesion(cliente, CUENTAS[rol])
    fallas = []
    for metodo, ruta, operacion in OPERACIONES:
        campos = _campos_del_cuerpo(operacion)
        if not campos or (metodo, ruta) in PUBLICAS and "auth/login" in ruta:
            continue
        variantes = [
            {c: 10**30 for c in campos},
            {c: "x" * 20000 for c in campos},
            {c: [10**30, -1] for c in campos},
            {c: {"a": 10**30} for c in campos},
            {c: -(10**30) for c in campos},
            {c: 1.5e308 for c in campos},
        ]
        for valor in ("1", "9999"):
            for cuerpo in variantes:
                respuesta = cliente.request(
                    metodo, _con_valores(ruta, valor), headers=encabezado, json=cuerpo
                )
                if respuesta.status_code >= 500:
                    fallas.append(
                        f"{rol} {metodo} {_con_valores(ruta, valor)} → {respuesta.status_code}"
                    )
    assert not fallas, "\n".join(sorted(set(fallas))[:25])
