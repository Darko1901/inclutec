from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Body, Depends, Response, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.dependencias import Db, SesionActual
from app.errores import ApiError
from app.esquemas.auth import (
    CambioContrasena,
    DatosEmpresaRegistro,
    DatosReclutador,
    Login,
    Logout,
    Mensaje,
    RegistroCandidato,
    RegistroReclutador,
    Restablecimiento,
    Sesion,
    SolicitudCodigo,
    Usuario,
    VerificacionCodigo,
)
from app.modelos import (
    Candidato,
    Dispositivo,
    Empresa,
    Municipio,
    Reclutador,
    Rol,
    Sector,
    TamanoEmpresa,
)
from app.modelos import Usuario as UsuarioTabla
from app.seguridad import crear_token, hashear_contrasena, verificar_contrasena
from app.servicios import recuperacion
from app.servicios.completitud import recalcular_completitud
from app.servicios.correo import Enviador, obtener_enviador, texto_codigo_recuperacion
from app.servicios.limite_intentos import LimiteIntentos
from app.servicios.sesion import usuario_de_sesion
from app.validaciones import (
    LONGITUD_MAX_CONTRASENA,
    LONGITUD_MIN_CONTRASENA,
    MENSAJE_AVISO,
    MENSAJE_CONTRASENA,
    MENSAJE_CORREO,
    MENSAJE_RFC,
    MENSAJE_TELEFONO,
    es_codigo_valido,
    es_contrasena_de_login,
    es_contrasena_valida,
    es_correo_valido,
    es_rfc_valido,
    es_telefono_valido,
    existe,
    lanzar_si_hay_campos,
    normalizar_correo,
    texto_valido,
)

router = APIRouter(prefix="/auth", tags=["Autenticación y cuenta"])

_config = obtener_configuracion()
limite_login = LimiteIntentos(_config.login_max_intentos, _config.login_bloqueo_segundos)

# Hash de una contraseña inexistente: se compara aunque el correo no exista, para que el tiempo
# de respuesta no delate qué correos están registrados.
_HASH_FALSO = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5eOqkVhdSZcLhLoSLUmM7z7lQh0q.o6"

MENSAJE_CODIGO = "Escribe los 6 dígitos del código."


def _sesion(db: Session, usuario: UsuarioTabla, rol: str) -> Sesion:
    token, expira = crear_token(usuario.id, rol)
    return Sesion(access_token=token, expira_en=expira, usuario=usuario_de_sesion(db, usuario, rol))


# --- Sesión -------------------------------------------------------------------------------------


@router.post(
    "/login", response_model=Sesion, summary="Iniciar sesión", operation_id="post_auth_login"
)
def iniciar_sesion(datos: Login, db: Db) -> Sesion:
    campos: dict[str, str] = {}
    if not es_correo_valido(datos.correo):
        campos["correo"] = MENSAJE_CORREO
    if not es_contrasena_de_login(datos.contrasena):
        campos["contrasena"] = (
            f"Debe tener de {LONGITUD_MIN_CONTRASENA} a {LONGITUD_MAX_CONTRASENA} caracteres."
        )
    lanzar_si_hay_campos(campos)

    correo = normalizar_correo(datos.correo)
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
    return _sesion(db, usuario, rol)


