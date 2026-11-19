from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.esquemas.admin import CambioEstado, UsuarioAdmin, UsuarioAdminDetalle, UsuarioAdminEntrada
from app.esquemas.comunes import Pagina
from app.paginacion import PaginacionPanel
from app.servicios import admin_usuarios as servicio
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/admin/usuarios", tags=["Administración: usuarios"])

Administrador = Annotated[UsuarioActual, Depends(exigir_roles("administrador"))]


@router.get(
    "",
    response_model=Pagina[UsuarioAdmin],
    summary="Listar usuarios",
    operation_id="get_admin_usuarios",
)
def listar(
    _: Administrador,
    db: Db,
    pagina: PaginacionPanel,
    q: Annotated[str | None, Query(description="Busca en nombre, apellidos o correo.")] = None,
    rol: Annotated[str | None, Query(description="candidato, reclutador o administrador.")] = None,
    estado: Annotated[str | None, Query(description="activo, suspendido o eliminado.")] = None,
) -> Pagina[UsuarioAdmin]:
    """Más recientes primero."""
    campos: dict[str, str] = {}
    if rol and rol not in servicio.ROLES:
        campos["rol"] = "Elige candidato, reclutador o administrador."
    if estado and estado not in servicio.ESTADOS:
        campos["estado"] = "Elige activo, suspendido o eliminado."
    lanzar_si_hay_campos(campos)
    items, total = servicio.listar(db, q, rol, estado, pagina.desplazamiento, pagina.size)
    return Pagina[UsuarioAdmin](items=items, total=total, page=pagina.page, size=pagina.size)


@router.get(
    "/{id}",
    response_model=UsuarioAdminDetalle,
    summary="Detalle de usuario",
    operation_id="get_admin_usuarios_id",
)
def detalle(id: int, _: Administrador, db: Db) -> UsuarioAdminDetalle:
    """Nunca incluye las necesidades de ajuste del candidato."""
    return servicio.detalle(db, servicio.usuario_por_id(db, id))


@router.post(
    "",
    response_model=UsuarioAdmin,
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario",
    operation_id="post_admin_usuarios",
)
def crear(datos: UsuarioAdminEntrada, _: Administrador, db: Db) -> UsuarioAdmin:
    """La contraseña es obligatoria; un candidato creado aquí empieza sin consentimiento."""
    limpios = servicio.validar(db, datos, al_crear=True)
    return servicio.vista(db, servicio.crear(db, limpios, datos.contrasena))


@router.put(
    "/{id}",
    response_model=UsuarioAdmin,
    summary="Editar usuario",
    operation_id="put_admin_usuarios_id",
)
def editar(id: int, datos: UsuarioAdminEntrada, _: Administrador, db: Db) -> UsuarioAdmin:
    """Sin contraseña. El rol cambia solo si no tiene postulaciones ni vacantes."""
    usuario = servicio.usuario_por_id(db, id)
    limpios = servicio.validar(db, datos, al_crear=False)
    return servicio.vista(db, servicio.editar(db, usuario, limpios))


@router.patch(
    "/{id}/estado",
    response_model=UsuarioAdmin,
    summary="Suspender, reactivar o dar de baja",
    operation_id="patch_admin_usuarios_id_estado",
)
def cambiar_estado(id: int, datos: CambioEstado, actual: Administrador, db: Db) -> UsuarioAdmin:
    """Nunca se borra físicamente. Un usuario suspendido no puede iniciar sesión (423)."""
    usuario = servicio.usuario_por_id(db, id)
    return servicio.vista(
        db, servicio.cambiar_estado(db, usuario, actual.id, datos.estado, datos.motivo)
    )
