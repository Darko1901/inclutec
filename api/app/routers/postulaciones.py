from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.comunes import Pagina
from app.esquemas.entrevista import Entrevista, ReservaEntrevista
from app.esquemas.postulacion import (
    CambioEstadoPostulacion,
    Observacion,
    ObservacionEntrada,
    PostulacionDetalle,
    PostulacionEntrada,
    PostulacionResumen,
    PostuladoDetalle,
    ResultadoCambioEstado,
)
from app.modelos import Postulacion
from app.paginacion import PaginacionConsulta
from app.servicios import entrevistas as servicio_entrevistas
from app.servicios import horarios as servicio_horarios
from app.servicios import postulaciones as servicio
from app.servicios import vacantes as servicio_vacantes
from app.servicios.reclutador import empresa_del_reclutador
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/postulaciones", tags=["Postulaciones"])

Candidata = Annotated[UsuarioActual, Depends(exigir_roles("candidato"))]
Reclutadora = Annotated[UsuarioActual, Depends(exigir_roles("reclutador"))]

ESTADOS_NUEVOS = ("en_revision", "entrevista", "aceptada", "no_seleccionada")


# --- Candidato ----------------------------------------------------------------------------------


@router.post(
    "",
    response_model=PostulacionDetalle,
    status_code=status.HTTP_201_CREATED,
    summary="Postularme",
    operation_id="post_postulaciones",
)
def postularme(datos: PostulacionEntrada, actual: Candidata, db: Db) -> PostulacionDetalle:
    """Crea la postulación en «postulada», registra el historial y avisa al reclutador."""
    campos: dict[str, str] = {}
    if datos.vacante_id is None:
        campos["vacante_id"] = "Indica la vacante."
    if datos.mensaje is not None and len(datos.mensaje) > servicio.MAX_MENSAJE:
        campos["mensaje"] = f"El mensaje puede tener hasta {servicio.MAX_MENSAJE} caracteres."
    if datos.compartir_ajustes is None:
        campos["compartir_ajustes"] = "Indica si compartes tus necesidades de ajuste."
    lanzar_si_hay_campos(campos)

    vacante = servicio_vacantes.vacante_por_id(db, datos.vacante_id)
    # Los borradores no son visibles para el candidato.
    if vacante is None or vacante.estado == "borrador":
        raise servicio_vacantes.no_encontrada()
    if servicio_vacantes.postulacion_de(db, actual.id, vacante.id) is not None:
        raise ApiError(409, "postulacion_duplicada", "Ya te postulaste a esta vacante.")
    if not servicio_vacantes.es_visible_para_candidato(db, vacante):
        raise ApiError(409, "vacante_no_disponible", "Esta vacante ya no está disponible.")
    faltantes = servicio.faltantes_para_postularse(db, actual.id)
    if faltantes:
        raise ApiError(
            422, "perfil_incompleto", "Completa tu perfil para poder postularte.", faltantes
        )

    postulacion = servicio.crear(db, actual.id, vacante, datos.mensaje, datos.compartir_ajustes)
    return servicio.detalle_para_candidato(db, postulacion)


@router.get(
    "/me",
    response_model=Pagina[PostulacionResumen],
    summary="Mis postulaciones",
    operation_id="get_postulaciones_me",
)
def mis_postulaciones(
    actual: Candidata,
    db: Db,
    pagina: PaginacionConsulta,
    estado: Annotated[str | None, Query(description="Un estado de postulación.")] = None,
    activas: Annotated[
        bool | None,
        Query(description="true: en curso; false: aceptada, no seleccionada o retirada."),
    ] = None,
) -> Pagina[PostulacionResumen]:
    """Más recientes primero."""
    if estado is not None and estado not in servicio.ESTADOS:
        lanzar_si_hay_campos({"estado": "Elige un estado de la lista."})

    filtros = [Postulacion.candidato_id == actual.id]
    if estado is not None:
        filtros.append(Postulacion.estado == estado)
    if activas is True:
        filtros.append(Postulacion.estado.in_(servicio.ESTADOS_ACTIVOS))
    elif activas is False:
        filtros.append(Postulacion.estado.not_in(servicio.ESTADOS_ACTIVOS))

    total = db.scalar(select(func.count()).select_from(Postulacion).where(*filtros)) or 0
    filas = db.scalars(
        select(Postulacion)
        .where(*filtros)
        .order_by(Postulacion.creado_en.desc(), Postulacion.id.desc())
        .limit(pagina.size)
        .offset(pagina.desplazamiento)
    )
    items = [servicio.resumen_de(db, p) for p in filas]
    return Pagina[PostulacionResumen](items=items, total=total, page=pagina.page, size=pagina.size)


@router.get(
    "/{id}",
    response_model=PostulacionDetalle,
    summary="Detalle de mi postulación",
    operation_id="get_postulaciones_id",
)
def detalle(id: int, actual: Candidata, db: Db) -> PostulacionDetalle:
    return servicio.detalle_para_candidato(db, servicio.postulacion_propia(db, actual.id, id))


