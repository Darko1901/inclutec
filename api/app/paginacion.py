"""Paginación (sección 1 del contrato): `page` desde 1 y `size` de 1 a 100 (20 por omisión)."""

from typing import Annotated

from fastapi import Depends, Query
from pydantic import Field

from app.validaciones import lanzar_si_hay_campos

TAMANO_MAXIMO = 100
TAMANO_POR_OMISION = 20
# Una página más allá de este tope ya no tiene datos y haría desbordar el OFFSET de la base.
PAGINA_MAXIMA = 1_000_000


class Paginacion:
    def __init__(self, page: int, size: int) -> None:
        self.page = page
        self.size = size

    @property
    def desplazamiento(self) -> int:
        return (self.page - 1) * self.size


def leer_paginacion(
    page: Annotated[int, Query(description="Página, desde 1.")] = 1,
    size: Annotated[int, Query(description="Tamaño de página (máximo 100).")] = TAMANO_POR_OMISION,
) -> Paginacion:
    campos: dict[str, str] = {}
    if page < 1:
        campos["page"] = "La página empieza en 1."
    elif page > PAGINA_MAXIMA:
        campos["page"] = "La página es demasiado grande."
    if size < 1 or size > TAMANO_MAXIMO:
        campos["size"] = f"El tamaño de página va de 1 a {TAMANO_MAXIMO}."
    lanzar_si_hay_campos(campos)
    return Paginacion(page, size)


PaginacionConsulta = Annotated[Paginacion, Depends(leer_paginacion)]


# Ids de filtro: acotados al tamaño de la columna para que un valor enorme dé 422 y nunca llegue
# a la base de datos (ahí produciría un error interno).
IdPequeno = Annotated[int, Field(ge=1, le=2**31 - 1)]
IdGrande = Annotated[int, Field(ge=1, le=2**63 - 1)]
