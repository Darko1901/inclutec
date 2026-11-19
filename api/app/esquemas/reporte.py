from typing import Literal

from app.esquemas.comunes import Esquema, FechaHora, Ref

EstadoReporte = Literal["abierto", "en_revision", "resuelto", "descartado"]
TipoReporte = Literal["vacante", "empresa", "candidato"]


class ReporteEntrada(Esquema):
    """Exactamente uno de vacante_id, empresa_id o candidato_id. Se valida a mano."""

    motivo_reporte_id: int | None = None
    vacante_id: int | None = None
    empresa_id: int | None = None
    candidato_id: int | None = None
    descripcion: str | None = None


class ReporteCreado(Esquema):
    id: int
    estado: EstadoReporte
    creado_en: FechaHora


class ObjetoReportado(Esquema):
    id: int
    nombre: str


class Persona(Esquema):
    id: int
    nombre: str
    apellidos: str


class PersonaCorta(Esquema):
    id: int
    nombre: str


class ReporteAdmin(Esquema):
    id: int
    tipo: TipoReporte
    objeto: ObjetoReportado
    motivo: Ref
    reportante: Persona
    estado: EstadoReporte
    creado_en: FechaHora


class EventoReporte(Esquema):
    estado_anterior: EstadoReporte | None
    estado_nuevo: EstadoReporte
    comentario: str | None
    usuario: PersonaCorta | None
    creado_en: FechaHora


class ReportePrevio(Esquema):
    id: int
    motivo: str
    estado: EstadoReporte
    creado_en: FechaHora


class ReporteAdminDetalle(Esquema):
    reporte: ReporteAdmin
    descripcion: str | None
    resolucion: str | None
    accion: Literal["ninguna", "suspension"] | None
    atendido_por: Persona | None
    cerrado_en: FechaHora | None
    historial: list[EventoReporte]
    objeto_estado: str
    reportes_previos: list[ReportePrevio]


class SeguimientoReporte(Esquema):
    estado: str | None = None
    comentario: str | None = None
    resolucion: str | None = None
    accion: str | None = None
