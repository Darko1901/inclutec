from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.esquemas.entrevista import Horario, HorarioEntrada
from app.paginacion import IdGrande
from app.servicios import horarios as servicio
from app.servicios.reclutador import empresa_del_reclutador

router = APIRouter(prefix="/horarios-entrevista", tags=["Horarios y entrevistas"])

Candidata = Annotated[UsuarioActual, Depends(exigir_roles("candidato"))]
Reclutadora = Annotated[UsuarioActual, Depends(exigir_roles("reclutador"))]


@router.post(
    "",
    response_model=Horario,
    status_code=status.HTTP_201_CREATED,
    summary="Publicar horario",
    operation_id="post_horarios_entrevista",
)
def publicar(datos: HorarioEntrada, actual: Reclutadora, db: Db) -> Horario:
    """La fecha debe ser futura y no traslaparse con otro horario vigente del reclutador."""
    empresa = empresa_del_reclutador(db, actual)
    return servicio.publicar(db, empresa, actual.id, datos)


@router.get(
    "",
    response_model=list[Horario],
    summary="Horarios disponibles de una vacante",
    operation_id="get_horarios_entrevista",
)
def disponibles(
    actual: Candidata,
    db: Db,
    vacante_id: Annotated[IdGrande | None, Query(description="Vacante. Obligatorio.")] = None,
    disponible: Annotated[bool, Query(description="Siempre true para el candidato.")] = True,
) -> list[Horario]:
    """Solo si el candidato tiene una postulación en «entrevista» para esa vacante."""
    return servicio.disponibles(db, actual.id, vacante_id)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar horario libre",
    operation_id="delete_horarios_entrevista_id",
)
def eliminar(id: int, actual: Reclutadora, db: Db) -> Response:
    """Para un horario agendado se usa `PATCH /entrevistas/{id}` con estado «cancelada»."""
    empresa = empresa_del_reclutador(db, actual)
    servicio.eliminar(db, servicio.horario_propio(db, empresa.id, id, bloquear=True))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
