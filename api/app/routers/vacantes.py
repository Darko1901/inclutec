from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select

from app.dependencias import Db, SesionActual, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.comunes import Pagina
from app.esquemas.vacante import (
    CambioEstadoVacante,
    CompatibilidadDesglose,
    VacanteDetalle,
    VacanteEntrada,
    VacanteGuardada,
    VacanteResumen,
)
from app.modelos import Empresa, Reclutador, Vacante, VacanteAjuste, VacanteHabilidad
from app.paginacion import PaginacionConsulta
from app.servicios import compatibilidad as motor
from app.servicios import vacantes as servicio
from app.validaciones import lanzar_si_hay_campos
from app.validaciones_vacante import (
    exigir_completa,
    lanzar_si_vacante_invalida,
)

router = APIRouter(prefix="/vacantes", tags=["Vacantes y compatibilidad"])

Candidata = Annotated[UsuarioActual, Depends(exigir_roles("candidato"))]
Reclutadora = Annotated[UsuarioActual, Depends(exigir_roles("reclutador"))]

MINIMO_BUSQUEDA = 3
ORDENES = ("compatibilidad", "recientes")

# Transiciones que puede pedir el reclutador (sección 2 del contrato).
TRANSICIONES: dict[str, tuple[str, ...]] = {
    "borrador": ("publicada",),
    "publicada": ("pausada", "cerrada"),
    "pausada": ("publicada", "cerrada"),
    "cerrada": (),
    "suspendida": (),
}


def _empresa_del_reclutador(db: Db, actual: UsuarioActual) -> Empresa:
    empresa = db.scalar(
        select(Empresa)
        .join(Reclutador, Reclutador.empresa_id == Empresa.id)
        .where(Reclutador.usuario_id == actual.id)
    )
    if empresa is None:
        raise ApiError(404, "no_encontrado", "No encontramos tu empresa.")
    return empresa


def _vacante_de_mi_empresa(db: Db, actual: UsuarioActual, id_: int) -> Vacante:
    """Una vacante ajena responde como si no existiera."""
    empresa = _empresa_del_reclutador(db, actual)
    vacante = servicio.vacante_por_id(db, id_)
    if vacante is None or vacante.empresa_id != empresa.id:
        raise servicio.no_encontrada()
    return vacante


def _empresa_no_validada() -> ApiError:
    return ApiError(
        403,
        "empresa_no_validada",
        "Podrás publicar cuando validemos tu empresa. Mientras tanto puedes guardar borradores.",
    )


def _exigir_publicable(db: Db, empresa: Empresa, datos: VacanteEntrada) -> None:
    """Para publicar: empresa validada y todos los datos obligatorios."""
    if empresa.estado != "validada":
        raise _empresa_no_validada()
    exigir_completa(
        db,
        hay_obligatoria=servicio.hay_obligatoria(datos),
        modalidad_id=datos.modalidad_id,
        direccion=datos.direccion,
        hay_ajustes=bool(datos.ajustes),
        sin_condiciones=datos.sin_condiciones_accesibilidad,
    )


# --- Candidato: recomendadas y búsqueda ---------------------------------------------------------


@router.get(
    "/recomendadas",
    response_model=Pagina[VacanteResumen],
    summary="Vacantes recomendadas",
    operation_id="get_vacantes_recomendadas",
)
def recomendadas(actual: Candidata, db: Db, pagina: PaginacionConsulta) -> Pagina[VacanteResumen]:
    """Publicadas, de mayor a menor compatibilidad; responde aunque el perfil esté incompleto."""
    items, total = servicio.buscar(
        db, actual.id, desplazamiento=pagina.desplazamiento, limite=pagina.size
    )
    return Pagina[VacanteResumen](items=items, total=total, page=pagina.page, size=pagina.size)


