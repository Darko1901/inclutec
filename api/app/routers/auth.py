from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Body, Response, status
from sqlalchemy import delete, select

from app.config import obtener_configuracion
from app.dependencias import Db, SesionActual
from app.errores import ApiError
from app.esquemas.auth import Login, Logout, Sesion, Usuario
from app.modelos import Dispositivo, Rol
from app.modelos import Usuario as UsuarioTabla
from app.seguridad import crear_token, verificar_contrasena
from app.servicios.limite_intentos import LimiteIntentos
from app.servicios.sesion import usuario_de_sesion

router = APIRouter(prefix="/auth", tags=["Autenticación y cuenta"])

_config = obtener_configuracion()
limite_login = LimiteIntentos(_config.login_max_intentos, _config.login_bloqueo_segundos)

# Hash de una contraseña inexistente: se compara aunque el correo no exista, para que el tiempo
# de respuesta no delate qué correos están registrados.
_HASH_FALSO = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5eOqkVhdSZcLhLoSLUmM7z7lQh0q.o6"


@router.post(
    "/login",
    response_model=Sesion,
    summary="Iniciar sesión",
    operation_id="post_auth_login",
)
def iniciar_sesion(datos: Login, db: Db) -> Sesion:
    correo = datos.correo.lower()
    espera = limite_login.segundos_restantes(correo)
    if espera > 0:
        raise ApiError(
            429,
            "demasiados_intentos",
            "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.",
            encabezados={"Retry-After": str(espera)},
        )

    fila = db.execute(
        select(UsuarioTabla, Rol.nombre)
        .join(Rol, Rol.id == UsuarioTabla.rol_id)
        .where(UsuarioTabla.correo == correo)
    ).first()
    hash_guardado = fila[0].contrasena_hash if fila else _HASH_FALSO
    correcto = verificar_contrasena(datos.contrasena, hash_guardado)
    if fila is None or not correcto:
        limite_login.registrar_fallo(correo)
        raise ApiError(401, "credenciales_invalidas", "Correo o contraseña incorrectos.")

    limite_login.limpiar(correo)
    usuario, rol = fila
    if usuario.estado != "activo":
        raise ApiError(423, "cuenta_suspendida", "Tu cuenta está suspendida.")

    usuario.ultimo_acceso_en = datetime.now(UTC)
    token, expira = crear_token(usuario.id, rol)
    return Sesion(
        access_token=token,
        expira_en=expira,
        usuario=usuario_de_sesion(db, usuario, rol),
    )


@router.get(
    "/me",
    response_model=Usuario,
    summary="Usuario de la sesión",
    operation_id="get_auth_me",
)
def mi_usuario(actual: SesionActual, db: Db) -> Usuario:
    return usuario_de_sesion(db, actual.usuario, actual.rol)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cerrar sesión",
    operation_id="post_auth_logout",
)
def cerrar_sesion(
    actual: SesionActual,
    db: Db,
    datos: Annotated[Logout | None, Body()] = None,
) -> Response:
    """El JWT no se revoca (expira solo). Si llega el token push, se da de baja ese dispositivo."""
    if datos is not None and datos.expo_push_token:
        db.execute(
            delete(Dispositivo).where(
                Dispositivo.expo_push_token == datos.expo_push_token,
                Dispositivo.usuario_id == actual.id,
            )
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
