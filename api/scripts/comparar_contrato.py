"""Compara las rutas del API (FastAPI) con docs/api/openapi.yaml y lista las diferencias.

Revisa, por cada operación: que exista de los dos lados, los parámetros (ruta y query), los campos
del cuerpo de la petición, los códigos de respuesta de éxito y los campos de la respuesta de éxito
(de forma recursiva). El contrato manda: lo que sobra o falta en el código es el error.

Uso (desde api/, con el entorno virtual activo y sin necesidad de la base de datos):

    python scripts/comparar_contrato.py            # imprime las diferencias; sale con 1 si hay
    python scripts/comparar_contrato.py --resumen  # solo los totales
"""

import sys
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "api"))

from app.main import app  # noqa: E402

METODOS = ("get", "post", "put", "patch", "delete")


def _resolver(esquema: dict, raiz: dict, vistos: tuple = ()) -> dict:
    """Sigue los $ref y aplana allOf; devuelve un esquema sin referencias en la primera capa."""
    while isinstance(esquema, dict) and "$ref" in esquema:
        ref = esquema["$ref"]
        if ref in vistos:
            return {}
        vistos += (ref,)
        nodo = raiz
        for parte in ref.lstrip("#/").split("/"):
            nodo = nodo[parte]
        esquema = nodo
    if isinstance(esquema, dict) and "allOf" in esquema:
        fusion: dict = {"properties": {}, "required": []}
        for parte in esquema["allOf"]:
            p = _resolver(parte, raiz, vistos)
            fusion["properties"].update(p.get("properties", {}))
            fusion["required"] += p.get("required", [])
        return fusion
    return esquema


def _campos(esquema: dict, raiz: dict, prefijo: str = "", vistos: tuple = ()) -> set[str]:
    """Rutas de todos los campos (a.b.c, listas como a[].b), ignorando null y uniones."""
    esquema = _resolver(esquema, raiz, vistos)
    if not isinstance(esquema, dict):
        return set()
    for clave in ("anyOf", "oneOf"):
        if clave in esquema:
            salida: set[str] = set()
            for opcion in esquema[clave]:
                if opcion.get("type") != "null":
                    salida |= _campos(opcion, raiz, prefijo, vistos)
            return salida
    salida = set()
    if "properties" in esquema:
        for nombre, sub in esquema["properties"].items():
            ruta = f"{prefijo}{nombre}"
            salida.add(ruta)
            salida |= _campos(sub, raiz, ruta + ".", vistos + (id(sub),))
    tipo = esquema.get("type")
    es_lista = tipo == "array" or (isinstance(tipo, list) and "array" in tipo)
    if es_lista and "items" in esquema:
        salida |= _campos(esquema["items"], raiz, prefijo.rstrip(".") + "[].", vistos)
    return salida


def _cuerpo(operacion: dict, raiz: dict, que: str) -> set[str]:
    if que == "peticion":
        contenido = operacion.get("requestBody", {}).get("content", {})
    else:
        exito = [c for c in operacion.get("responses", {}) if c.startswith("2")]
        contenido = (
            operacion.get("responses", {}).get(exito[0], {}).get("content", {}) if exito else {}
        )
    for tipo in ("application/json", "multipart/form-data"):
        if tipo in contenido:
            return _campos(contenido[tipo].get("schema", {}), raiz)
    return set()


def _parametros(operacion: dict, raiz: dict) -> dict[tuple[str, str], bool]:
    salida = {}
    for p in operacion.get("parameters", []):
        p = _resolver(p, raiz)
        salida[(p["in"], p["name"])] = bool(p.get("required", False))
    return salida


def _operaciones(documento: dict) -> dict[tuple[str, str], dict]:
    salida = {}
    for ruta, metodos in documento["paths"].items():
        for metodo, operacion in metodos.items():
            if metodo in METODOS:
                salida[(metodo.upper(), ruta)] = operacion
    return salida


def _normalizar_ruta(ruta: str) -> str:
    return ruta.rstrip("/") or "/"


def comparar() -> list[str]:
    contrato = yaml.safe_load((RAIZ / "docs" / "api" / "openapi.yaml").read_text(encoding="utf-8"))
    codigo = app.openapi()
    base = contrato["servers"][0]["url"].replace("http://localhost:8000", "")

    del_contrato = {
        (m, _normalizar_ruta(base + r)): o for (m, r), o in _operaciones(contrato).items()
    }
    del_codigo = {(m, _normalizar_ruta(r)): o for (m, r), o in _operaciones(codigo).items()}
    # Los archivos subidos se sirven fuera de /api/v1 y no son parte del contrato.
    del_codigo = {k: v for k, v in del_codigo.items() if not k[1].startswith("/archivos")}

    diferencias: list[str] = []
    for clave in sorted(del_contrato.keys() - del_codigo.keys()):
        diferencias.append(f"FALTA en el API: {clave[0]} {clave[1]}")
    for clave in sorted(del_codigo.keys() - del_contrato.keys()):
        diferencias.append(f"SOBRA en el API (no está en el contrato): {clave[0]} {clave[1]}")

    for clave in sorted(del_contrato.keys() & del_codigo.keys()):
        c, k = del_contrato[clave], del_codigo[clave]
        nombre = f"{clave[0]} {clave[1]}"

        pc, pk = _parametros(c, contrato), _parametros(k, codigo)
        # Los parámetros de ruta siempre son obligatorios; el contrato y FastAPI lo marcan igual.
        for p in sorted(pc.keys() - pk.keys()):
            diferencias.append(f"{nombre}: falta el parámetro {p[0]} «{p[1]}»")
        for p in sorted(pk.keys() - pc.keys()):
            diferencias.append(f"{nombre}: parámetro {p[0]} «{p[1]}» que el contrato no tiene")
        for p in sorted(pc.keys() & pk.keys()):
            if pc[p] != pk[p]:
                diferencias.append(
                    f"{nombre}: el parámetro «{p[1]}» es obligatorio={pc[p]} en el contrato "
                    f"y {pk[p]} en el API"
                )

        for que in ("peticion", "respuesta"):
            fc, fk = _cuerpo(c, contrato, que), _cuerpo(k, codigo, que)
            for campo in sorted(fc - fk):
                diferencias.append(f"{nombre}: falta el campo {campo} en la {que}")
            for campo in sorted(fk - fc):
                diferencias.append(f"{nombre}: campo {campo} de más en la {que}")

        ec = {x for x in c.get("responses", {}) if x.startswith("2")}
        ek = {x for x in k.get("responses", {}) if x.startswith("2")}
        if ec != ek:
            diferencias.append(
                f"{nombre}: respuesta de éxito {sorted(ec)} en el contrato y {sorted(ek)} en el API"
            )

    return diferencias


if __name__ == "__main__":
    lista = comparar()
    if "--resumen" not in sys.argv:
        for linea in lista:
            print(linea)
    print(f"\n{len(lista)} diferencias")
    sys.exit(1 if lista else 0)
