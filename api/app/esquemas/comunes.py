from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer


def _a_utc(fecha: datetime) -> str:
    """Fecha-hora ISO 8601 en UTC con `Z`, como pide el contrato (2026-10-06T16:00:00Z)."""
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=UTC)
    return fecha.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


FechaHora = Annotated[datetime, PlainSerializer(_a_utc, return_type=str, when_used="json")]


class Esquema(BaseModel):
    """Base de los cuerpos y respuestas: sin campos extra de entrada y con nulls explícitos."""

    model_config = ConfigDict(extra="ignore", from_attributes=True)


class Pagina[T](BaseModel):
    """Respuesta paginada: {items, total, page, size} (sección 1 del contrato)."""

    items: list[T]
    total: int
    page: int
    size: int


class Ref(Esquema):
    id: int
    nombre: str


class AjusteRef(Ref):
    categoria: str


class NivelEducativoRef(Ref):
    orden: int


class EntidadRef(Ref):
    pass


class MunicipioRef(Ref):
    entidad: EntidadRef


class Archivo(Esquema):
    url: str
