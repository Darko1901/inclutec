from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as insertar

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.comunes import Pagina
from app.esquemas.notificacion import (
    Dispositivo,
    Notificacion,
    PreferenciaNotificacion,
    PreferenciaSalida,
    Referencia,
    ResumenNotificaciones,
)
from app.modelos import Dispositivo as DispositivoTabla
from app.modelos import Notificacion as NotificacionTabla
from app.modelos import PreferenciaNotificacion as PreferenciaTabla
from app.paginacion import PaginacionConsulta
from app.servicios.notificaciones import TIPOS_POR_ROL
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])
router_dispositivos = APIRouter(prefix="/dispositivos", tags=["Notificaciones"])

Usuario = Annotated[UsuarioActual, Depends(exigir_roles("candidato", "reclutador"))]


def _vista(fila: NotificacionTabla) -> Notificacion:
    referencia = (
        Referencia(tipo=fila.referencia_tipo, id=fila.referencia_id)
        if fila.referencia_tipo is not None and fila.referencia_id is not None
        else None
    )
    return Notificacion(
        id=fila.id,
        tipo=fila.tipo,
        titulo=fila.titulo,
        mensaje=fila.mensaje,
        referencia=referencia,
        leida=fila.leida,
        creado_en=fila.creado_en,
    )


@router_dispositivos.post(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Registrar dispositivo para push",
    operation_id="post_dispositivos",
)
def registrar_dispositivo(datos: Dispositivo, actual: Usuario, db: Db) -> Response:
    """Si el token ya existe, se reasigna al usuario actual."""
    campos: dict[str, str] = {}
    if not datos.expo_push_token or len(datos.expo_push_token) > 255:
        campos["expo_push_token"] = "El token del dispositivo no es válido."
    if datos.plataforma not in ("android", "ios"):
        campos["plataforma"] = "La plataforma debe ser android o ios."
    lanzar_si_hay_campos(campos)

    # Un solo INSERT … ON CONFLICT: si la app registra el mismo token dos veces a la vez (al
    # iniciar sesión y al abrirse), la segunda reasigna en lugar de chocar con la llave única.
    db.execute(
        insertar(DispositivoTabla)
        .values(
            usuario_id=actual.id,
            expo_push_token=datos.expo_push_token,
            plataforma=datos.plataforma,
        )
        .on_conflict_do_update(
            index_elements=["expo_push_token"],
            set_={"usuario_id": actual.id, "plataforma": datos.plataforma},
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "",
    response_model=Pagina[Notificacion],
    summary="Mis notificaciones",
    operation_id="get_notificaciones",
)
def listar(
    actual: Usuario,
    db: Db,
    pagina: PaginacionConsulta,
    solo_no_leidas: Annotated[
        bool, Query(description="true para traer solo las no leídas.")
    ] = False,
) -> Pagina[Notificacion]:
    """Más recientes primero."""
    filtros = [NotificacionTabla.usuario_id == actual.id]
    if solo_no_leidas:
        filtros.append(NotificacionTabla.leida.is_(False))
    total = db.scalar(select(func.count()).select_from(NotificacionTabla).where(*filtros)) or 0
    filas = db.scalars(
        select(NotificacionTabla)
        .where(*filtros)
        .order_by(NotificacionTabla.creado_en.desc(), NotificacionTabla.id.desc())
        .limit(pagina.size)
        .offset(pagina.desplazamiento)
    )
    return Pagina[Notificacion](
        items=[_vista(f) for f in filas], total=total, page=pagina.page, size=pagina.size
    )


@router.get(
    "/resumen",
    response_model=ResumenNotificaciones,
    summary="Contador de no leídas",
    operation_id="get_notificaciones_resumen",
)
def resumen(actual: Usuario, db: Db) -> ResumenNotificaciones:
    """Para el número de la barra de navegación."""
    cuantas = db.scalar(
        select(func.count()).where(
            NotificacionTabla.usuario_id == actual.id, NotificacionTabla.leida.is_(False)
        )
    )
    return ResumenNotificaciones(no_leidas=cuantas or 0)


@router.patch(
    "/leidas",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar todas como leídas",
    operation_id="patch_notificaciones_leidas",
)
def marcar_todas(actual: Usuario, db: Db) -> Response:
    db.execute(
        update(NotificacionTabla)
        .where(NotificacionTabla.usuario_id == actual.id, NotificacionTabla.leida.is_(False))
        .values(leida=True)
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _preferencias_de(db: Db, actual: UsuarioActual) -> list[PreferenciaSalida]:
    """Una fila por cada tipo que aplica al rol; sin cambios guardados, todo viene en true."""
    guardadas = {
        f.tipo: f
        for f in db.scalars(
            select(PreferenciaTabla).where(PreferenciaTabla.usuario_id == actual.id)
        )
    }
    return [
        PreferenciaSalida(
            tipo=tipo,
            push=guardadas[tipo].push if tipo in guardadas else True,
            correo=guardadas[tipo].correo if tipo in guardadas else True,
        )
        for tipo in TIPOS_POR_ROL[actual.rol]
    ]


@router.get(
    "/preferencias",
    response_model=list[PreferenciaSalida],
    summary="Preferencias de canal",
    operation_id="get_notificaciones_preferencias",
)
def obtener_preferencias(actual: Usuario, db: Db) -> list[PreferenciaSalida]:
    return _preferencias_de(db, actual)


@router.put(
    "/preferencias",
    response_model=list[PreferenciaSalida],
    summary="Guardar preferencias de canal",
    operation_id="put_notificaciones_preferencias",
)
def guardar_preferencias(
    datos: list[PreferenciaNotificacion], actual: Usuario, db: Db
) -> list[PreferenciaSalida]:
    """Recibe la lista completa; los tipos que falten conservan su valor.

    El aviso dentro de la app siempre se genera, sin importar estas preferencias.
    """
    validos = TIPOS_POR_ROL[actual.rol]
    invalido = any(p.tipo not in validos or p.push is None or p.correo is None for p in datos)
    if invalido or len({p.tipo for p in datos}) != len(datos):
        lanzar_si_hay_campos(
            {"preferencias": "Hay tipos de aviso que no existen o valores que no son sí o no."}
        )
    for p in datos:
        db.execute(
            delete(PreferenciaTabla).where(
                PreferenciaTabla.usuario_id == actual.id, PreferenciaTabla.tipo == p.tipo
            )
        )
        db.add(PreferenciaTabla(usuario_id=actual.id, tipo=p.tipo, push=p.push, correo=p.correo))
    db.flush()
    return _preferencias_de(db, actual)


@router.patch(
    "/{id}/leida",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar una como leída",
    operation_id="patch_notificaciones_id_leida",
)
def marcar_una(id: int, actual: Usuario, db: Db) -> Response:
    fila = db.get(NotificacionTabla, id) if 1 <= id <= 2**63 - 1 else None
    if fila is None or fila.usuario_id != actual.id:
        raise ApiError(404, "no_encontrado", "La notificación no existe.")
    fila.leida = True
    return Response(status_code=status.HTTP_204_NO_CONTENT)
