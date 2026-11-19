from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.esquemas.comunes import Pagina
from app.esquemas.reporte import (
    ReporteAdmin,
    ReporteAdminDetalle,
    ReporteCreado,
    ReporteEntrada,
    SeguimientoReporte,
)
from app.paginacion import IdGrande, IdPequeno, PaginacionPanel
from app.servicios import reportes as servicio
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/reportes", tags=["Reportes"])
router_admin = APIRouter(prefix="/admin/reportes", tags=["Administración: reportes"])

Usuario = Annotated[UsuarioActual, Depends(exigir_roles("candidato", "reclutador"))]
Administrador = Annotated[UsuarioActual, Depends(exigir_roles("administrador"))]


@router.post(
    "",
    response_model=ReporteCreado,
    status_code=status.HTTP_201_CREATED,
    summary="Reportar vacante, empresa o candidato",
    operation_id="post_reportes",
)
def reportar(datos: ReporteEntrada, actual: Usuario, db: Db) -> ReporteCreado:
    """El candidato reporta vacantes o empresas; el reclutador, candidatos que se le postularon."""
    reporte = servicio.crear(db, actual.id, actual.rol, datos)
    return ReporteCreado(id=reporte.id, estado=reporte.estado, creado_en=reporte.creado_en)


@router_admin.get(
    "",
    response_model=Pagina[ReporteAdmin],
    summary="Bandeja de reportes",
    operation_id="get_admin_reportes",
)
def bandeja(
    _: Administrador,
    db: Db,
    pagina: PaginacionPanel,
    estado: Annotated[
        str | None, Query(description="abierto, en_revision, resuelto o descartado.")
    ] = None,
    tipo: Annotated[str | None, Query(description="vacante, empresa o candidato.")] = None,
    motivo_reporte_id: Annotated[IdPequeno | None, Query(description="Motivo.")] = None,
    vacante_id: Annotated[
        IdGrande | None, Query(description="Solo los reportes de esa vacante.")
    ] = None,
    empresa_id: Annotated[
        IdGrande | None, Query(description="Solo los reportes de esa empresa.")
    ] = None,
    candidato_id: Annotated[
        IdGrande | None, Query(description="Solo los reportes de ese candidato.")
    ] = None,
    orden: Annotated[
        str, Query(description="`antiguos` (por omisión) o `recientes`.")
    ] = "antiguos",
) -> Pagina[ReporteAdmin]:
    """Por omisión, los más antiguos primero."""
    campos: dict[str, str] = {}
    if estado and estado not in servicio.ESTADOS:
        campos["estado"] = "Elige abierto, en_revision, resuelto o descartado."
    if tipo and tipo not in servicio.TIPOS:
        campos["tipo"] = "Elige vacante, empresa o candidato."
    if orden not in servicio.ORDENES:
        campos["orden"] = "Elige antiguos o recientes."
    lanzar_si_hay_campos(campos)
    filtros = servicio.filtros_de_bandeja(
        estado, tipo, motivo_reporte_id, vacante_id, empresa_id, candidato_id
    )
    items, total = servicio.bandeja(db, filtros, orden, pagina.desplazamiento, pagina.size)
    return Pagina[ReporteAdmin](items=items, total=total, page=pagina.page, size=pagina.size)


@router_admin.get(
    "/{id}",
    response_model=ReporteAdminDetalle,
    summary="Detalle del reporte",
    operation_id="get_admin_reportes_id",
)
def detalle(id: int, _: Administrador, db: Db) -> ReporteAdminDetalle:
    return servicio.detalle(db, servicio.reporte_por_id(db, id))


@router_admin.patch(
    "/{id}",
    response_model=ReporteAdminDetalle,
    summary="Dar seguimiento al reporte",
    operation_id="patch_admin_reportes_id",
)
def seguimiento(
    id: int, datos: SeguimientoReporte, actual: Administrador, db: Db
) -> ReporteAdminDetalle:
    """Al cerrar exige resolución, registra el historial y avisa a quien reportó, sin detalles."""
    reporte = servicio.reporte_por_id(db, id)
    return servicio.seguimiento(
        db, reporte, actual.id, datos.estado, datos.comentario, datos.resolucion, datos.accion
    )
