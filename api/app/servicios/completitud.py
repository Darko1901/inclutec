"""Completitud del perfil del candidato (sección 2 del contrato); no depende de las necesidades."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modelos import (
    Candidato,
    CandidatoHabilidad,
    Experiencia,
    Formacion,
    Usuario,
    t_candidato_modalidad,
)

# (sección, puntos), en el orden en que la app las muestra como pendientes.
SECCIONES = [
    ("datos_personales", 20),
    ("resumen", 10),
    ("foto", 10),
    ("preferencias", 15),
    ("formacion", 20),
    ("experiencia", 10),
    ("habilidades", 15),
]


def _cuenta(db: Session, columna, candidato_id: int) -> int:
    tabla = columna.table if hasattr(columna, "table") else columna.class_.__table__
    return db.scalar(select(func.count()).select_from(tabla).where(columna == candidato_id)) or 0


def secciones_cumplidas(db: Session, candidato_id: int) -> dict[str, bool]:
    fila = db.execute(
        select(
            Usuario.nombre,
            Usuario.apellidos,
            Usuario.telefono,
            Candidato.municipio_id,
            Candidato.resumen,
            Candidato.foto_url,
            Candidato.jornada_id,
        )
        .join(Candidato, Candidato.usuario_id == Usuario.id)
        .where(Usuario.id == candidato_id)
    ).one()
    nombre, apellidos, telefono, municipio_id, resumen, foto_url, jornada_id = fila
    return {
        "datos_personales": all([nombre, apellidos, telefono, municipio_id]),
        "resumen": bool(resumen and resumen.strip()),
        "foto": bool(foto_url),
        "preferencias": jornada_id is not None
        and _cuenta(db, t_candidato_modalidad.c.candidato_id, candidato_id) > 0,
        "formacion": _cuenta(db, Formacion.candidato_id, candidato_id) > 0,
        "experiencia": _cuenta(db, Experiencia.candidato_id, candidato_id) > 0,
        "habilidades": _cuenta(db, CandidatoHabilidad.candidato_id, candidato_id) > 0,
    }


def calcular_completitud(db: Session, candidato_id: int) -> tuple[int, list[str]]:
    """Devuelve (porcentaje 0 a 100, secciones pendientes)."""
    cumplidas = secciones_cumplidas(db, candidato_id)
    total = sum(puntos for seccion, puntos in SECCIONES if cumplidas[seccion])
    pendientes = [seccion for seccion, _ in SECCIONES if not cumplidas[seccion]]
    return total, pendientes


def recalcular_completitud(db: Session, candidato_id: int) -> tuple[int, list[str]]:
    """Calcula y guarda `candidato.completitud`."""
    total, pendientes = calcular_completitud(db, candidato_id)
    db.execute(
        Candidato.__table__.update()
        .where(Candidato.usuario_id == candidato_id)
        .values(completitud=total)
    )
    return total, pendientes
