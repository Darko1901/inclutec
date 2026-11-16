from typing import Literal

from app.esquemas.comunes import Esquema, FechaHora

TipoNotificacion = Literal[
    "cambio_estado",
    "nueva_postulacion",
    "entrevista_agendada",
    "entrevista_cancelada",
    "recordatorio_entrevista",
    "empresa_validada",
    "empresa_rechazada",
    "vacante_suspendida",
    "vacante_actualizada",
    "reporte_resuelto",
]


class Referencia(Esquema):
    tipo: Literal["postulacion", "entrevista", "empresa", "reporte", "vacante"]
    id: int


class Notificacion(Esquema):
    id: int
    tipo: TipoNotificacion
    titulo: str
    mensaje: str
    referencia: Referencia | None
    leida: bool
    creado_en: FechaHora


class ResumenNotificaciones(Esquema):
    no_leidas: int


class PreferenciaNotificacion(Esquema):
    """Se valida a mano para dar el mensaje del contrato."""

    tipo: str | None = None
    push: bool | None = None
    correo: bool | None = None


class PreferenciaSalida(Esquema):
    tipo: TipoNotificacion
    push: bool
    correo: bool


class Dispositivo(Esquema):
    expo_push_token: str | None = None
    plataforma: str | None = None
