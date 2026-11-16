"""Forma única de los errores del API: {"detail", "codigo", "campos"} (sección 1 del contrato)."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as HTTPExceptionStarlette

registro = logging.getLogger("inclutec.api")

MENSAJE_VALIDACION = "Revisa los datos marcados."


class ApiError(Exception):
    """Error de negocio con HTTP, código y mensaje del contrato."""

    def __init__(
        self,
        status: int,
        codigo: str,
        detail: str,
        campos: dict[str, str] | None = None,
        encabezados: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.status = status
        self.codigo = codigo
        self.detail = detail
        self.campos = campos
        self.encabezados = encabezados


def respuesta_de_error(
    status: int,
    codigo: str,
    detail: str,
    campos: dict[str, str] | None = None,
    encabezados: dict[str, str] | None = None,
) -> JSONResponse:
    # `campos` trae mensajes solo en los errores de validación; en los demás va null.
    cuerpo: dict[str, object] = {"detail": detail, "codigo": codigo, "campos": campos}
    return JSONResponse(cuerpo, status_code=status, headers=encabezados)


def nombre_de_campo(ubicacion: tuple[int | str, ...]) -> str:
    """`body.empresa.rfc` → `empresa.rfc`; los parámetros de ruta y query conservan su nombre."""
    partes = [str(p) for p in ubicacion if p not in ("body", "query", "path", "header")]
    return ".".join(partes) or "cuerpo"


def mensaje_de_pydantic(error: dict) -> str:
    tipo = error.get("type", "")
    contexto = error.get("ctx", {})
    if tipo == "missing":
        return "Este campo es obligatorio."
    if tipo in ("string_too_long",):
        return f"Usa máximo {contexto.get('max_length')} caracteres."
    if tipo in ("string_too_short",):
        minimo = contexto.get("min_length")
        return "Este campo es obligatorio." if minimo == 1 else f"Usa al menos {minimo} caracteres."
    if tipo.startswith("string_pattern"):
        return "No tiene el formato correcto."
    if tipo in ("int_parsing", "int_type", "float_parsing"):
        return "Debe ser un número."
    if tipo in ("greater_than_equal", "less_than_equal", "greater_than", "less_than"):
        return "El valor está fuera del rango permitido."
    if tipo == "value_error" and error.get("loc", ("",))[-1] == "correo":
        return "Escribe un correo válido."
    if tipo == "value_error":
        return "El valor no es válido."
    if tipo == "enum" or tipo == "literal_error":
        return "Elige una opción válida."
    if tipo in ("bool_parsing", "bool_type"):
        return "Debe ser verdadero o falso."
    return "El valor no es válido."


def instalar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, error: ApiError) -> JSONResponse:
        return respuesta_de_error(
            error.status, error.codigo, error.detail, error.campos, error.encabezados
        )

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, error: RequestValidationError) -> JSONResponse:
        campos: dict[str, str] = {}
        for item in error.errors():
            campos.setdefault(nombre_de_campo(tuple(item["loc"])), mensaje_de_pydantic(item))
        return respuesta_de_error(422, "validacion", MENSAJE_VALIDACION, campos)

    @app.exception_handler(HTTPExceptionStarlette)
    async def _http(_: Request, error: HTTPExceptionStarlette) -> JSONResponse:
        if error.status_code == 404:
            return respuesta_de_error(404, "no_encontrado", "El recurso no existe.")
        if error.status_code == 400:
            # Cuerpo que no se puede leer (JSON roto o que no es UTF-8).
            return respuesta_de_error(
                422, "validacion", MENSAJE_VALIDACION, {"cuerpo": "El cuerpo no es un JSON válido."}
            )
        if error.status_code == 405:
            return respuesta_de_error(405, "metodo_no_permitido", "Ese método no está permitido.")
        return respuesta_de_error(error.status_code, "error_interno", str(error.detail))

    @app.exception_handler(Exception)
    async def _inesperado(_: Request, error: Exception) -> JSONResponse:
        registro.exception("Error no previsto", exc_info=error)
        return respuesta_de_error(
            500, "error_interno", "El servicio no está disponible; intenta más tarde."
        )