@router.get(
    "/me", response_model=Usuario, summary="Usuario de la sesión", operation_id="get_auth_me"
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


# --- Registro -----------------------------------------------------------------------------------


def _correo_duplicado() -> ApiError:
    mensaje = "Ese correo ya está registrado."
    return ApiError(409, "correo_duplicado", mensaje, {"correo": mensaje})


def _crear_usuario(
    db: Session,
    rol: str,
    correo: str,
    contrasena: str,
    nombre: str,
    apellidos: str,
    telefono: str,
) -> UsuarioTabla:
    ahora = datetime.now(UTC)
    usuario = UsuarioTabla(
        rol_id=db.scalar(select(Rol.id).where(Rol.nombre == rol)),
        correo=correo,
        contrasena_hash=hashear_contrasena(contrasena),
        nombre=nombre.strip(),
        apellidos=apellidos.strip(),
        telefono=telefono,
        acepto_aviso_en=ahora,
        ultimo_acceso_en=ahora,
    )
    db.add(usuario)
    return usuario


@router.post(
    "/registro/candidato",
    response_model=Sesion,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar candidato",
    operation_id="post_auth_registro_candidato",
)
def registrar_candidato(datos: RegistroCandidato, db: Db) -> Sesion:
    campos: dict[str, str] = {}
    if not texto_valido(datos.nombre, 80):
        campos["nombre"] = "Escribe tu nombre (máximo 80 caracteres)."
    if not texto_valido(datos.apellidos, 120):
        campos["apellidos"] = "Escribe tus apellidos (máximo 120 caracteres)."
    if not es_correo_valido(datos.correo):
        campos["correo"] = MENSAJE_CORREO
    if not es_telefono_valido(datos.telefono):
        campos["telefono"] = MENSAJE_TELEFONO
    if not existe(db, Municipio, datos.municipio_id):
        campos["municipio_id"] = "Elige tu municipio."
    if not es_contrasena_valida(datos.contrasena):
        campos["contrasena"] = MENSAJE_CONTRASENA
    if datos.acepta_aviso is not True:
        campos["acepta_aviso"] = MENSAJE_AVISO
    lanzar_si_hay_campos(campos)

    correo = normalizar_correo(datos.correo)
    if db.scalar(select(UsuarioTabla.id).where(UsuarioTabla.correo == correo)) is not None:
        raise _correo_duplicado()

    try:
        usuario = _crear_usuario(
            db, "candidato", correo, datos.contrasena, datos.nombre, datos.apellidos, datos.telefono
        )
        db.flush()
        db.add(
            Candidato(
                usuario_id=usuario.id,
                municipio_id=datos.municipio_id,
                consentimiento_sensibles_en=(
                    datetime.now(UTC) if datos.consentimiento_sensibles is True else None
                ),
            )
        )
        db.flush()
    except IntegrityError as error:
        db.rollback()
        raise _correo_duplicado() from error
    recalcular_completitud(db, usuario.id)
    return _sesion(db, usuario, "candidato")


@router.post(
    "/registro/reclutador",
    response_model=Sesion,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar reclutador y empresa",
    operation_id="post_auth_registro_reclutador",
)
def registrar_reclutador(datos: RegistroReclutador, db: Db) -> Sesion:
    reclutador = datos.reclutador or DatosReclutador()
    empresa = datos.empresa or DatosEmpresaRegistro()
    campos: dict[str, str] = {}
    if not texto_valido(reclutador.nombre, 80):
        campos["reclutador.nombre"] = "Escribe tu nombre."
    if not texto_valido(reclutador.apellidos, 120):
        campos["reclutador.apellidos"] = "Escribe tus apellidos."
    if not texto_valido(reclutador.puesto, 100):
        campos["reclutador.puesto"] = "Escribe tu puesto."
    if not es_correo_valido(reclutador.correo):
        campos["reclutador.correo"] = MENSAJE_CORREO
    if not es_telefono_valido(reclutador.telefono):
        campos["reclutador.telefono"] = MENSAJE_TELEFONO
    if not es_contrasena_valida(reclutador.contrasena):
        campos["reclutador.contrasena"] = MENSAJE_CONTRASENA
    if not texto_valido(empresa.razon_social, 200):
        campos["empresa.razon_social"] = "Escribe la razón social."
    if not texto_valido(empresa.nombre_comercial, 150):
        campos["empresa.nombre_comercial"] = "Escribe el nombre comercial."
    if not es_rfc_valido(empresa.rfc):
        campos["empresa.rfc"] = MENSAJE_RFC
    if not existe(db, Sector, empresa.sector_id):
        campos["empresa.sector_id"] = "Elige un sector."
    if not existe(db, TamanoEmpresa, empresa.tamano_empresa_id):
        campos["empresa.tamano_empresa_id"] = "Elige el tamaño de la empresa."
    if not existe(db, Municipio, empresa.municipio_id):
        campos["empresa.municipio_id"] = "Elige el municipio."
    if datos.acepta_aviso is not True:
        campos["acepta_aviso"] = MENSAJE_AVISO
    lanzar_si_hay_campos(campos)

    correo = normalizar_correo(reclutador.correo)
    if db.scalar(select(UsuarioTabla.id).where(UsuarioTabla.correo == correo)) is not None:
        raise _correo_duplicado()
    if db.scalar(select(Empresa.id).where(Empresa.rfc == empresa.rfc)) is not None:
        raise _rfc_duplicado()

    try:
        nueva = Empresa(
            razon_social=empresa.razon_social.strip(),
            nombre_comercial=empresa.nombre_comercial.strip(),
            rfc=empresa.rfc,
            sector_id=empresa.sector_id,
            tamano_empresa_id=empresa.tamano_empresa_id,
            municipio_id=empresa.municipio_id,
            estado="pendiente",
        )
        db.add(nueva)
        usuario = _crear_usuario(
            db,
            "reclutador",
            correo,
            reclutador.contrasena,
            reclutador.nombre,
            reclutador.apellidos,
            reclutador.telefono,
        )
        db.flush()
        db.add(
            Reclutador(usuario_id=usuario.id, empresa_id=nueva.id, puesto=reclutador.puesto.strip())
        )
        db.flush()
    except IntegrityError as error:
        db.rollback()
        # La restricción violada dice si fue el correo o el RFC.
        if "rfc" in str(error.orig):
            raise _rfc_duplicado() from error
        raise _correo_duplicado() from error
    return _sesion(db, usuario, "reclutador")


def _rfc_duplicado() -> ApiError:
    mensaje = "Otra empresa ya registró ese RFC."
    return ApiError(409, "rfc_duplicado", mensaje, {"empresa.rfc": mensaje})


# --- Contraseña ---------------------------------------------------------------------------------


@router.post(
    "/password/solicitar",
    response_model=Mensaje,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Solicitar código de recuperación",
    operation_id="post_auth_password_solicitar",
)
def solicitar_codigo(
    datos: SolicitudCodigo,
    db: Db,
    tareas: BackgroundTasks,
    enviar: Annotated[Enviador, Depends(obtener_enviador)],
) -> Mensaje:
    if not es_correo_valido(datos.correo):
        lanzar_si_hay_campos({"correo": MENSAJE_CORREO})
    creado = recuperacion.solicitar_codigo(db, datos.correo)
    if creado is not None:
        correo, codigo = creado
        asunto, texto = texto_codigo_recuperacion(codigo, _config.codigo_vigencia_segundos // 60)
        # En segundo plano: el correo nunca retrasa la respuesta.
        tareas.add_task(enviar, correo, asunto, texto)
    return Mensaje(detail=recuperacion.MENSAJE_SOLICITUD)


def _validar_correo_y_codigo(correo: object, codigo: object) -> dict[str, str]:
    campos: dict[str, str] = {}
    if not es_correo_valido(correo):
        campos["correo"] = MENSAJE_CORREO
    if not es_codigo_valido(codigo):
        campos["codigo"] = MENSAJE_CODIGO
    return campos


@router.post(
    "/password/verificar",
    response_model=Mensaje,
    summary="Verificar código",
    operation_id="post_auth_password_verificar",
)
def verificar_codigo(datos: VerificacionCodigo, db: Db) -> Mensaje:
    lanzar_si_hay_campos(_validar_correo_y_codigo(datos.correo, datos.codigo))
    recuperacion.comprobar_codigo(db, datos.correo, datos.codigo)
    return Mensaje(detail="Código correcto.")


@router.post(
    "/password/restablecer",
    response_model=Mensaje,
    summary="Restablecer contraseña",
    operation_id="post_auth_password_restablecer",
)
def restablecer_contrasena(datos: Restablecimiento, db: Db) -> Mensaje:
    campos = _validar_correo_y_codigo(datos.correo, datos.codigo)
    if not es_contrasena_valida(datos.contrasena):
        campos["contrasena"] = MENSAJE_CONTRASENA
    lanzar_si_hay_campos(campos)

    usuario = recuperacion.comprobar_codigo(db, datos.correo, datos.codigo)
    # Con un código correcto la cuenta siempre existe (los correos inexistentes nunca llegan aquí).
    usuario.contrasena_hash = hashear_contrasena(datos.contrasena)
    usuario.actualizado_en = datetime.now(UTC)
    recuperacion.consumir_codigo(db, usuario)
    limite_login.limpiar(normalizar_correo(datos.correo))
    return Mensaje(detail="Tu contraseña se actualizó. Ya puedes iniciar sesión.")


@router.put(
    "/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cambiar contraseña",
    operation_id="put_auth_password",
)
def cambiar_contrasena(datos: CambioContrasena, actual: SesionActual) -> Response:
    campos: dict[str, str] = {}
    if not isinstance(datos.contrasena_actual, str) or not datos.contrasena_actual:
        campos["contrasena_actual"] = "Escribe tu contraseña actual."
    if not es_contrasena_valida(datos.contrasena_nueva):
        campos["contrasena_nueva"] = MENSAJE_CONTRASENA
    lanzar_si_hay_campos(campos)

    if not verificar_contrasena(datos.contrasena_actual, actual.usuario.contrasena_hash):
        raise ApiError(400, "contrasena_incorrecta", "La contraseña actual no coincide.")
    actual.usuario.contrasena_hash = hashear_contrasena(datos.contrasena_nueva)
    actual.usuario.actualizado_en = datetime.now(UTC)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
