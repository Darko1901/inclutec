"""Reglas de horarios y entrevistas que comparten varios grupos de endpoints (CU-11 y CU-18)."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.esquemas.entrevista import EmpresaMini, VacanteMini
from app.esquemas.entrevista import Entrevista as EntrevistaSalida
from app.modelos import (
    Empresa,
    Entrevista,
    HistorialPostulacion,
    HorarioEntrevista,
    Postulacion,
    Usuario,
    Vacante,
)
from app.servicios import notificaciones

HORAS_CANCELACION = 24


def ahora() -> datetime:
    return datetime.now(UTC)


def fin_de(horario: HorarioEntrevista) -> datetime:
    return horario.inicio + timedelta(minutes=horario.duracion_min)


def entrevista_vigente_de(db: Session, postulacion_id: int) -> Entrevista | None:
    """La entrevista más reciente que no se canceló (agendada, realizada o sin asistencia)."""
    return db.scalar(
        select(Entrevista)
        .where(Entrevista.postulacion_id == postulacion_id, Entrevista.estado != "cancelada")
        .order_by(Entrevista.creado_en.desc(), Entrevista.id.desc())
        .limit(1)
    )


def vista_de(db: Session, entrevista: Entrevista, *, para_candidato: bool) -> EntrevistaSalida:
    horario = db.get(HorarioEntrevista, entrevista.horario_id)
    vacante = db.get(Vacante, horario.vacante_id)
    empresa = db.get(Empresa, vacante.empresa_id)
    faltan = horario.inicio - ahora()
    return EntrevistaSalida(
        id=entrevista.id,
        estado=entrevista.estado,
        inicio=horario.inicio,
        fin=fin_de(horario),
        duracion_min=horario.duracion_min,
        liga=horario.liga,
        # Solo el candidato cancela, solo una entrevista agendada y con 24 h de anticipación.
        puede_cancelar=para_candidato
        and entrevista.estado == "agendada"
        and faltan >= timedelta(hours=HORAS_CANCELACION),
        vacante=VacanteMini(id=vacante.id, titulo=vacante.titulo),
        empresa=EmpresaMini(id=empresa.id, nombre_comercial=empresa.nombre_comercial),
        creado_en=entrevista.creado_en,
    )


def _nombre(db: Session, usuario_id: int) -> str:
    usuario = db.get(Usuario, usuario_id)
    return f"{usuario.nombre} {usuario.apellidos}" if usuario else "El candidato"


def cancelar_por_candidato(
    db: Session, entrevista: Entrevista, motivo: str | None, usuario_id: int
) -> None:
    """Cancela la entrevista agendada: queda `cancelada`, el horario `libre` y se avisa."""
    horario = db.get(HorarioEntrevista, entrevista.horario_id)
    postulacion = db.get(Postulacion, entrevista.postulacion_id)
    vacante = db.get(Vacante, horario.vacante_id)

    entrevista.estado = "cancelada"
    entrevista.motivo_cancelacion = motivo
    entrevista.cancelada_por = usuario_id
    horario.estado = "libre"

    notificaciones.crear(
        db,
        horario.reclutador_id,
        "entrevista_cancelada",
        "Entrevista cancelada",
        f"{_nombre(db, postulacion.candidato_id)} canceló la entrevista de {vacante.titulo}.",
        "entrevista",
        entrevista.id,
    )


def retirar_postulacion(db: Session, postulacion: Postulacion, usuario_id: int) -> None:
    """Pasa la postulación a «retirada», la anota en el historial y cancela su entrevista agendada.

    Quien llama ya comprobó que la postulación sigue en curso.
    """
    entrevista = entrevista_vigente_de(db, postulacion.id)
    if entrevista is not None and entrevista.estado == "agendada":
        cancelar_por_candidato(db, entrevista, None, usuario_id)
    db.add(
        HistorialPostulacion(
            postulacion_id=postulacion.id,
            usuario_id=usuario_id,
            estado_anterior=postulacion.estado,
            estado_nuevo="retirada",
        )
    )
    postulacion.estado = "retirada"
    postulacion.actualizado_en = ahora()
