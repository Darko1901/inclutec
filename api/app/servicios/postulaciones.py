"""Reglas de postulaciones que comparten varios grupos de endpoints."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos import Entrevista, HistorialPostulacion, HorarioEntrevista, Postulacion

ESTADOS_ACTIVOS = ("postulada", "en_revision", "entrevista")


def retirar_activas_de_candidato(db: Session, candidato_id: int, usuario_id: int) -> int:
    """Pasa a `retirada` las postulaciones en curso del candidato (baja de cuenta).

    Cada una deja su renglón en el historial; si tenía una entrevista agendada, se cancela y el
    horario vuelve a quedar libre (cancela el candidato). Devuelve cuántas se retiraron.
    """
    ahora = datetime.now(UTC)
    postulaciones = db.scalars(
        select(Postulacion).where(
            Postulacion.candidato_id == candidato_id, Postulacion.estado.in_(ESTADOS_ACTIVOS)
        )
    ).all()
    for postulacion in postulaciones:
        entrevista = db.scalar(
            select(Entrevista).where(
                Entrevista.postulacion_id == postulacion.id, Entrevista.estado == "agendada"
            )
        )
        if entrevista is not None:
            entrevista.estado = "cancelada"
            entrevista.cancelada_por = usuario_id
            entrevista.motivo_cancelacion = "El candidato retiró su postulación."
            horario = db.get(HorarioEntrevista, entrevista.horario_id)
            if horario is not None:
                horario.estado = "libre"
        db.add(
            HistorialPostulacion(
                postulacion_id=postulacion.id,
                usuario_id=usuario_id,
                estado_anterior=postulacion.estado,
                estado_nuevo="retirada",
            )
        )
        postulacion.estado = "retirada"
        postulacion.actualizado_en = ahora
    db.flush()
    return len(postulaciones)
