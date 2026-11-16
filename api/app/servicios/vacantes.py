"""Armado de las respuestas de vacantes, búsqueda y reglas compartidas (sección 4 del contrato)."""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import and_, delete, exists, func, select
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.comunes import AjusteRef, NivelEducativoRef, Ref
from app.esquemas.vacante import (
    AjusteDeVacante,
    AjusteDeVacanteResumen,
    CompatibilidadDesglose,
    Componentes,
    DesgloseFormacion,
    DesgloseHabilidades,
    DesgloseModalidad,
    DesgloseNecesidades,
    EmpresaDeVacante,
    HabilidadDeVacante,
    NecesidadCubierta,
    Salario,
    VacanteDetalle,
    VacanteEntrada,
    VacanteReclutador,
    VacanteResumen,
)
from app.modelos import (
    Ajuste,
    Categoria,
    Compatibilidad,
    Empresa,
    Habilidad,
    Jornada,
    Modalidad,
    Municipio,
    NivelEducativo,
    Postulacion,
    TipoContrato,
    Vacante,
    VacanteAjuste,
    VacanteHabilidad,
)
from app.servicios import compatibilidad as motor
from app.servicios import notificaciones
from app.servicios.candidato import municipio_de

ESTADOS_ACTIVOS = ("postulada", "en_revision", "entrevista")
_ACENTOS = "áéíóúüñ"
_SIN_ACENTOS = "aeiouun"


def sin_acentos(texto: str) -> str:
    return texto.lower().translate(str.maketrans(_ACENTOS, _SIN_ACENTOS))


def no_encontrada() -> ApiError:
    return ApiError(404, "no_encontrado", "La vacante no existe o ya no está disponible.")


def _numero(valor: Decimal | float | int | None) -> float | int | None:
    """Dinero como número JSON: entero si no tiene centavos (14000), decimal si los tiene."""
    if valor is None:
        return None
    decimal = Decimal(str(valor))
    return int(decimal) if decimal == decimal.to_integral_value() else float(decimal)


def _ref(db: Session, modelo, id_: int) -> Ref:
    fila = db.get(modelo, id_)
    return Ref(id=fila.id, nombre=fila.nombre)


def _nivel(db: Session, nivel_id: int | None) -> NivelEducativoRef | None:
    if nivel_id is None:
        return None
    n = db.get(NivelEducativo, nivel_id)
    return NivelEducativoRef(id=n.id, nombre=n.nombre, orden=n.orden)


def _ajuste_ref(db: Session, ajuste_id: int) -> AjusteRef:
    a = db.get(Ajuste, ajuste_id)
    return AjusteRef(id=a.id, nombre=a.nombre, categoria=a.categoria)


def vacante_por_id(db: Session, id_: int) -> Vacante | None:
    if not 1 <= id_ <= 2**63 - 1:
        return None
    return db.get(Vacante, id_)


# --- Visibilidad --------------------------------------------------------------------------------


def es_visible_para_candidato(db: Session, vacante: Vacante) -> bool:
    """Lo que ve el candidato en listas y detalle: publicada y de una empresa validada."""
    if vacante.estado != "publicada":
        return False
    return db.scalar(select(Empresa.estado).where(Empresa.id == vacante.empresa_id)) == "validada"


def postulacion_de(db: Session, candidato_id: int, vacante_id: int) -> int | None:
    return db.scalar(
        select(Postulacion.id).where(
            Postulacion.candidato_id == candidato_id, Postulacion.vacante_id == vacante_id
        )
    )


def contar_postulados(db: Session, vacante_id: int) -> int:
    """Postulaciones que cuentan como postulados: las retiradas ya no."""
    return (
        db.scalar(
            select(func.count()).where(
                Postulacion.vacante_id == vacante_id, Postulacion.estado != "retirada"
            )
        )
        or 0
    )


# --- Respuestas ---------------------------------------------------------------------------------


