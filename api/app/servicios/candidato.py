"""Armado de las respuestas del perfil y del CV del candidato, y reglas compartidas."""

from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.candidato import CV, Experiencia, Formacion, HabilidadCandidato, PerfilCandidato
from app.esquemas.comunes import AjusteRef, EntidadRef, MunicipioRef, NivelEducativoRef, Ref
from app.modelos import (
    Ajuste,
    Candidato,
    CandidatoHabilidad,
    Categoria,
    EntidadFederativa,
    Habilidad,
    Jornada,
    Modalidad,
    Municipio,
    NivelEducativo,
    Usuario,
    t_candidato_categoria,
    t_candidato_modalidad,
    t_candidato_necesidad,
)
from app.modelos import (
    Experiencia as ExperienciaTabla,
)
from app.modelos import (
    Formacion as FormacionTabla,
)
from app.servicios import compatibilidad
from app.servicios.completitud import recalcular_completitud


def candidato_de(db: Session, usuario_id: int) -> Candidato:
    candidato = db.get(Candidato, usuario_id)
    if candidato is None:
        raise ApiError(403, "sin_permiso", "El rol del usuario no tiene acceso a este endpoint.")
    return candidato


def tocar(db: Session, candidato: Candidato) -> None:
    """Marca el perfil como actualizado y recalcula la completitud."""
    candidato.actualizado_en = datetime.now(UTC)
    db.flush()
    recalcular_completitud(db, candidato.usuario_id)
    recalcular_compatibilidad(db, candidato.usuario_id)


def recalcular_compatibilidad(db: Session, candidato_id: int) -> None:
    """Recalcula la compatibilidad del candidato con las vacantes ya publicadas."""
    compatibilidad.recalcular_candidato(db, candidato_id)


def municipio_de(db: Session, municipio_id: int | None) -> MunicipioRef | None:
    if municipio_id is None:
        return None
    fila = db.execute(
        select(Municipio.id, Municipio.nombre, EntidadFederativa.id, EntidadFederativa.nombre)
        .join(EntidadFederativa, EntidadFederativa.id == Municipio.entidad_federativa_id)
        .where(Municipio.id == municipio_id)
    ).one()
    return MunicipioRef(id=fila[0], nombre=fila[1], entidad=EntidadRef(id=fila[2], nombre=fila[3]))


def necesidades_de(db: Session, candidato_id: int) -> list[AjusteRef]:
    filas = db.execute(
        select(Ajuste.id, Ajuste.nombre, Ajuste.categoria)
        .join(t_candidato_necesidad, t_candidato_necesidad.c.ajuste_id == Ajuste.id)
        .where(t_candidato_necesidad.c.candidato_id == candidato_id)
        .order_by(Ajuste.id)
    )
    return [AjusteRef(id=f[0], nombre=f[1], categoria=f[2]) for f in filas]


def _refs(db: Session, modelo, tabla, candidato_id: int, columna: str) -> list[Ref]:
    filas = db.execute(
        select(modelo.id, modelo.nombre)
        .join(tabla, getattr(tabla.c, columna) == modelo.id)
        .where(tabla.c.candidato_id == candidato_id)
        .order_by(modelo.id)
    )
    return [Ref(id=f[0], nombre=f[1]) for f in filas]


def modalidades_de(db: Session, candidato_id: int) -> list[Ref]:
    return _refs(db, Modalidad, t_candidato_modalidad, candidato_id, "modalidad_id")


def perfil_de(db: Session, usuario_id: int) -> PerfilCandidato:
    """PerfilCandidato del contrato. Sin consentimiento vigente, `necesidades` va vacío."""
    usuario = db.get(Usuario, usuario_id)
    candidato = candidato_de(db, usuario_id)
    jornada = (
        db.execute(
            select(Jornada.id, Jornada.nombre).where(Jornada.id == candidato.jornada_id)
        ).one()
        if candidato.jornada_id is not None
        else None
    )
    completitud, pendientes = recalcular_completitud(db, usuario_id)
    tiene_habilidad = db.scalar(
        select(func.count()).where(CandidatoHabilidad.candidato_id == usuario_id)
    )
    tiene_formacion = db.scalar(
        select(func.count()).where(FormacionTabla.candidato_id == usuario_id)
    )
    perfil_minimo = bool(
        usuario.nombre and candidato.municipio_id and tiene_habilidad and tiene_formacion
    )
    con_consentimiento = candidato.consentimiento_sensibles_en is not None
    return PerfilCandidato(
        usuario={
            "id": usuario.id,
            "nombre": usuario.nombre,
            "apellidos": usuario.apellidos,
            "correo": usuario.correo,
            "telefono": usuario.telefono,
        },
        municipio=municipio_de(db, candidato.municipio_id),
        jornada=Ref(id=jornada[0], nombre=jornada[1]) if jornada else None,
        resumen=candidato.resumen,
        foto_url=candidato.foto_url,
        disponible_reubicacion=candidato.disponible_reubicacion,
        modalidades=modalidades_de(db, usuario_id),
        categorias=_refs(db, Categoria, t_candidato_categoria, usuario_id, "categoria_id"),
        compartir_ajustes=candidato.compartir_ajustes,
        consentimiento_sensibles_en=candidato.consentimiento_sensibles_en,
        necesidades=necesidades_de(db, usuario_id) if con_consentimiento else [],
        nota_ajustes=candidato.nota_ajustes if con_consentimiento else None,
        completitud=completitud,
        secciones_pendientes=pendientes,
        perfil_minimo=perfil_minimo,
        actualizado_en=candidato.actualizado_en,
    )


