from typing import Literal

from app.esquemas.comunes import Esquema, FechaHora, MunicipioRef, Ref
from app.esquemas.vacante import VacanteResumen


class TamanoEmpresa(Ref):
    rango: str


class EmpresaResumen(Esquema):
    id: int
    nombre_comercial: str
    logo_url: str | None
    sector: Ref
    tamano_empresa: TamanoEmpresa
    municipio: MunicipioRef
    vacantes_publicadas: int


class EmpresaPropia(Esquema):
    id: int
    razon_social: str
    nombre_comercial: str
    rfc: str
    sector: Ref
    tamano_empresa: TamanoEmpresa
    municipio: MunicipioRef
    direccion: str | None
    descripcion: str | None
    sitio_web: str | None
    logo_url: str | None
    practicas_inclusion: str | None
    documento_url: str | None
    estado: Literal["pendiente", "validada", "rechazada", "suspendida"]
    motivo_estado: str | None
    validada_en: FechaHora | None
    puesto: str | None
    datos_fiscales_editables: bool


class EmpresaEntrada(Esquema):
    """Se valida a mano (app/validaciones_empresa.py) para dar los mensajes del contrato."""

    nombre_comercial: str | None = None
    sector_id: int | None = None
    tamano_empresa_id: int | None = None
    municipio_id: int | None = None
    direccion: str | None = None
    descripcion: str | None = None
    sitio_web: str | None = None
    practicas_inclusion: str | None = None
    razon_social: str | None = None
    rfc: str | None = None
    puesto: str | None = None


class EmpresaPublica(Esquema):
    """Ficha pública: sin razón social, RFC ni documento."""

    id: int
    nombre_comercial: str
    logo_url: str | None
    sector: Ref
    tamano_empresa: TamanoEmpresa
    municipio: MunicipioRef
    descripcion: str | None
    sitio_web: str | None
    practicas_inclusion: str | None
    vacantes: list[VacanteResumen]