def _empresa(db: Session, vacante: Vacante) -> EmpresaDeVacante:
    e = db.get(Empresa, vacante.empresa_id)
    return EmpresaDeVacante(
        id=e.id,
        nombre_comercial=e.nombre_comercial,
        logo_url=e.logo_url,
        validada=e.estado == "validada",
    )


def _ajustes_resumen(db: Session, vacante_id: int) -> list[AjusteDeVacanteResumen]:
    filas = db.execute(
        select(Ajuste.id, Ajuste.nombre, Ajuste.categoria, VacanteAjuste.tipo)
        .join(VacanteAjuste, VacanteAjuste.ajuste_id == Ajuste.id)
        .where(VacanteAjuste.vacante_id == vacante_id)
        .order_by(Ajuste.id)
    )
    return [AjusteDeVacanteResumen(id=i, nombre=n, categoria=c, tipo=t) for i, n, c, t in filas]


def resumen_de(db: Session, vacante: Vacante, candidato_id: int | None) -> VacanteResumen:
    """VacanteResumen. Sin candidato (reclutador o administrador) no hay compatibilidad."""
    puntaje = None
    cubre = False
    if candidato_id is not None:
        fila = db.execute(
            select(Compatibilidad.puntaje_candidato, Compatibilidad.componente_a).where(
                Compatibilidad.candidato_id == candidato_id,
                Compatibilidad.vacante_id == vacante.id,
            )
        ).first()
        if fila is not None:
            puntaje, componente_a = fila
            cubre = componente_a == 1
    return VacanteResumen(
        id=vacante.id,
        titulo=vacante.titulo,
        empresa=_empresa(db, vacante),
        categoria=_ref(db, Categoria, vacante.categoria_id),
        modalidad=_ref(db, Modalidad, vacante.modalidad_id),
        jornada=_ref(db, Jornada, vacante.jornada_id),
        municipio=municipio_de(db, vacante.municipio_id),
        salario=_salario(vacante, forzar=False),
        compatibilidad=puntaje,
        ajustes=_ajustes_resumen(db, vacante.id),
        cubre_mis_necesidades=cubre,
        publicada_en=vacante.publicada_en or vacante.actualizado_en,
        postulacion_id=postulacion_de(db, candidato_id, vacante.id) if candidato_id else None,
    )


def _salario(vacante: Vacante, forzar: bool) -> Salario | None:
    if not (forzar or vacante.mostrar_salario):
        return None
    return Salario(min=_numero(vacante.salario_min), max=_numero(vacante.salario_max))


def detalle_de(
    db: Session,
    vacante: Vacante,
    *,
    candidato_id: int | None = None,
    ver_todo: bool = False,
) -> VacanteDetalle:
    """VacanteDetalle. `ver_todo` (reclutador dueño y administrador): salario y postulados."""
    habilidades = db.execute(
        select(Habilidad.id, Habilidad.nombre, VacanteHabilidad.obligatoria)
        .join(VacanteHabilidad, VacanteHabilidad.habilidad_id == Habilidad.id)
        .where(VacanteHabilidad.vacante_id == vacante.id)
        .order_by(VacanteHabilidad.obligatoria.desc(), Habilidad.nombre)
    )
    ajustes = db.execute(
        select(Ajuste.id, Ajuste.nombre, Ajuste.categoria, Ajuste.descripcion, VacanteAjuste.tipo)
        .join(VacanteAjuste, VacanteAjuste.ajuste_id == Ajuste.id)
        .where(VacanteAjuste.vacante_id == vacante.id)
        .order_by(Ajuste.id)
    )
    return VacanteDetalle(
        id=vacante.id,
        titulo=vacante.titulo,
        descripcion=vacante.descripcion,
        empresa=_empresa(db, vacante),
        categoria=_ref(db, Categoria, vacante.categoria_id),
        modalidad=_ref(db, Modalidad, vacante.modalidad_id),
        jornada=_ref(db, Jornada, vacante.jornada_id),
        tipo_contrato=_ref(db, TipoContrato, vacante.tipo_contrato_id),
        municipio=municipio_de(db, vacante.municipio_id),
        direccion=vacante.direccion,
        plazas=vacante.plazas,
        salario=_salario(vacante, forzar=ver_todo),
        mostrar_salario=vacante.mostrar_salario,
        nivel_educativo=_nivel(db, vacante.nivel_educativo_id),
        experiencia_anios=vacante.experiencia_anios,
        habilidades=[HabilidadDeVacante(id=i, nombre=n, obligatoria=o) for i, n, o in habilidades],
        ajustes=[
            AjusteDeVacante(id=i, nombre=n, categoria=c, descripcion=d, tipo=t)
            for i, n, c, d, t in ajustes
        ],
        sin_condiciones_accesibilidad=vacante.sin_condiciones_accesibilidad,
        notas_accesibilidad=vacante.notas_accesibilidad,
        estado=vacante.estado,
        motivo_estado=vacante.motivo_estado,
        publicada_en=vacante.publicada_en,
        actualizado_en=vacante.actualizado_en,
        postulacion_id=postulacion_de(db, candidato_id, vacante.id) if candidato_id else None,
        postulados=contar_postulados(db, vacante.id) if ver_todo else None,
    )


