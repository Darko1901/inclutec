from datetime import date
from typing import Literal

from app.esquemas.comunes import (
    AjusteRef,
    Esquema,
    FechaHora,
    MunicipioRef,
    NivelEducativoRef,
    Ref,
)

SeccionPendiente = Literal[
    "datos_personales", "resumen", "foto", "preferencias", "formacion", "experiencia", "habilidades"
]
Nivel = Literal["basico", "intermedio", "avanzado"]


class UsuarioPerfil(Esquema):
    id: int
    nombre: str
    apellidos: str
    correo: str
    telefono: str | None


class PerfilCandidato(Esquema):
    usuario: UsuarioPerfil
    municipio: MunicipioRef | None
    jornada: Ref | None
    resumen: str | None
    foto_url: str | None
    disponible_reubicacion: bool
    modalidades: list[Ref]
    categorias: list[Ref]
    compartir_ajustes: Literal["preguntar", "siempre", "nunca"]
    consentimiento_sensibles_en: FechaHora | None
    necesidades: list[AjusteRef]
    nota_ajustes: str | None
    completitud: int
    secciones_pendientes: list[SeccionPendiente]
    perfil_minimo: bool
    actualizado_en: FechaHora


class PerfilCandidatoEntrada(Esquema):
    """Se valida a mano (app/validaciones_candidato.py) para dar los mensajes del contrato."""

    nombre: str | None = None
    apellidos: str | None = None
    telefono: str | None = None
    municipio_id: int | None = None
    jornada_id: int | None = None
    resumen: str | None = None
    disponible_reubicacion: bool | None = None
    modalidad_ids: list[int] | None = None
    categoria_ids: list[int] | None = None
    compartir_ajustes: str | None = None


class Consentimiento(Esquema):
    otorgado: bool | None = None


class NecesidadesEntrada(Esquema):
    ajuste_ids: list[int] | None = None
    nota_ajustes: str | None = None


class Necesidades(Esquema):
    necesidades: list[AjusteRef]
    nota_ajustes: str | None


class EliminarCuenta(Esquema):
    contrasena: str | None = None


class Experiencia(Esquema):
    id: int
    puesto: str
    empresa: str
    fecha_inicio: date
    fecha_fin: date | None
    actual: bool
    descripcion: str | None


class ExperienciaEntrada(Esquema):
    puesto: str | None = None
    empresa: str | None = None
    fecha_inicio: str | None = None
    fecha_fin: str | None = None
    actual: bool | None = None
    descripcion: str | None = None


class Formacion(Esquema):
    id: int
    nivel_educativo: NivelEducativoRef
    institucion: str
    carrera: str | None
    estado: Literal["concluida", "en_curso", "trunca"]
    fecha_inicio: date | None
    fecha_fin: date | None


class FormacionEntrada(Esquema):
    nivel_educativo_id: int | None = None
    institucion: str | None = None
    carrera: str | None = None
    estado: str | None = None
    fecha_inicio: str | None = None
    fecha_fin: str | None = None


class HabilidadCandidato(Esquema):
    id: int
    nombre: str
    nivel: Nivel


class HabilidadEntrada(Esquema):
    habilidad_id: int | None = None
    nivel: str | None = None


class HabilidadesEntrada(Esquema):
    habilidades: list[HabilidadEntrada] | None = None


class CV(Esquema):
    id: int
    nombre: str
    apellidos: str
    foto_url: str | None
    municipio: MunicipioRef | None
    resumen: str | None
    modalidades: list[Ref]
    experiencias: list[Experiencia]
    formaciones: list[Formacion]
    habilidades: list[HabilidadCandidato]
    correo: str | None
    telefono: str | None