def experiencias_de(db: Session, candidato_id: int) -> list[Experiencia]:
    """De la más reciente a la más antigua: primero el trabajo actual y luego por fecha de fin."""
    filas = db.scalars(
        select(ExperienciaTabla)
        .where(ExperienciaTabla.candidato_id == candidato_id)
        .order_by(
            ExperienciaTabla.actual.desc(),
            ExperienciaTabla.fecha_fin.desc().nulls_last(),
            ExperienciaTabla.fecha_inicio.desc(),
            ExperienciaTabla.id.desc(),
        )
    )
    return [Experiencia.model_validate(f) for f in filas]


def formacion_de_fila(fila: FormacionTabla, nivel: NivelEducativo) -> Formacion:
    return Formacion(
        id=fila.id,
        nivel_educativo=NivelEducativoRef(id=nivel.id, nombre=nivel.nombre, orden=nivel.orden),
        institucion=fila.institucion,
        carrera=fila.carrera,
        estado=fila.estado,
        fecha_inicio=fila.fecha_inicio,
        fecha_fin=fila.fecha_fin,
    )


def formaciones_de(db: Session, candidato_id: int) -> list[Formacion]:
    filas = db.execute(
        select(FormacionTabla, NivelEducativo)
        .join(NivelEducativo, NivelEducativo.id == FormacionTabla.nivel_educativo_id)
        .where(FormacionTabla.candidato_id == candidato_id)
        .order_by(FormacionTabla.fecha_inicio.desc().nulls_last(), FormacionTabla.id.desc())
    )
    return [formacion_de_fila(f, n) for f, n in filas]


def habilidades_de(db: Session, candidato_id: int) -> list[HabilidadCandidato]:
    filas = db.execute(
        select(Habilidad.id, Habilidad.nombre, CandidatoHabilidad.nivel)
        .join(CandidatoHabilidad, CandidatoHabilidad.habilidad_id == Habilidad.id)
        .where(CandidatoHabilidad.candidato_id == candidato_id)
        .order_by(Habilidad.nombre)
    )
    return [HabilidadCandidato(id=f[0], nombre=f[1], nivel=f[2]) for f in filas]


def cv_de(db: Session, usuario_id: int, con_contacto: bool) -> CV:
    """CV tal como lo ve una empresa: sin necesidades y, antes de «entrevista», sin contacto."""
    usuario = db.get(Usuario, usuario_id)
    candidato = candidato_de(db, usuario_id)
    return CV(
        id=usuario.id,
        nombre=usuario.nombre,
        apellidos=usuario.apellidos,
        foto_url=candidato.foto_url,
        municipio=municipio_de(db, candidato.municipio_id),
        resumen=candidato.resumen,
        modalidades=modalidades_de(db, usuario_id),
        experiencias=experiencias_de(db, usuario_id),
        formaciones=formaciones_de(db, usuario_id),
        habilidades=habilidades_de(db, usuario_id),
        correo=usuario.correo if con_contacto else None,
        telefono=usuario.telefono if con_contacto else None,
    )


def borrar_cv_y_necesidades(db: Session, candidato: Candidato) -> None:
    """Para la baja de la cuenta: necesidades, CV y preferencias dejan de existir."""
    id_ = candidato.usuario_id
    db.execute(delete(t_candidato_necesidad).where(t_candidato_necesidad.c.candidato_id == id_))
    db.execute(delete(ExperienciaTabla).where(ExperienciaTabla.candidato_id == id_))
    db.execute(delete(FormacionTabla).where(FormacionTabla.candidato_id == id_))
    db.execute(delete(CandidatoHabilidad).where(CandidatoHabilidad.candidato_id == id_))
    candidato.consentimiento_sensibles_en = None
    candidato.nota_ajustes = None
