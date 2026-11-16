from typing import Literal

from app.esquemas.candidato import CV
from app.esquemas.comunes import AjusteRef, Esquema, FechaHora
from app.esquemas.entrevista import Entrevista
from app.esquemas.vacante import (
    DesgloseFormacion,
    DesgloseHabilidades,
    DesgloseModalidad,
)

EstadoPostulacion = Literal[
    "postulada", "en_revision", "entrevista", "aceptada", "no_seleccionada", "retirada"
]


class EmpresaDePostulacion(Esquema):
    id: int
    nombre_comercial: str
    logo_url: str | None


class VacanteDePostulacion(Esquema):
    id: int
    titulo: str
    empresa: EmpresaDePostulacion


class EventoHistorial(Esquema):
    estado_anterior: EstadoPostulacion | None
    estado_nuevo: EstadoPostulacion
    mensaje: str | None
    creado_en: FechaHora


class PostulacionEntrada(Esquema):
    """Se valida a mano (app/servicios/postulaciones.py) para dar los mensajes del contrato."""

    vacante_id: int | None = None
    mensaje: str | None = None
    compartir_ajustes: bool | None = None


class PostulacionDetalle(Esquema):
    id: int
    vacante: VacanteDePostulacion
    estado: EstadoPostulacion
    mensaje: str | None
    comparte_ajustes: bool
    creado_en: FechaHora
    actualizado_en: FechaHora
    historial: list[EventoHistorial]
    entrevista: Entrevista | None
    puede_retirar: bool


class PostulacionResumen(Esquema):
    id: int
    vacante: VacanteDePostulacion
    estado: EstadoPostulacion
    creado_en: FechaHora
    actualizado_en: FechaHora
    entrevista_inicio: FechaHora | None


class CambioEstadoPostulacion(Esquema):
    estado: str | None = None
    mensaje: str | None = None


class ResultadoCambioEstado(Esquema):
    id: int
    estado: EstadoPostulacion
    historial: list[EventoHistorial]
    transiciones_permitidas: list[EstadoPostulacion]


class AutorObservacion(Esquema):
    id: int
    nombre: str
    apellidos: str


class Observacion(Esquema):
    id: int
    texto: str
    autor: AutorObservacion
    creado_en: FechaHora


class ObservacionEntrada(Esquema):
    texto: str | None = None


class CandidatoDePostulado(Esquema):
    id: int
    nombre: str
    apellidos: str
    foto_url: str | None


class Postulado(Esquema):
    postulacion_id: int
    candidato: CandidatoDePostulado
    compatibilidad: int
    estado: EstadoPostulacion
    creado_en: FechaHora
    ajustes_por_confirmar: bool


class PostulacionDePostulado(Esquema):
    id: int
    estado: EstadoPostulacion
    mensaje: str | None
    creado_en: FechaHora
    historial: list[EventoHistorial]


class VacanteMini(Esquema):
    id: int
    titulo: str


class ComponentesReclutador(Esquema):
    h: float
    m: float
    f: float


class CompatibilidadReclutador(Esquema):
    """Desglose para el reclutador: sin el componente A y sin necesidades."""

    puntaje: int
    componentes: ComponentesReclutador
    habilidades: DesgloseHabilidades
    modalidad: DesgloseModalidad
    formacion: DesgloseFormacion


class NecesidadDePostulado(AjusteRef):
    estado: Literal["existente", "bajo_solicitud", "no_declarada"]


class PostuladoDetalle(Esquema):
    postulacion: PostulacionDePostulado
    vacante: VacanteMini
    candidato: CV
    compatibilidad: CompatibilidadReclutador
    necesidades: list[NecesidadDePostulado] | None
    nota_ajustes: str | None
    transiciones_permitidas: list[EstadoPostulacion]
    entrevista: Entrevista | None
