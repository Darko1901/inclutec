"""Recordatorio 24 horas antes de cada entrevista (sección 2 del contrato).

Corre cada pocos minutos (ver `app/main.py`). Cada entrevista agendada se recuerda una sola vez:
`entrevista.recordatorio_en` guarda cuándo, así que un reinicio del API no repite avisos.
"""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos import Entrevista, HorarioEntrevista, Postulacion, Usuario, Vacante
from app.servicios import notificaciones
from app.servicios.entrevistas import HORAS_CANCELACION, ahora
from app.servicios.horarios import ZONA


def _cuando(horario: HorarioEntrevista) -> str:
    local = horario.inicio.astimezone(ZONA)
    return local.strftime("%d/%m/%Y a las %H:%M (hora de la Ciudad de México)")


def enviar_recordatorios(db: Session) -> int:
    """Crea el aviso para el candidato y el reclutador de cada entrevista a 24 h o menos.

    Devuelve cuántas entrevistas se recordaron. Una entrevista que se agendó con menos de 24 h
    de anticipación no se recuerda (la persona acaba de agendarla), pero se marca como revisada.
    """
    momento = ahora()
    limite = momento + timedelta(hours=HORAS_CANCELACION)
    pendientes = db.execute(
        select(Entrevista, HorarioEntrevista)
        .join(HorarioEntrevista, HorarioEntrevista.id == Entrevista.horario_id)
        .where(
            Entrevista.estado == "agendada",
            Entrevista.recordatorio_en.is_(None),
            HorarioEntrevista.inicio > momento,
            HorarioEntrevista.inicio <= limite,
        )
        .with_for_update(of=Entrevista, skip_locked=True)
    ).all()

    recordadas = 0
    for entrevista, horario in pendientes:
        entrevista.recordatorio_en = momento
        reservada_a_ultima_hora = entrevista.creado_en > horario.inicio - timedelta(
            hours=HORAS_CANCELACION
        )
        if reservada_a_ultima_hora:
            continue
        postulacion = db.get(Postulacion, entrevista.postulacion_id)
        vacante = db.get(Vacante, horario.vacante_id)
        candidato = db.get(Usuario, postulacion.candidato_id)
        cuando = _cuando(horario)
        liga = f"Liga: {horario.liga}"

        notificaciones.crear(
            db,
            candidato.id,
            "recordatorio_entrevista",
            "Recordatorio de entrevista",
            f"Tu entrevista para {vacante.titulo} es en 24 horas ({cuando}).",
            "postulacion",
            postulacion.id,
            correo_texto=f"Tu entrevista para «{vacante.titulo}» es el {cuando}.\n\n{liga}",
        )
        notificaciones.crear(
            db,
            horario.reclutador_id,
            "recordatorio_entrevista",
            "Recordatorio de entrevista",
            f"Tienes una entrevista con {candidato.nombre} {candidato.apellidos} para "
            f"{vacante.titulo} en 24 horas ({cuando}).",
            "entrevista",
            entrevista.id,
            correo_texto=(
                f"Entrevista con {candidato.nombre} {candidato.apellidos} para "
                f"«{vacante.titulo}» el {cuando}.\n\n{liga}"
            ),
        )
        recordadas += 1
    db.flush()
    return recordadas
