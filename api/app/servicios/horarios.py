"""Horarios de entrevista, reservas y agenda (CU-11 y CU-18, sección «Horarios y entrevistas»)."""

import re
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.entrevista import (
    CandidatoDeAgenda,
    DiaAgenda,
    EntrevistaDeAgenda,
    Horario,
    HorarioDeAgenda,
    HorarioEntrada,
    VacanteDeAgenda,
)
from app.modelos import (
    Empresa,
    Entrevista,
    HorarioEntrevista,
    Postulacion,
    Reclutador,
    Usuario,
    Vacante,
)
from app.servicios import entrevistas as servicio_entrevistas
from app.servicios import notificaciones
from app.servicios.entrevistas import ahora, fin_de
from app.servicios.notificaciones import Entrega
from app.validaciones import lanzar_si_hay_campos

DURACIONES = (30, 45, 60)
MAX_MOTIVO = 255
LIGA_VALIDA = re.compile(r"https://(meet\.google\.com|teams\.microsoft\.com)/\S+", re.IGNORECASE)
ZONA = ZoneInfo("America/Mexico_City")
DIAS_AGENDA_POR_OMISION = 30


def no_encontrado() -> ApiError:
    return ApiError(404, "no_encontrado", "Ese horario no existe.")


def a_horario(h: HorarioEntrevista, *, con_liga: bool) -> Horario:
    return Horario(
        id=h.id,
        vacante_id=h.vacante_id,
        inicio=h.inicio,
        fin=fin_de(h),
        duracion_min=h.duracion_min,
        estado=h.estado,
        liga=h.liga if con_liga else None,
    )


def _id_valido(id_: int) -> bool:
    return 1 <= id_ <= 2**63 - 1


def horario_propio(
    db: Session, empresa_id: int, id_: int, *, bloquear: bool = False
) -> HorarioEntrevista:
    """Un horario de otra empresa responde como si no existiera.

    `bloquear` lo toma con SELECT … FOR UPDATE: al eliminarlo, una reserva que llega al mismo
    tiempo termina primero y el horario ya no está libre.
    """
    if not _id_valido(id_):
        horario = None
    elif bloquear:
        horario = db.get(HorarioEntrevista, id_, with_for_update=True, populate_existing=True)
    else:
        horario = db.get(HorarioEntrevista, id_)
    vacante = db.get(Vacante, horario.vacante_id) if horario else None
    if horario is None or vacante is None or vacante.empresa_id != empresa_id:
        raise no_encontrado()
    return horario


def _parsear_inicio(texto: str | None) -> datetime | None:
    if not isinstance(texto, str):
        return None
    try:
        valor = datetime.fromisoformat(texto.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    # Una hora sin zona no se puede interpretar: se pide con zona (UTC con Z, como el contrato).
    return valor.astimezone(UTC) if valor.tzinfo is not None else None


def publicar(db: Session, empresa: Empresa, reclutador_id: int, datos: HorarioEntrada) -> Horario:
    # Se bloquea al reclutador mientras publica para que dos horarios no se traslapen en carrera.
    db.execute(
        select(Reclutador.usuario_id)
        .where(Reclutador.usuario_id == reclutador_id)
        .with_for_update()
    )
    campos: dict[str, str] = {}
    inicio = _parsear_inicio(datos.inicio)
    if inicio is None:
        campos["inicio"] = "Elige la fecha y la hora de inicio."
    elif inicio <= ahora():
        campos["inicio"] = "Elige una fecha y una hora que aún no pasen."
    if datos.duracion_min not in DURACIONES:
        campos["duracion_min"] = "La duración puede ser de 30, 45 o 60 minutos."
    if not isinstance(datos.liga, str) or LIGA_VALIDA.fullmatch(datos.liga.strip()) is None:
        campos["liga"] = "Escribe una liga de Google Meet o de Microsoft Teams."
    vacante = (
        db.get(Vacante, datos.vacante_id)
        if isinstance(datos.vacante_id, int) and _id_valido(datos.vacante_id)
        else None
    )
    if vacante is None or vacante.empresa_id != empresa.id:
        raise ApiError(404, "no_encontrado", "La vacante no existe.")
    if vacante.estado != "publicada":
        campos["vacante_id"] = "Elige una vacante publicada."
    lanzar_si_hay_campos(campos)

    fin = inicio + timedelta(minutes=datos.duracion_min)
    vigentes = db.scalars(
        select(HorarioEntrevista).where(
            HorarioEntrevista.reclutador_id == reclutador_id,
            HorarioEntrevista.estado != "cancelado",
        )
    )
    if any(h.inicio < fin and fin_de(h) > inicio for h in vigentes):
        raise ApiError(409, "horario_traslapado", "Este horario se traslapa con otro.")

    horario = HorarioEntrevista(
        vacante_id=vacante.id,
        reclutador_id=reclutador_id,
        inicio=inicio,
        duracion_min=datos.duracion_min,
        liga=datos.liga.strip(),
        estado="libre",
    )
    db.add(horario)
    db.flush()
    return a_horario(horario, con_liga=True)


def eliminar(db: Session, horario: HorarioEntrevista) -> None:
    """Solo un horario libre. Si ya tuvo entrevistas (canceladas), se conserva el historial."""
    if horario.estado != "libre":
        raise ApiError(
            409,
            "estado_invalido",
            "Solo se puede eliminar un horario libre. Si ya está agendado, cancela la entrevista.",
        )
    tuvo_entrevistas = (
        db.scalar(select(Entrevista.id).where(Entrevista.horario_id == horario.id).limit(1))
        is not None
    )
    if tuvo_entrevistas:
        horario.estado = "cancelado"
    else:
        db.delete(horario)
    db.flush()


def disponibles(db: Session, candidato_id: int, vacante_id: int | None) -> list[Horario]:
    """Libres y futuros, del más próximo al más lejano y sin la liga."""
    if not isinstance(vacante_id, int):
        lanzar_si_hay_campos({"vacante_id": "Indica la vacante."})
    en_entrevista = (
        db.scalar(
            select(Postulacion.id).where(
                Postulacion.candidato_id == candidato_id,
                Postulacion.vacante_id == vacante_id,
                Postulacion.estado == "entrevista",
            )
        )
        is not None
    )
    if not en_entrevista:
        raise ApiError(
            403, "sin_permiso", "Todavía no estás en etapa de entrevista para esta vacante."
        )
    filas = db.scalars(
        select(HorarioEntrevista)
        .where(
            HorarioEntrevista.vacante_id == vacante_id,
            HorarioEntrevista.estado == "libre",
            HorarioEntrevista.inicio > ahora(),
        )
        .order_by(HorarioEntrevista.inicio, HorarioEntrevista.id)
    )
    return [a_horario(h, con_liga=False) for h in filas]


# --- Agenda del reclutador ----------------------------------------------------------------------


def _fecha(texto: object) -> date | None:
    if not isinstance(texto, str) or re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto) is None:
        return None
    try:
        return date.fromisoformat(texto)
    except ValueError:
        return None


