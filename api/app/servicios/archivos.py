"""Guardado de fotos, logotipos y constancias (sección «Archivos» del contrato).

Se valida el tipo por el contenido (firma del archivo), no por el nombre ni el Content-Type que
manda el cliente, y el tamaño en el servidor. Las rutas que se devuelven son relativas al servidor
del API (`/archivos/...`, fuera de `/api/v1`) y es lo único que se guarda en la base de datos.
"""

from pathlib import Path

from fastapi import UploadFile

from app.config import RAIZ_API, obtener_configuracion
from app.errores import ApiError

MAX_IMAGEN_BYTES = 2 * 1024 * 1024
MAX_PDF_BYTES = 5 * 1024 * 1024

_FIRMAS_IMAGEN = {
    "jpg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
}


def raiz_archivos() -> Path:
    ruta = Path(obtener_configuracion().archivos_dir)
    return ruta if ruta.is_absolute() else RAIZ_API / ruta


def _leer(archivo: UploadFile | None, maximo: int, mensaje_tamano: str) -> bytes:
    if archivo is None or not archivo.filename:
        raise ApiError(422, "archivo_invalido", "No se recibió ningún archivo.")
    # Se lee un byte de más para saber si se pasó del límite sin cargar archivos enormes.
    contenido = archivo.file.read(maximo + 1)
    if len(contenido) > maximo:
        raise ApiError(422, "archivo_invalido", mensaje_tamano)
    return contenido


def leer_imagen(archivo: UploadFile | None, nombre: str, ligero: str) -> tuple[bytes, str]:
    """Valida una foto o un logotipo (JPG o PNG de hasta 2 MB). Devuelve (contenido, extensión).

    `nombre` es el sujeto del mensaje («La foto») y `ligero` cómo pedir otro («una más ligera»).
    """
    contenido = _leer(archivo, MAX_IMAGEN_BYTES, f"{nombre} pesa más de 2 MB. Elige {ligero}.")
    for extension, firmas in _FIRMAS_IMAGEN.items():
        if any(contenido.startswith(firma) for firma in firmas):
            return contenido, extension
    raise ApiError(422, "archivo_invalido", f"{nombre} debe ser JPG o PNG.")


def leer_pdf(archivo: UploadFile | None) -> bytes:
    """Valida una constancia (PDF de hasta 5 MB)."""
    contenido = _leer(
        archivo, MAX_PDF_BYTES, "La constancia pesa más de 5 MB. Elige un PDF más ligero."
    )
    if not contenido.startswith(b"%PDF-"):
        raise ApiError(422, "archivo_invalido", "La constancia debe ser un archivo PDF.")
    return contenido


def guardar(carpeta: str, nombre: str, extension: str, contenido: bytes) -> str:
    """Guarda `carpeta/nombre.extension` (reemplaza el anterior) y devuelve la ruta pública."""
    destino = raiz_archivos() / carpeta
    destino.mkdir(parents=True, exist_ok=True)
    borrar(carpeta, nombre)
    (destino / f"{nombre}.{extension}").write_bytes(contenido)
    return f"/archivos/{carpeta}/{nombre}.{extension}"


def borrar(carpeta: str, nombre: str) -> None:
    """Quita el archivo de ese nombre con cualquier extensión (jpg, png o pdf)."""
    destino = raiz_archivos() / carpeta
    for extension in ("jpg", "png", "pdf"):
        (destino / f"{nombre}.{extension}").unlink(missing_ok=True)


def borrar_por_url(url: str | None) -> None:
    """Quita el archivo al que apunta una ruta `/archivos/<carpeta>/<nombre>.<ext>`."""
    if not url or not url.startswith("/archivos/"):
        return
    relativa = Path(url.removeprefix("/archivos/"))
    if ".." in relativa.parts:
        return
    (raiz_archivos() / relativa).unlink(missing_ok=True)
