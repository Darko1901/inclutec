from typing import Literal

from app.esquemas.comunes import AjusteRef, Esquema, FechaHora, MunicipioRef, NivelEducativoRef, Ref

CategoriaAjuste = Literal[
    "movilidad", "visual", "auditiva", "comunicacion", "cognitiva_psicosocial", "general"
]
TipoAjuste = Literal["existente", "bajo_solicitud"]
EstadoVacante = Literal["borrador", "publicada", "pausada", "cerrada", "suspendida"]


class EmpresaDeVacante(Esquema):
    id: int
    nombre_comercial: str
    logo_url: str | None
    validada: bool


class Salario(Esquema):
    min: float | int | None
    max: float | int | None


class AjusteDeVacanteResumen(Esquema):
    id: int
    nombre: str
    categoria: CategoriaAjuste
    tipo: TipoAjuste


class AjusteDeVacante(AjusteDeVacanteResumen):
    descripcion: str


class HabilidadDeVacante(Esquema):
    id: int
    nombre: str
    obligatoria: bool


class VacanteResumen(Esquema):
    id: int
    titulo: str
    empresa: EmpresaDeVacante
    categoria: Ref
    modalidad: Ref
    jornada: Ref
    municipio: MunicipioRef
    salario: Salario | None
    compatibilidad: int | None
    ajustes: list[AjusteDeVacanteResumen]
    cubre_mis_necesidades: bool
    publicada_en: FechaHora
    postulacion_id: int | None


class VacanteDetalle(Esquema):
    id: int
    titulo: str
    descripcion: str
    empresa: EmpresaDeVacante
    categoria: Ref
    modalidad: Ref
    jornada: Ref
    tipo_contrato: Ref
    municipio: MunicipioRef
    direccion: str | None
    plazas: int
    salario: Salario | None
    mostrar_salario: bool
    nivel_educativo: NivelEducativoRef | None
    experiencia_anios: int
    habilidades: list[HabilidadDeVacante]
    ajustes: list[AjusteDeVacante]
    sin_condiciones_accesibilidad: bool
    notas_accesibilidad: str | None
    estado: EstadoVacante
    motivo_estado: str | None
    publicada_en: FechaHora | None
    actualizado_en: FechaHora
    postulacion_id: int | None
    postulados: int | None


class VacanteGuardada(Esquema):
    vacante: VacanteDetalle
    postulados_notificados: int


class VacanteReclutador(Esquema):
    id: int
    titulo: str
    estado: EstadoVacante
    modalidad: Ref
    postulados: int
    nuevas: int
    publicada_en: FechaHora | None
    actualizado_en: FechaHora


class HabilidadEntrada(Esquema):
    habilidad_id: int | None = None
    obligatoria: bool | None = None


class AjusteEntrada(Esquema):
    ajuste_id: int | None = None
    tipo: str | None = None


class VacanteEntrada(Esquema):
    """Se valida a mano (app/validaciones_vacante.py) para dar los mensajes del contrato."""

    titulo: str | None = None
    categoria_id: int | None = None
    descripcion: str | None = None
    jornada_id: int | None = None
    tipo_contrato_id: int | None = None
    plazas: int | None = None
    modalidad_id: int | None = None
    municipio_id: int | None = None
    direccion: str | None = None
    salario_min: float | None = None
    salario_max: float | None = None
    mostrar_salario: bool | None = None
    nivel_educativo_id: int | None = None
    experiencia_anios: int | None = None
    habilidades: list[HabilidadEntrada] | None = None
    ajustes: list[AjusteEntrada] | None = None
    sin_condiciones_accesibilidad: bool | None = None
    notas_accesibilidad: str | None = None
    estado: str | None = None


class CambioEstadoVacante(Esquema):
    estado: str | None = None


class DesgloseHabilidades(Esquema):
    obligatorias_cumplidas: list[Ref]
    obligatorias_faltantes: list[Ref]
    deseables_cumplidas: list[Ref]
    deseables_faltantes: list[Ref]


class NecesidadCubierta(AjusteRef):
    tipo: TipoAjuste


class DesgloseNecesidades(Esquema):
    cubiertas: list[NecesidadCubierta]
    no_cubiertas: list[AjusteRef]


class DesgloseModalidad(Esquema):
    vacante: Ref
    coincide: bool


class DesgloseFormacion(Esquema):
    requerida: NivelEducativoRef | None
    cumple: Literal["si", "cursando", "no"]


class Componentes(Esquema):
    h: float
    a: float
    m: float
    f: float


class CompatibilidadDesglose(Esquema):
    puntaje: int
    componentes: Componentes
    habilidades: DesgloseHabilidades
    necesidades: DesgloseNecesidades
    modalidad: DesgloseModalidad
    formacion: DesgloseFormacion
    calculado_en: FechaHora