def agenda(
    db: Session,
    reclutador_id: int,
    desde: str | None,
    hasta: str | None,
    vacante_id: int | None,
) -> list[DiaAgenda]:
    """Horarios libres y agendados por día (hora de la Ciudad de México), en orden cronológico."""
    hoy = ahora().astimezone(ZONA).date()
    campos: dict[str, str] = {}
    d = _fecha(desde) if desde is not None else hoy
    if d is None:
        campos["desde"] = "Usa el formato AAAA-MM-DD."
    h = (
        _fecha(hasta)
        if hasta is not None
        else (d + timedelta(days=DIAS_AGENDA_POR_OMISION) if d else None)
    )
    if h is None:
        campos["hasta"] = "Usa el formato AAAA-MM-DD."
    if d is not None and h is not None and d > h:
        campos["hasta"] = "La fecha final no puede ser anterior a la inicial."
    lanzar_si_hay_campos(campos)

    desde_utc = datetime.combine(d, time.min, tzinfo=ZONA).astimezone(UTC)
    hasta_utc = datetime.combine(h, time.max, tzinfo=ZONA).astimezone(UTC)
    consulta = select(HorarioEntrevista).where(
        HorarioEntrevista.reclutador_id == reclutador_id,
        HorarioEntrevista.estado != "cancelado",
        HorarioEntrevista.inicio >= desde_utc,
        HorarioEntrevista.inicio <= hasta_utc,
    )
    if vacante_id is not None:
        consulta = consulta.where(HorarioEntrevista.vacante_id == vacante_id)

    dias: dict[date, list[HorarioDeAgenda]] = {}
    for horario in db.scalars(consulta.order_by(HorarioEntrevista.inicio, HorarioEntrevista.id)):
        vacante = db.get(Vacante, horario.vacante_id)
        entrevista = db.scalar(
            select(Entrevista).where(
                Entrevista.horario_id == horario.id, Entrevista.estado != "cancelada"
            )
        )
        de_agenda = None
        if entrevista is not None:
            postulacion = db.get(Postulacion, entrevista.postulacion_id)
            candidato = db.get(Usuario, postulacion.candidato_id)
            de_agenda = EntrevistaDeAgenda(
                id=entrevista.id,
                estado=entrevista.estado,
                postulacion_id=postulacion.id,
                candidato=CandidatoDeAgenda(
                    id=candidato.id, nombre=candidato.nombre, apellidos=candidato.apellidos
                ),
            )
        fecha_local = horario.inicio.astimezone(ZONA).date()
        dias.setdefault(fecha_local, []).append(
            HorarioDeAgenda(
                id=horario.id,
                inicio=horario.inicio,
                fin=fin_de(horario),
                duracion_min=horario.duracion_min,
                liga=horario.liga,
                estado=horario.estado,
                vacante=VacanteDeAgenda(id=vacante.id, titulo=vacante.titulo),
                entrevista=de_agenda,
            )
        )
    return [DiaAgenda(fecha=f, horarios=hs) for f, hs in sorted(dias.items())]


