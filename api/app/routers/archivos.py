"""Descarga de archivos (`/archivos/...`, fuera de `/api/v1`).

Fotos y logotipos son públicos: se muestran en listas que se ven antes de iniciar el proceso.
La constancia fiscal solo la descarga el reclutador de la empresa y el administrador.
"""

import re

from fastapi import APIRouter
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.dependencias import Db, SesionActual
from app.errores import ApiError
from app.modelos import Reclutador
from app.servicios.archivos import raiz_archivos

router = APIRouter(prefix="/archivos", tags=["Archivos"])

_NOMBRE = re.compile(r"(?P<base>[A-Za-z0-9-]+)\.(?P<extension>jpg|png|pdf)")
_TIPOS = {"jpg": "image/jpeg", "png": "image/png", "pdf": "application/pdf"}
_PUBLICAS = {"fotos": {"jpg", "png"}, "logos": {"jpg", "png"}}


def _archivo(carpeta: str, nombre: str) -> FileResponse:
    coincide = _NOMBRE.fullmatch(nombre)
    ruta = raiz_archivos() / carpeta / nombre
    if coincide is None or not ruta.is_file():
        raise ApiError(404, "no_encontrado", "El archivo no existe.")
    return FileResponse(ruta, media_type=_TIPOS[coincide["extension"]])


@router.get("/documentos/{nombre}", summary="Descargar constancia fiscal", include_in_schema=True)
def descargar_documento(nombre: str, actual: SesionActual, db: Db) -> FileResponse:
    coincide = re.fullmatch(r"empresa-(?P<id>\d+)\.pdf", nombre)
    if coincide is None:
        raise ApiError(404, "no_encontrado", "El archivo no existe.")
    empresa_id = int(coincide["id"])
    if actual.rol == "reclutador":
        propia = db.scalar(select(Reclutador.empresa_id).where(Reclutador.usuario_id == actual.id))
        if propia != empresa_id:
            # Una constancia ajena no se distingue de una que no existe.
            raise ApiError(404, "no_encontrado", "El archivo no existe.")
    elif actual.rol != "administrador":
        raise ApiError(403, "sin_permiso", "El rol del usuario no tiene acceso a este endpoint.")
    return _archivo("documentos", nombre)


@router.get("/{carpeta}/{nombre}", summary="Descargar foto o logotipo")
def descargar_publico(carpeta: str, nombre: str) -> FileResponse:
    coincide = _NOMBRE.fullmatch(nombre)
    if (
        carpeta not in _PUBLICAS
        or coincide is None
        or coincide["extension"] not in _PUBLICAS[carpeta]
    ):
        raise ApiError(404, "no_encontrado", "El archivo no existe.")
    return _archivo(carpeta, nombre)
