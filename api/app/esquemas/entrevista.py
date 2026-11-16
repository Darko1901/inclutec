from datetime import date
from typing import Literal

from app.esquemas.comunes import Esquema, FechaHora

EstadoEntrevista = Literal["agendada", "realizada", "no_asistio", "cancelada"]
EstadoHorario = Literal["libre", "agendado", "cancelado"]


class VacanteMini(Esquema):
    id: int
    titulo: str


class EmpresaMini(Esquema):
    id: int
    nombre_comercial: str


class Entrevista(Esquema):
    id: int
    estado: EstadoEntrevista
    inicio: FechaHora
    fin: FechaHora
    duracion_min: Literal[30, 45, 60]
    liga: str
    puede_cancelar: bool
    vacante: VacanteMini
    empresa: EmpresaMini
    creado_en: FechaHora


class Horario(Esquema):
    id: int
    vacante_id: int
    inicio: FechaHora
    fin: FechaHora
    duracion_min: int
    estado: EstadoHorario
    liga: str | None


class HorarioEntrada(Esquema):
    """Se valida a mano (app/servicios/horarios.py) para dar los mensajes del contrato."""

    vacante_id: int | None = None
    inicio: str | None = None
    duracion_min: int | None = None
    liga: str | None = None


class ReservaEntrevista(Esquema):
    horario_id: int | None = None


class ResultadoEntrevista(Esquema):
    estado: str | None = None
    motivo_cancelacion: str | None = None


class CancelacionCandidato(Esquema):
    motivo: str | None = None


class CandidatoDeAgenda(Esquema):
    id: int
    nombre: str
    apellidos: str


class EntrevistaDeAgenda(Esquema):
    id: int
    estado: EstadoEntrevista
    postulacion_id: int
    candidato: CandidatoDeAgenda


class VacanteDeAgenda(Esquema):
    id: int
    titulo: str


class HorarioDeAgenda(Esquema):
    id: int
    inicio: FechaHora
    fin: FechaHora
    duracion_min: int
    liga: str
    estado: EstadoHorario
    vacante: VacanteDeAgenda
    entrevista: EntrevistaDeAgenda | None


class DiaAgenda(Esquema):
    fecha: date
    horarios: list[HorarioDeAgenda]
