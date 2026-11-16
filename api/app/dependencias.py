"""Dependencias de FastAPI: sesión, usuario autenticado y rol (sección 1 del contrato)."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import obtener_db
from app.errores import ApiError
from app.modelos import Rol, Usuario
from app.seguridad import leer_token

Db = Annotated[Session, Depends(obtener_db)]

_esquema = HTTPBearer(auto_error=False, description="JWT que devuelve POST /auth/login.")

NO_AUTENTICADO = ApiError(401, "no_autenticado", "Tu sesión no es válida. Inicia sesión de nuevo.")


class UsuarioActual:
    """Usuario de la sesión con su rol en texto."""

    def __init__(self, usuario: Usuario, rol: str) -> None:
        self.usuario = usuario
        self.rol = rol

    @property
    def id(self) -> int:
        return self.usuario.id


def usuario_actual(
    db: Db,
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_esquema)] = None,
) -> UsuarioActual:
    """401 sin token válido; 423 si la cuenta se suspendió o se dio de baja después de emitirlo."""
    if credenciales is None:
        raise ApiError(401, "no_autenticado", "Tu sesión no es válida. Inicia sesión de nuevo.")
    carga = leer_token(credenciales.credentials)
    if carga is None:
        raise ApiError(401, "no_autenticado", "Tu sesión no es válida. Inicia sesión de nuevo.")
    fila = db.execute(
        select(Usuario, Rol.nombre)
        .join(Rol, Rol.id == Usuario.rol_id)
        .where(Usuario.id == int(carga["sub"]))
    ).first()
    if fila is None:
        raise ApiError(401, "no_autenticado", "Tu sesión no es válida. Inicia sesión de nuevo.")
    usuario, rol = fila
    if usuario.estado != "activo":
        raise ApiError(423, "cuenta_suspendida", "Tu cuenta está suspendida.")
    return UsuarioActual(usuario, rol)


SesionActual = Annotated[UsuarioActual, Depends(usuario_actual)]


def exigir_roles(*roles: str) -> Callable[[UsuarioActual], UsuarioActual]:
    """Dependencia que responde 403 `sin_permiso` si el rol del usuario no está en `roles`."""

    def verificar(actual: SesionActual) -> UsuarioActual:
        if actual.rol not in roles:
            raise ApiError(
                403, "sin_permiso", "El rol del usuario no tiene acceso a este endpoint."
            )
        return actual

    return verificar