def resumen_para_reclutador(db: Session, vacante: Vacante) -> VacanteReclutador:
    nuevas = (
        db.scalar(
            select(func.count()).where(
                Postulacion.vacante_id == vacante.id, Postulacion.estado == "postulada"
            )
        )
        or 0
    )
    return VacanteReclutador(
        id=vacante.id,
        titulo=vacante.titulo,
        estado=vacante.estado,
        modalidad=_ref(db, Modalidad, vacante.modalidad_id),
        postulados=contar_postulados(db, vacante.id),
        nuevas=nuevas,
        publicada_en=vacante.publicada_en,
        actualizado_en=vacante.actualizado_en,
    )


def desglose_de(db: Session, vacante: Vacante, candidato_id: int) -> CompatibilidadDesglose:
    """Desglose para el candidato (con el componente A). Se calcula al momento y se guarda."""
    resultado = motor.recalcular_par(db, candidato_id, vacante)
    tipos = dict(
        db.execute(
            select(VacanteAjuste.ajuste_id, VacanteAjuste.tipo).where(
                VacanteAjuste.vacante_id == vacante.id
            )
        ).all()
    )

    def habilidad(id_: int) -> Ref:
        return _ref(db, Habilidad, id_)

    def cubierta(id_: int) -> NecesidadCubierta:
        base = _ajuste_ref(db, id_)
        return NecesidadCubierta(
            id=base.id, nombre=base.nombre, categoria=base.categoria, tipo=tipos[id_]
        )

    return CompatibilidadDesglose(
        puntaje=resultado.puntaje_candidato,
        componentes=Componentes(
            h=float(motor.a_decimal3(resultado.h)),
            a=float(motor.a_decimal3(resultado.a)),
            m=float(motor.a_decimal3(resultado.m)),
            f=float(motor.a_decimal3(resultado.f)),
        ),
        habilidades=DesgloseHabilidades(
            obligatorias_cumplidas=[habilidad(i) for i in resultado.obligatorias_cumplidas],
            obligatorias_faltantes=[habilidad(i) for i in resultado.obligatorias_faltantes],
            deseables_cumplidas=[habilidad(i) for i in resultado.deseables_cumplidas],
            deseables_faltantes=[habilidad(i) for i in resultado.deseables_faltantes],
        ),
        necesidades=DesgloseNecesidades(
            cubiertas=[cubierta(i) for i in resultado.necesidades_cubiertas],
            no_cubiertas=[_ajuste_ref(db, i) for i in resultado.necesidades_no_cubiertas],
        ),
        modalidad=DesgloseModalidad(
            vacante=_ref(db, Modalidad, vacante.modalidad_id), coincide=resultado.modalidad_coincide
        ),
        formacion=DesgloseFormacion(
            requerida=_nivel(db, vacante.nivel_educativo_id), cumple=resultado.formacion_cumple
        ),
        calculado_en=datetime.now(UTC),
    )