# --- Reservar y cancelar ------------------------------------------------------------------------


def _texto_fecha(inicio: datetime) -> str:
    return inicio.astimezone(ZONA).strftime("%d/%m/%Y a las %H:%M (hora de la Ciudad de México)")


def reservar(db: Session, postulacion: Postulacion, horario_id: object) -> Entrevista:
    """Toma el horario dentro de la transacción con `SELECT … FOR UPDATE`.

    Si dos candidatos tocan «Agendar» a la vez, uno gana y el otro recibe `409 horario_ocupado`.
    """
    if not isinstance(horario_id, int) or isinstance(horario_id, bool):
        lanzar_si_hay_campos({"horario_id": "Elige un horario."})
    if postulacion.estado != "entrevista" or servicio_entrevistas.entrevista_vigente_de(
        db, postulacion.id
    ):
        raise ApiError(
            409,
            "estado_invalido",
            "Solo puedes agendar una entrevista cuando la empresa te la pide y aún no tienes una.",
        )
    # El bloqueo va sobre el horario: el segundo en llegar espera y ya lo encuentra tomado.
    horario = (
        db.scalar(
            select(HorarioEntrevista).where(HorarioEntrevista.id == horario_id).with_for_update()
        )
        if _id_valido(horario_id)
        else None
    )
    if horario is None or horario.vacante_id != postulacion.vacante_id:
        raise ApiError(404, "no_encontrado", "Ese horario ya no existe.")
    if horario.estado != "libre" or horario.inicio <= ahora():
        raise ApiError(409, "horario_ocupado", "Ese horario acaba de ser tomado, elige otro.")

    entrevista = Entrevista(horario_id=horario.id, postulacion_id=postulacion.id, estado="agendada")
    db.add(entrevista)
    horario.estado = "agendado"
    try:
        db.flush()
    except IntegrityError as error:
        # El índice único parcial es la última defensa contra una doble reservación.
        db.rollback()
        raise ApiError(
            409, "horario_ocupado", "Ese horario acaba de ser tomado, elige otro."
        ) from error

    vacante = db.get(Vacante, horario.vacante_id)
    candidato = db.get(Usuario, postulacion.candidato_id)
    cuando = _texto_fecha(horario.inicio)
    # Avisa al reclutador y manda la confirmación por correo a ambos.
    notificaciones.crear(
        db,
        horario.reclutador_id,
        "entrevista_agendada",
        "Nueva entrevista",
        f"{candidato.nombre} {candidato.apellidos} agendó una entrevista para {vacante.titulo}.",
        "entrevista",
        entrevista.id,
        correo_siempre=True,
        correo_texto=(
            f"{candidato.nombre} {candidato.apellidos} agendó una entrevista para "
            f"«{vacante.titulo}» el {cuando}.\n\nLiga: {horario.liga}"
        ),
    )
    _confirmar_al_candidato(db, postulacion, vacante, cuando, horario.liga)
    db.flush()
    return entrevista


def _confirmar_al_candidato(
    db: Session, postulacion: Postulacion, vacante: Vacante, cuando: str, liga: str
) -> None:
    """Correo de confirmación para el candidato (no crea aviso en la app: ya sabe que agendó)."""
    candidato = db.get(Usuario, postulacion.candidato_id)
    entrega = Entrega(
        tipo="entrevista_agendada",
        titulo="Confirmación de tu entrevista",
        mensaje=f"Tu entrevista para {vacante.titulo} quedó agendada.",
        referencia={"tipo": "postulacion", "id": postulacion.id},
        correo=candidato.correo,
        correo_texto=(
            f"Tu entrevista para «{vacante.titulo}» quedó agendada para el {cuando}.\n\n"
            f"Liga: {liga}"
        ),
    )
    db.info.setdefault("entregas", []).append(entrega)


def cancelar_por_reclutador(
    db: Session, entrevista: Entrevista, motivo: str, reclutador_id: int
) -> None:
    """El horario queda «cancelado» (ya no se ofrece) y se avisa al candidato por app y correo."""
    horario = db.get(HorarioEntrevista, entrevista.horario_id)
    postulacion = db.get(Postulacion, entrevista.postulacion_id)
    vacante = db.get(Vacante, horario.vacante_id)
    empresa = db.get(Empresa, vacante.empresa_id)

    entrevista.estado = "cancelada"
    entrevista.motivo_cancelacion = motivo
    entrevista.cancelada_por = reclutador_id
    horario.estado = "cancelado"
    notificaciones.crear(
        db,
        postulacion.candidato_id,
        "entrevista_cancelada",
        "Entrevista cancelada",
        f"{empresa.nombre_comercial} canceló tu entrevista de {vacante.titulo}. Motivo: {motivo}",
        "postulacion",
        postulacion.id,
    )