@router.get(
    "",
    response_model=Pagina[VacanteResumen],
    summary="Buscar vacantes",
    operation_id="get_vacantes",
)
def buscar(
    actual: Candidata,
    db: Db,
    pagina: PaginacionConsulta,
    q: Annotated[str | None, Query(description="Título, descripción o empresa (mín. 3).")] = None,
    modalidad_id: int | None = None,
    categoria_id: int | None = None,
    entidad_id: int | None = None,
    municipio_id: int | None = None,
    jornada_id: int | None = None,
    salario_min: Annotated[
        float | None, Query(description="Salario máximo publicado ≥ este valor.")
    ] = None,
    compatibilidad_min: Annotated[
        int | None, Query(description="Puntaje mínimo (0 a 100).")
    ] = None,
    ajuste_id: Annotated[list[int] | None, Query(description="Se repite el parámetro.")] = None,
    cubre_mis_necesidades: bool | None = None,
    orden: Annotated[str, Query(description="`compatibilidad` o `recientes`.")] = "compatibilidad",
) -> Pagina[VacanteResumen]:
    """Todos los filtros se combinan con «y». Solo vacantes publicadas de empresas validadas."""
    campos: dict[str, str] = {}
    texto = q.strip() if q is not None else None
    if texto is not None and len(texto) < MINIMO_BUSQUEDA:
        campos["q"] = f"Escribe al menos {MINIMO_BUSQUEDA} caracteres."
    if salario_min is not None and salario_min < 0:
        campos["salario_min"] = "Debe ser un número mayor o igual a 0."
    if compatibilidad_min is not None and not 0 <= compatibilidad_min <= 100:
        campos["compatibilidad_min"] = "Debe ser un número de 0 a 100."
    if orden not in ORDENES:
        campos["orden"] = "El orden puede ser «compatibilidad» o «recientes»."
    lanzar_si_hay_campos(campos)

    items, total = servicio.buscar(
        db,
        actual.id,
        q=texto,
        modalidad_id=modalidad_id,
        categoria_id=categoria_id,
        entidad_id=entidad_id,
        municipio_id=municipio_id,
        jornada_id=jornada_id,
        salario_min=salario_min,
        compatibilidad_min=compatibilidad_min,
        ajuste_ids=ajuste_id,
        cubre_mis_necesidades=cubre_mis_necesidades,
        orden=orden,
        desplazamiento=pagina.desplazamiento,
        limite=pagina.size,
    )
    return Pagina[VacanteResumen](items=items, total=total, page=pagina.page, size=pagina.size)


# --- Crear, duplicar ----------------------------------------------------------------------------