# --- Búsqueda -----------------------------------------------------------------------------------


def vacantes_visibles(db: Session) -> list[Vacante]:
    return list(
        db.scalars(
            select(Vacante)
            .join(Empresa, Empresa.id == Vacante.empresa_id)
            .where(Vacante.estado == "publicada", Empresa.estado == "validada")
        )
    )


def buscar(
    db: Session,
    candidato_id: int,
    *,
    q: str | None = None,
    modalidad_id: int | None = None,
    categoria_id: int | None = None,
    entidad_id: int | None = None,
    municipio_id: int | None = None,
    jornada_id: int | None = None,
    salario_min: float | None = None,
    compatibilidad_min: int | None = None,
    ajuste_ids: list[int] | None = None,
    cubre_mis_necesidades: bool | None = None,
    orden: str = "compatibilidad",
    desplazamiento: int = 0,
    limite: int = 20,
) -> tuple[list[VacanteResumen], int]:
    """Vacantes publicadas de empresas validadas, filtradas y ordenadas para el candidato."""
    # Primero se asegura que la compatibilidad de las visibles esté calculada y al día.
    motor.asegurar_candidato(db, candidato_id, vacantes_visibles(db))

    filtros = [Vacante.estado == "publicada", Empresa.estado == "validada"]
    if q:
        pajar = func.translate(
            func.lower(
                func.concat(Vacante.titulo, " ", Vacante.descripcion, " ", Empresa.nombre_comercial)
            ),
            _ACENTOS,
            _SIN_ACENTOS,
        )
        filtros.append(pajar.contains(sin_acentos(q), autoescape=True))
    for columna, valor in (
        (Vacante.modalidad_id, modalidad_id),
        (Vacante.categoria_id, categoria_id),
        (Vacante.municipio_id, municipio_id),
        (Vacante.jornada_id, jornada_id),
    ):
        if valor is not None:
            filtros.append(columna == valor)
    if entidad_id is not None:
        filtros.append(
            exists().where(
                Municipio.id == Vacante.municipio_id, Municipio.entidad_federativa_id == entidad_id
            )
        )
    # Solo cuenta el salario que la empresa publica.
    if salario_min is not None:
        filtros.append(
            and_(
                Vacante.mostrar_salario.is_(True),
                func.coalesce(Vacante.salario_max, 0) >= salario_min,
            )
        )
    if ajuste_ids:
        pedidos = set(ajuste_ids)
        filtros.append(
            select(func.count())
            .where(VacanteAjuste.vacante_id == Vacante.id, VacanteAjuste.ajuste_id.in_(pedidos))
            .scalar_subquery()
            == len(pedidos)
        )
    if compatibilidad_min is not None:
        filtros.append(Compatibilidad.puntaje_candidato >= compatibilidad_min)
    if cubre_mis_necesidades:
        filtros.append(Compatibilidad.componente_a == 1)

    base = (
        select(Vacante.id)
        .join(Empresa, Empresa.id == Vacante.empresa_id)
        .join(
            Compatibilidad,
            and_(
                Compatibilidad.vacante_id == Vacante.id,
                Compatibilidad.candidato_id == candidato_id,
            ),
        )
        .where(*filtros)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    recientes = (Vacante.publicada_en.desc().nulls_last(), Vacante.id.asc())
    orden_sql = (
        recientes if orden == "recientes" else (Compatibilidad.puntaje_candidato.desc(), *recientes)
    )
    ids = list(db.scalars(base.order_by(*orden_sql).limit(limite).offset(desplazamiento)))
    resumenes = [resumen_de(db, db.get(Vacante, i), candidato_id) for i in ids]
    return resumenes, total


# --- Guardado -----------------------------------------------------------------------------------


def aplicar_entrada(vacante: Vacante, datos: VacanteEntrada) -> None:
    """Copia al modelo los campos editables del cuerpo (sin estado ni habilidades/ajustes)."""
    vacante.titulo = datos.titulo.strip()
    vacante.categoria_id = datos.categoria_id
    vacante.descripcion = datos.descripcion.strip()
    vacante.jornada_id = datos.jornada_id
    vacante.tipo_contrato_id = datos.tipo_contrato_id
    vacante.plazas = datos.plazas
    vacante.modalidad_id = datos.modalidad_id
    vacante.municipio_id = datos.municipio_id
    vacante.direccion = (datos.direccion or "").strip() or None
    vacante.salario_min = None if datos.salario_min is None else Decimal(str(datos.salario_min))
    vacante.salario_max = None if datos.salario_max is None else Decimal(str(datos.salario_max))
    vacante.mostrar_salario = datos.mostrar_salario
    vacante.nivel_educativo_id = datos.nivel_educativo_id
    vacante.experiencia_anios = datos.experiencia_anios
    vacante.sin_condiciones_accesibilidad = datos.sin_condiciones_accesibilidad
    vacante.notas_accesibilidad = (datos.notas_accesibilidad or "").strip() or None


def reemplazar_habilidades_y_ajustes(db: Session, vacante: Vacante, datos: VacanteEntrada) -> None:
    db.execute(delete(VacanteHabilidad).where(VacanteHabilidad.vacante_id == vacante.id))
    db.execute(delete(VacanteAjuste).where(VacanteAjuste.vacante_id == vacante.id))
    db.flush()
    db.add_all(
        VacanteHabilidad(
            vacante_id=vacante.id, habilidad_id=h.habilidad_id, obligatoria=h.obligatoria
        )
        for h in datos.habilidades
    )
    db.add_all(
        VacanteAjuste(vacante_id=vacante.id, ajuste_id=a.ajuste_id, tipo=a.tipo)
        for a in datos.ajustes
    )
    db.flush()


def firma_de_requisitos(db: Session, vacante: Vacante) -> tuple:
    """Lo que, si cambia, obliga a recalcular la compatibilidad y avisar a los postulados."""
    habilidades = sorted(
        db.execute(
            select(VacanteHabilidad.habilidad_id, VacanteHabilidad.obligatoria).where(
                VacanteHabilidad.vacante_id == vacante.id
            )
        ).all()
    )
    ajustes = sorted(
        db.execute(
            select(VacanteAjuste.ajuste_id, VacanteAjuste.tipo).where(
                VacanteAjuste.vacante_id == vacante.id
            )
        ).all()
    )
    return (
        tuple(map(tuple, habilidades)),
        vacante.nivel_educativo_id,
        vacante.modalidad_id,
        tuple(map(tuple, ajustes)),
        vacante.sin_condiciones_accesibilidad,
    )


def notificar_cambio_de_requisitos(db: Session, vacante: Vacante) -> int:
    """Avisa a los postulados con proceso en curso. Devuelve a cuántos."""
    postulaciones = db.execute(
        select(Postulacion.id, Postulacion.candidato_id).where(
            Postulacion.vacante_id == vacante.id, Postulacion.estado.in_(ESTADOS_ACTIVOS)
        )
    ).all()
    for postulacion_id, candidato_id in postulaciones:
        notificaciones.crear(
            db,
            candidato_id,
            "vacante_actualizada",
            "Cambiaron los requisitos de una vacante",
            f"La vacante «{vacante.titulo}» cambió sus requisitos. Revisa tu compatibilidad.",
            "postulacion",
            postulacion_id,
        )
    return len(postulaciones)


def hay_obligatoria(datos: VacanteEntrada) -> bool:
    return any(h.obligatoria for h in datos.habilidades)


__all__ = [
    "ESTADOS_ACTIVOS",
    "aplicar_entrada",
    "buscar",
    "contar_postulados",
    "desglose_de",
    "detalle_de",
    "es_visible_para_candidato",
    "firma_de_requisitos",
    "hay_obligatoria",
    "no_encontrada",
    "notificar_cambio_de_requisitos",
    "postulacion_de",
    "reemplazar_habilidades_y_ajustes",
    "resumen_de",
    "resumen_para_reclutador",
    "vacante_por_id",
    "vacantes_visibles",
]