@router.patch(
    "/{id}/retirar",
    response_model=PostulacionDetalle,
    summary="Retirar mi postulación",
    operation_id="patch_postulaciones_id_retirar",
)
def retirar(id: int, actual: Candidata, db: Db) -> PostulacionDetalle:
    """Si tenía una entrevista agendada, se cancela y el horario vuelve a quedar libre."""
    postulacion = servicio.postulacion_propia(db, actual.id, id)
    if postulacion.estado not in servicio.ESTADOS_ACTIVOS:
        raise ApiError(409, "transicion_invalida", "Esta postulación ya está finalizada.")
    servicio_entrevistas.retirar_postulacion(db, postulacion, actual.id)
    db.flush()
    return servicio.detalle_para_candidato(db, postulacion)


@router.post(
    "/{id}/entrevista",
    response_model=Entrevista,
    status_code=status.HTTP_201_CREATED,
    summary="Agendar entrevista",
    operation_id="post_postulaciones_id_entrevista",
)
def agendar_entrevista(id: int, datos: ReservaEntrevista, actual: Candidata, db: Db) -> Entrevista:
    """Toma el horario con bloqueo; avisa al reclutador y confirma por correo a ambos."""
    postulacion = servicio.postulacion_propia(db, actual.id, id)
    entrevista = servicio_horarios.reservar(db, postulacion, datos.horario_id)
    return servicio_entrevistas.vista_de(db, entrevista, para_candidato=True)


# --- Reclutador ---------------------------------------------------------------------------------


@router.get(
    "/{id}/candidato",
    response_model=PostuladoDetalle,
    summary="Detalle del postulado",
    operation_id="get_postulaciones_id_candidato",
)
def detalle_del_postulado(id: int, actual: Reclutadora, db: Db) -> PostuladoDetalle:
    """Una postulación «postulada» no cambia de estado sola al abrirla."""
    empresa = empresa_del_reclutador(db, actual)
    postulacion = servicio.postulacion_de_mi_empresa(db, empresa.id, id)
    return servicio.detalle_de_postulado(db, postulacion)


@router.patch(
    "/{id}/estado",
    response_model=ResultadoCambioEstado,
    summary="Cambiar estado de la postulación",
    operation_id="patch_postulaciones_id_estado",
)
def cambiar_estado(
    id: int, datos: CambioEstadoPostulacion, actual: Reclutadora, db: Db
) -> ResultadoCambioEstado:
    """Registra el historial y notifica al candidato por app, push y correo."""
    empresa = empresa_del_reclutador(db, actual)
    postulacion = servicio.postulacion_de_mi_empresa(db, empresa.id, id)
    campos: dict[str, str] = {}
    if datos.estado not in ESTADOS_NUEVOS:
        campos["estado"] = "Elige el estado al que pasa la postulación."
    if datos.mensaje is not None and len(datos.mensaje) > servicio.MAX_MENSAJE:
        campos["mensaje"] = f"El mensaje puede tener hasta {servicio.MAX_MENSAJE} caracteres."
    lanzar_si_hay_campos(campos)
    if datos.estado not in servicio.TRANSICIONES[postulacion.estado]:
        raise ApiError(
            409,
            "transicion_invalida",
            "Esa postulación no puede pasar a ese estado desde el que tiene ahora.",
        )
    return servicio.cambiar_estado(db, postulacion, datos.estado, datos.mensaje, actual.id)


@router.get(
    "/{id}/observaciones",
    response_model=list[Observacion],
    summary="Observaciones internas",
    operation_id="get_postulaciones_id_observaciones",
)
def observaciones(id: int, actual: Reclutadora, db: Db) -> list[Observacion]:
    empresa = empresa_del_reclutador(db, actual)
    postulacion = servicio.postulacion_de_mi_empresa(db, empresa.id, id)
    return servicio.listar_observaciones(db, postulacion.id)


@router.post(
    "/{id}/observaciones",
    response_model=Observacion,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar observación interna",
    operation_id="post_postulaciones_id_observaciones",
)
def agregar_observacion(
    id: int, datos: ObservacionEntrada, actual: Reclutadora, db: Db
) -> Observacion:
    empresa = empresa_del_reclutador(db, actual)
    postulacion = servicio.postulacion_de_mi_empresa(db, empresa.id, id)
    if not isinstance(datos.texto, str) or not datos.texto.strip():
        lanzar_si_hay_campos({"texto": "Escribe la observación."})
    if len(datos.texto) > servicio.MAX_OBSERVACION:
        lanzar_si_hay_campos(
            {"texto": f"La observación puede tener hasta {servicio.MAX_OBSERVACION} caracteres."}
        )
    return servicio.agregar_observacion(db, postulacion.id, actual.id, datos.texto)