@router.post(
    "",
    response_model=VacanteGuardada,
    status_code=status.HTTP_201_CREATED,
    summary="Crear vacante",
    operation_id="post_vacantes",
)
def crear(datos: VacanteEntrada, actual: Reclutadora, db: Db) -> VacanteGuardada:
    """Con `borrador` solo valida formatos; con `publicada` exige además lo que dice el contrato."""
    empresa = _empresa_del_reclutador(db, actual)
    lanzar_si_vacante_invalida(db, datos)
    if datos.estado == "publicada":
        _exigir_publicable(db, empresa, datos)

    ahora = datetime.now(UTC)
    vacante = Vacante(
        empresa_id=empresa.id,
        reclutador_id=actual.id,
        estado=datos.estado,
        publicada_en=ahora if datos.estado == "publicada" else None,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    servicio.aplicar_entrada(vacante, datos)
    db.add(vacante)
    db.flush()
    servicio.reemplazar_habilidades_y_ajustes(db, vacante, datos)
    # Al publicar se calcula la compatibilidad con los candidatos.
    motor.recalcular_vacante(db, vacante)
    return VacanteGuardada(
        vacante=servicio.detalle_de(db, vacante, ver_todo=True), postulados_notificados=0
    )


@router.post(
    "/{id}/duplicar",
    response_model=VacanteDetalle,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicar como borrador",
    operation_id="post_vacantes_id_duplicar",
)
def duplicar(id: int, actual: Reclutadora, db: Db) -> VacanteDetalle:
    """Copia datos, habilidades y ajustes; el título lleva « (copia)» y el estado es «borrador»."""
    original = _vacante_de_mi_empresa(db, actual, id)
    sufijo = " (copia)"
    ahora = datetime.now(UTC)
    copia = Vacante(
        empresa_id=original.empresa_id,
        reclutador_id=actual.id,
        categoria_id=original.categoria_id,
        modalidad_id=original.modalidad_id,
        jornada_id=original.jornada_id,
        tipo_contrato_id=original.tipo_contrato_id,
        nivel_educativo_id=original.nivel_educativo_id,
        municipio_id=original.municipio_id,
        titulo=f"{original.titulo[: 120 - len(sufijo)]}{sufijo}",
        descripcion=original.descripcion,
        plazas=original.plazas,
        direccion=original.direccion,
        salario_min=original.salario_min,
        salario_max=original.salario_max,
        mostrar_salario=original.mostrar_salario,
        experiencia_anios=original.experiencia_anios,
        sin_condiciones_accesibilidad=original.sin_condiciones_accesibilidad,
        notas_accesibilidad=original.notas_accesibilidad,
        estado="borrador",
        publicada_en=None,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(copia)
    db.flush()
    db.add_all(
        VacanteHabilidad(
            vacante_id=copia.id, habilidad_id=h.habilidad_id, obligatoria=h.obligatoria
        )
        for h in db.scalars(
            select(VacanteHabilidad).where(VacanteHabilidad.vacante_id == original.id)
        )
    )
    db.add_all(
        VacanteAjuste(vacante_id=copia.id, ajuste_id=a.ajuste_id, tipo=a.tipo)
        for a in db.scalars(select(VacanteAjuste).where(VacanteAjuste.vacante_id == original.id))
    )
    db.flush()
    return servicio.detalle_de(db, copia, ver_todo=True)


# --- Detalle, compatibilidad, edición y estado --------------------------------------------------


@router.get(
    "/{id}",
    response_model=VacanteDetalle,
    summary="Detalle de vacante",
    operation_id="get_vacantes_id",
)
def detalle(id: int, actual: SesionActual, db: Db) -> VacanteDetalle:
    vacante = servicio.vacante_por_id(db, id)
    if vacante is None:
        raise servicio.no_encontrada()
    if actual.rol == "administrador":
        return servicio.detalle_de(db, vacante, ver_todo=True)
    if actual.rol == "reclutador":
        propia = _empresa_del_reclutador(db, actual).id == vacante.empresa_id
        if not propia:
            raise servicio.no_encontrada()
        return servicio.detalle_de(db, vacante, ver_todo=True)
    # El candidato ve las publicadas y aquellas a las que ya se postuló; los borradores, nunca.
    postulada = servicio.postulacion_de(db, actual.id, vacante.id) is not None
    if vacante.estado == "borrador" or not (
        servicio.es_visible_para_candidato(db, vacante) or postulada
    ):
        raise servicio.no_encontrada()
    return servicio.detalle_de(db, vacante, candidato_id=actual.id)


@router.get(
    "/{id}/compatibilidad",
    response_model=CompatibilidadDesglose,
    summary="Desglose de compatibilidad",
    operation_id="get_vacantes_id_compatibilidad",
)
def desglose(id: int, actual: Candidata, db: Db) -> CompatibilidadDesglose:
    """Se calcula al momento (y se guarda) para que nunca esté desactualizado."""
    vacante = servicio.vacante_por_id(db, id)
    if vacante is None or vacante.estado == "borrador":
        raise servicio.no_encontrada()
    return servicio.desglose_de(db, vacante, actual.id)


@router.put(
    "/{id}",
    response_model=VacanteGuardada,
    summary="Editar vacante",
    operation_id="put_vacantes_id",
)
def editar(id: int, datos: VacanteEntrada, actual: Reclutadora, db: Db) -> VacanteGuardada:
    empresa = _empresa_del_reclutador(db, actual)
    vacante = _vacante_de_mi_empresa(db, actual, id)
    if vacante.estado in ("suspendida", "cerrada"):
        raise ApiError(
            409,
            "estado_invalido",
            "La vacante está suspendida por el administrador y no se puede editar."
            if vacante.estado == "suspendida"
            else "La vacante está cerrada y no se puede editar. Puedes duplicarla como borrador.",
        )
    lanzar_si_vacante_invalida(db, datos)
    # Una vacante ya publicada o pausada se valida como publicable aunque llegue como borrador.
    if vacante.estado != "borrador" or datos.estado == "publicada":
        _exigir_publicable(db, empresa, datos)

    antes = servicio.firma_de_requisitos(db, vacante)
    servicio.aplicar_entrada(vacante, datos)
    servicio.reemplazar_habilidades_y_ajustes(db, vacante, datos)
    # Publicar o pausar es cosa de PATCH /estado: al editar solo un borrador puede publicarse.
    ahora = datetime.now(UTC)
    if vacante.estado == "borrador" and datos.estado == "publicada":
        vacante.estado = "publicada"
        vacante.publicada_en = ahora
    vacante.actualizado_en = ahora
    db.flush()

    cambiaron = antes != servicio.firma_de_requisitos(db, vacante)
    avisados = 0
    if cambiaron or vacante.estado == "publicada":
        motor.recalcular_vacante(db, vacante)
    if cambiaron:
        avisados = servicio.notificar_cambio_de_requisitos(db, vacante)
    return VacanteGuardada(
        vacante=servicio.detalle_de(db, vacante, ver_todo=True), postulados_notificados=avisados
    )


@router.patch(
    "/{id}/estado",
    response_model=VacanteDetalle,
    summary="Publicar, pausar, reanudar o cerrar",
    operation_id="patch_vacantes_id_estado",
)
def cambiar_estado(
    id: int, datos: CambioEstadoVacante, actual: Reclutadora, db: Db
) -> VacanteDetalle:
    empresa = _empresa_del_reclutador(db, actual)
    vacante = _vacante_de_mi_empresa(db, actual, id)
    if datos.estado not in ("publicada", "pausada", "cerrada"):
        lanzar_si_hay_campos({"estado": "El estado puede ser publicada, pausada o cerrada."})
    if datos.estado not in TRANSICIONES[vacante.estado]:
        raise ApiError(
            409,
            "transicion_invalida",
            f"No se puede pasar una vacante de {vacante.estado} a {datos.estado}.",
        )
    if datos.estado == "publicada":
        if empresa.estado != "validada":
            raise _empresa_no_validada()
        tiene_obligatoria = (
            db.scalar(
                select(VacanteHabilidad.habilidad_id).where(
                    VacanteHabilidad.vacante_id == vacante.id,
                    VacanteHabilidad.obligatoria.is_(True),
                )
            )
            is not None
        )
        hay_ajustes = (
            db.scalar(select(VacanteAjuste.ajuste_id).where(VacanteAjuste.vacante_id == vacante.id))
            is not None
        )
        exigir_completa(
            db,
            hay_obligatoria=tiene_obligatoria,
            modalidad_id=vacante.modalidad_id,
            direccion=vacante.direccion,
            hay_ajustes=hay_ajustes,
            sin_condiciones=vacante.sin_condiciones_accesibilidad,
        )
        if vacante.publicada_en is None:
            vacante.publicada_en = datetime.now(UTC)
    vacante.estado = datos.estado
    vacante.actualizado_en = datetime.now(UTC)
    db.flush()
    if datos.estado == "publicada":
        motor.recalcular_vacante(db, vacante)
    return servicio.detalle_de(db, vacante, ver_todo=True)
