from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.esquemas.admin import (
    CambioEstado,
    EmpresaAdmin,
    EmpresaAdminDetalle,
    EmpresaAdminEntrada,
    ResultadoEstadoEmpresa,
    Validacion,
)
from app.esquemas.comunes import Pagina
from app.esquemas.empresa import EmpresaPropia
from app.paginacion import IdPequeno, PaginacionPanel
from app.servicios import admin_empresas as servicio
from app.servicios.empresas import empresa_propia_de
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/admin/empresas", tags=["Administración: empresas"])

Administrador = Annotated[UsuarioActual, Depends(exigir_roles("administrador"))]


@router.get(
    "",
    response_model=Pagina[EmpresaAdmin],
    summary="Listar empresas",
    operation_id="get_admin_empresas",
)
def listar(
    _: Administrador,
    db: Db,
    pagina: PaginacionPanel,
    q: Annotated[
        str | None, Query(description="Busca en razón social, nombre comercial o RFC.")
    ] = None,
    estado: Annotated[
        str | None, Query(description="pendiente, validada, rechazada o suspendida.")
    ] = None,
    sector_id: Annotated[IdPequeno | None, Query(description="Sector.")] = None,
) -> Pagina[EmpresaAdmin]:
    """Las pendientes primero, de la más antigua a la más reciente; después las demás por nombre."""
    if estado and estado not in servicio.ESTADOS:
        lanzar_si_hay_campos({"estado": "Elige pendiente, validada, rechazada o suspendida."})
    items, total = servicio.listar(db, q, estado, sector_id, pagina.desplazamiento, pagina.size)
    return Pagina[EmpresaAdmin](items=items, total=total, page=pagina.page, size=pagina.size)


@router.get(
    "/{id}",
    response_model=EmpresaAdminDetalle,
    summary="Detalle de empresa",
    operation_id="get_admin_empresas_id",
)
def detalle(id: int, _: Administrador, db: Db) -> EmpresaAdminDetalle:
    empresa = servicio.empresa_por_id(db, id)
    return EmpresaAdminDetalle(
        empresa=empresa_propia_de(db, empresa, None), **servicio.detalle(db, empresa)
    )


@router.post(
    "",
    response_model=EmpresaPropia,
    status_code=status.HTTP_201_CREATED,
    summary="Crear empresa",
    operation_id="post_admin_empresas",
)
def crear(datos: EmpresaAdminEntrada, actual: Administrador, db: Db) -> EmpresaPropia:
    """Se crea en estado «validada»."""
    limpios = servicio.validar_entrada(db, datos)
    return empresa_propia_de(db, servicio.crear(db, limpios, actual.id), None)


@router.put(
    "/{id}",
    response_model=EmpresaPropia,
    summary="Editar empresa",
    operation_id="put_admin_empresas_id",
)
def editar(id: int, datos: EmpresaAdminEntrada, actual: Administrador, db: Db) -> EmpresaPropia:
    """El administrador sí puede corregir razón social y RFC de una empresa validada."""
    empresa = servicio.empresa_por_id(db, id)
    limpios = servicio.validar_entrada(db, datos, empresa)
    return empresa_propia_de(db, servicio.editar(db, empresa, limpios, actual.id), None)


@router.patch(
    "/{id}/validacion",
    response_model=EmpresaPropia,
    summary="Validar o rechazar",
    operation_id="patch_admin_empresas_id_validacion",
)
def validar(id: int, datos: Validacion, actual: Administrador, db: Db) -> EmpresaPropia:
    """Solo para empresas «pendiente»; registra la bitácora y avisa al reclutador."""
    empresa = servicio.empresa_por_id(db, id)
    return empresa_propia_de(
        db, servicio.validar(db, empresa, datos.decision, datos.motivo, actual.id), None
    )


@router.patch(
    "/{id}/estado",
    response_model=ResultadoEstadoEmpresa,
    summary="Suspender o reactivar",
    operation_id="patch_admin_empresas_id_estado",
)
def cambiar_estado(
    id: int, datos: CambioEstado, actual: Administrador, db: Db
) -> ResultadoEstadoEmpresa:
    """Al suspender, sus vacantes publicadas pasan a «suspendida» y se avisa a los postulados."""
    empresa = servicio.empresa_por_id(db, id)
    empresa, suspendidas, avisados = servicio.cambiar_estado(
        db, empresa, datos.estado, datos.motivo, actual.id
    )
    return ResultadoEstadoEmpresa(
        empresa=empresa_propia_de(db, empresa, None),
        vacantes_suspendidas=suspendidas,
        postulados_notificados=avisados,
    )
