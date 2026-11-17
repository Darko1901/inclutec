from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Response, status
from sqlalchemy import select

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.entrevista import (
    CancelacionCandidato,
    DiaAgenda,
    ResultadoEntrevista,
)
from app.esquemas.entrevista import (
    Entrevista as EntrevistaSalida,
)
from app.modelos import Entrevista, HorarioEntrevista, Postulacion, Vacante
from app.paginacion import IdGrande
from app.servicios import entrevistas as servicio_entrevistas
from app.servicios import horarios as servicio
from app.servicios.reclutador import empresa_del_reclutador
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/entrevistas", tags=["Horarios y entrevistas"])

Candidata = Annotated[UsuarioActual, Depends(exigir_roles("candidato"))]
Reclutadora = Annotated[UsuarioActual, Depends(exigir_roles("reclutador"))]

RESULTADOS = ("realizada", "no_asistio", "cancelada")


def _no_encontrada() -> ApiError:
    return ApiError(404, "no_encontrado", "No encontramos esa entrevista.")


def _entrevista_por_id(db: Db, id_: int) -> Entrevista | None:
    return db.get(Entrevista, id_) if 1 <= id_ <= 2**63 - 1 else None


@router.get(
    "/me",
    response_model=list[DiaAgenda],
    summary="Mi agenda",
    operation_id="get_entrevistas_me",
)
def mi_agenda(
    actual: Reclutadora,
    db: Db,
    desde: Annotated[str | None, Query(description="Fecha AAAA-MM-DD.")] = None,
    hasta: Annotated[str | None, Query(description="Fecha AAAA-MM-DD.")] = None,
    vacante_id: Annotated[IdGrande | None, Query(description="Filtra por vacante.")] = None,
) -> list[DiaAgenda]:
    """Horarios libres y agendados por día; por omisión, desde hoy hasta 30 días después."""
    return servicio.agenda(db, actual.id, desde, hasta, vacante_id)


@router.patch(
    "/{id}",
    response_model=EntrevistaSalida,
    summary="Registrar resultado o cancelar",
    operation_id="patch_entrevistas_id",
)
def registrar_resultado(
    id: int, datos: ResultadoEntrevista, actual: Reclutadora, db: Db
) -> EntrevistaSalida:
    """«realizada» y «no_asistio» solo después de la hora de inicio; «cancelada» exige motivo."""
    empresa = empresa_del_reclutador(db, actual)
    entrevista = _entrevista_por_id(db, id)
    horario = db.get(HorarioEntrevista, entrevista.horario_id) if entrevista else None
    vacante = db.get(Vacante, horario.vacante_id) if horario else None
    if entrevista is None or vacante is None or vacante.empresa_id != empresa.id:
        raise ApiError(404, "no_encontrado", "Esa entrevista no existe.")

    campos: dict[str, str] = {}
    if datos.estado not in RESULTADOS:
        campos["estado"] = "Elige realizada, no asistió o cancelada."
    motivo = (datos.motivo_cancelacion or "").strip()
    if datos.estado == "cancelada":
        if not motivo:
            campos["motivo_cancelacion"] = "Escribe el motivo de la cancelación."
        elif len(motivo) > servicio.MAX_MOTIVO:
            campos["motivo_cancelacion"] = (
                f"El motivo puede tener hasta {servicio.MAX_MOTIVO} caracteres."
            )
    lanzar_si_hay_campos(campos)

    if entrevista.estado != "agendada":
        raise ApiError(
            409, "transicion_invalida", "Esta entrevista ya tiene un resultado o se canceló."
        )
    if datos.estado != "cancelada" and horario.inicio > servicio_entrevistas.ahora():
        raise ApiError(
            409,
            "transicion_invalida",
            "La entrevista aún no empieza: podrás registrar el resultado después de la hora de "
            "inicio.",
        )

    if datos.estado == "cancelada":
        servicio.cancelar_por_reclutador(db, entrevista, motivo, actual.id)
    else:
        entrevista.estado = datos.estado
    db.flush()
    return servicio_entrevistas.vista_de(db, entrevista, para_candidato=False)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancelar mi entrevista",
    operation_id="delete_entrevistas_id",
)
def cancelar_mi_entrevista(
    id: int,
    actual: Candidata,
    db: Db,
    datos: Annotated[CancelacionCandidato | None, Body()] = None,
) -> Response:
    """Solo con al menos 24 h de anticipación; el horario vuelve a quedar libre."""
    entrevista = _entrevista_por_id(db, id)
    # Solo ve las entrevistas de sus propias postulaciones.
    propia = (
        entrevista is not None
        and db.scalar(
            select(Postulacion.id).where(
                Postulacion.id == entrevista.postulacion_id,
                Postulacion.candidato_id == actual.id,
            )
        )
        is not None
    )
    if not propia:
        raise _no_encontrada()

    motivo = datos.motivo if datos else None
    if motivo is not None and len(motivo) > servicio.MAX_MOTIVO:
        lanzar_si_hay_campos(
            {"motivo": f"El motivo puede tener hasta {servicio.MAX_MOTIVO} caracteres."}
        )
    if entrevista.estado != "agendada":
        raise ApiError(409, "estado_invalido", "Esta entrevista ya no está agendada.")
    horario = db.get(HorarioEntrevista, entrevista.horario_id)
    if horario.inicio - servicio_entrevistas.ahora() < timedelta(
        hours=servicio_entrevistas.HORAS_CANCELACION
    ):
        raise ApiError(
            409,
            "cancelacion_tardia",
            "Solo puedes cancelar con al menos 24 horas de anticipación.",
        )
    servicio_entrevistas.cancelar_por_candidato(
        db, entrevista, motivo.strip() if motivo and motivo.strip() else None, actual.id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
