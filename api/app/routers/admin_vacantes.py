from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.admin import CambioEstado, EmpresaMini, VacanteAdmin
from app.esquemas.comunes import Pagina, Ref
from app.esquemas.vacante import VacanteDetalle
from app.modelos import Categoria, Empresa, Modalidad, Reporte, Vacante
from app.paginacion import IdGrande, IdPequeno, PaginacionPanel
from app.servicios import bitacora
from app.servicios import compatibilidad as motor
from app.servicios import vacantes as servicio_vacantes
from app.servicios.admin_empresas import suspender_vacante
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/admin/vacantes", tags=["Administración: vacantes"])

Administrador = Annotated[UsuarioActual, Depends(exigir_roles("administrador"))]

ESTADOS = ("borrador", "publicada", "pausada", "cerrada", "suspendida")


def _reportes_abiertos(vacante_id: int):
    return (
        select(func.count())
        .where(Reporte.vacante_id == vacante_id, Reporte.estado == "abierto")
        .scalar_subquery()
    )


def _fila(db: Db, v: Vacante) -> VacanteAdmin:
    empresa = db.get(Empresa, v.empresa_id)
    categoria = db.get(Categoria, v.categoria_id)
    modalidad = db.get(Modalidad, v.modalidad_id)
    return VacanteAdmin(
        id=v.id,
        titulo=v.titulo,
        empresa=EmpresaMini(id=empresa.id, nombre_comercial=empresa.nombre_comercial),
        categoria=Ref(id=categoria.id, nombre=categoria.nombre),
        modalidad=Ref(id=modalidad.id, nombre=modalidad.nombre),
        estado=v.estado,
        publicada_en=v.publicada_en,
        postulados=servicio_vacantes.contar_postulados(db, v.id),
        reportes_abiertos=db.scalar(select(_reportes_abiertos(v.id))) or 0,
    )


@router.get(
    "",
    response_model=Pagina[VacanteAdmin],
    summary="Listar todas las vacantes",
    operation_id="get_admin_vacantes",
)
def listar(
    _: Administrador,
    db: Db,
    pagina: PaginacionPanel,
    q: Annotated[str | None, Query(description="Busca en el título.")] = None,
    empresa_id: Annotated[IdGrande | None, Query(description="Empresa.")] = None,
    estado: Annotated[str | None, Query(description="Estado de la vacante.")] = None,
    categoria_id: Annotated[IdPequeno | None, Query(description="Categoría.")] = None,
    modalidad_id: Annotated[IdPequeno | None, Query(description="Modalidad.")] = None,
    con_reportes: Annotated[
        bool, Query(description="true: solo vacantes con reportes abiertos.")
    ] = False,
) -> Pagina[VacanteAdmin]:
    """Las más recientes primero; los borradores (sin fecha de publicación) al final.

    El detalle se consulta con `GET /vacantes/{id}`.
    """
    if estado and estado not in ESTADOS:
        lanzar_si_hay_campos(
            {"estado": "Elige borrador, publicada, pausada, cerrada o suspendida."}
        )
    filtros = []
    texto = (q or "").strip().lower()
    if texto:
        filtros.append(func.lower(Vacante.titulo).contains(texto, autoescape=True))
    for columna, valor in (
        (Vacante.empresa_id, empresa_id),
        (Vacante.estado, estado or None),
        (Vacante.categoria_id, categoria_id),
        (Vacante.modalidad_id, modalidad_id),
    ):
        if valor is not None:
            filtros.append(columna == valor)
    if con_reportes:
        filtros.append(
            select(func.count())
            .where(Reporte.vacante_id == Vacante.id, Reporte.estado == "abierto")
            .scalar_subquery()
            > 0
        )
    total = db.scalar(select(func.count()).select_from(Vacante).where(*filtros)) or 0
    filas = db.scalars(
        select(Vacante)
        .where(*filtros)
        .order_by(Vacante.publicada_en.desc().nulls_last(), Vacante.id.desc())
        .limit(pagina.size)
        .offset(pagina.desplazamiento)
    )
    items = [_fila(db, v) for v in filas]
    return Pagina[VacanteAdmin](items=items, total=total, page=pagina.page, size=pagina.size)


@router.patch(
    "/{id}/estado",
    response_model=VacanteDetalle,
    summary="Suspender o reactivar vacante",
    operation_id="patch_admin_vacantes_id_estado",
)
def moderar(id: int, datos: CambioEstado, actual: Administrador, db: Db) -> VacanteDetalle:
    """Suspender avisa al reclutador y a los postulados. Reactivar la deja «publicada»."""
    vacante = servicio_vacantes.vacante_por_id(db, id)
    if vacante is None:
        raise ApiError(404, "no_encontrado", "La vacante no existe.")
    motivo = datos.motivo.strip() if datos.motivo is not None else None
    campos: dict[str, str] = {}
    if datos.estado not in ("suspendida", "publicada"):
        campos["estado"] = "Elige suspendida o publicada."
    if datos.estado == "suspendida" and not motivo:
        campos["motivo"] = "Escribe el motivo de la suspensión."
    elif motivo is not None and len(motivo) > 255:
        campos["motivo"] = "Debe tener máximo 255 caracteres."
    lanzar_si_hay_campos(campos)
    if (datos.estado == "suspendida" and vacante.estado not in ("publicada", "pausada")) or (
        datos.estado == "publicada" and vacante.estado != "suspendida"
    ):
        raise ApiError(
            409,
            "transicion_invalida",
            "Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida.",
        )

    anterior = vacante.estado
    if datos.estado == "suspendida":
        suspender_vacante(db, vacante, motivo, avisar_reclutador=True)
    else:
        vacante.estado = "publicada"
        vacante.motivo_estado = None
        vacante.actualizado_en = datetime.now(UTC)
        if vacante.publicada_en is None:
            vacante.publicada_en = vacante.actualizado_en
    bitacora.registrar(
        db,
        actual.id,
        "suspender" if datos.estado == "suspendida" else "reactivar",
        "vacante",
        vacante.id,
        {"estado": anterior},
        {"estado": vacante.estado, "motivo": vacante.motivo_estado},
    )
    db.flush()
    if vacante.estado == "publicada":
        motor.recalcular_vacante(db, vacante)
    return servicio_vacantes.detalle_de(db, vacante, ver_todo=True)
