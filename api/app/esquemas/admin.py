"""Cuerpos y respuestas de los endpoints del panel de administración."""

from typing import Literal

from app.esquemas.comunes import Esquema, FechaHora, Ref
from app.esquemas.empresa import EmpresaPropia

Rol = Literal["candidato", "reclutador", "administrador"]
EstadoUsuario = Literal["activo", "suspendido", "eliminado"]


class EmpresaMini(Esquema):
    id: int
    nombre_comercial: str


class UsuarioAdmin(Esquema):
    id: int
    nombre: str
    apellidos: str
    correo: str
    telefono: str | None
    rol: Rol
    estado: EstadoUsuario
    empresa: EmpresaMini | None
    creado_en: FechaHora
    ultimo_acceso_en: FechaHora | None


class TotalesUsuario(Esquema):
    postulaciones: int | None
    vacantes: int | None
    reportes_recibidos: int
    reportes_hechos: int


class UsuarioAdminDetalle(Esquema):
    """Nunca incluye las necesidades de ajuste del candidato."""

    usuario: UsuarioAdmin
    motivo_estado: str | None
    puesto: str | None
    totales: TotalesUsuario


class UsuarioAdminEntrada(Esquema):
    """Se valida a mano para dar los mensajes del contrato."""

    rol: str | None = None
    nombre: str | None = None
    apellidos: str | None = None
    correo: str | None = None
    telefono: str | None = None
    contrasena: str | None = None
    empresa_id: int | None = None
    puesto: str | None = None


class CambioEstado(Esquema):
    estado: str | None = None
    motivo: str | None = None


EstadoEmpresa = Literal["pendiente", "validada", "rechazada", "suspendida"]


class EmpresaAdmin(Esquema):
    id: int
    razon_social: str
    nombre_comercial: str
    rfc: str
    sector: Ref
    estado: EstadoEmpresa
    reclutadores: int
    vacantes_activas: int
    documento: bool
    creado_en: FechaHora


class ReclutadorDeEmpresa(Esquema):
    usuario_id: int
    nombre: str
    apellidos: str
    correo: str
    puesto: str
    estado: EstadoUsuario


class EmpresaAdminDetalle(Esquema):
    empresa: EmpresaPropia
    reclutadores: list[ReclutadorDeEmpresa]
    rfc_duplicado: bool
    reportes: int


class EmpresaAdminEntrada(Esquema):
    """Se valida a mano para dar los mensajes del contrato."""

    razon_social: str | None = None
    nombre_comercial: str | None = None
    rfc: str | None = None
    sector_id: int | None = None
    tamano_empresa_id: int | None = None
    municipio_id: int | None = None
    direccion: str | None = None
    descripcion: str | None = None
    sitio_web: str | None = None
    practicas_inclusion: str | None = None


class Validacion(Esquema):
    decision: str | None = None
    motivo: str | None = None


class ResultadoEstadoEmpresa(Esquema):
    empresa: EmpresaPropia
    vacantes_suspendidas: int
    postulados_notificados: int


class VacanteAdmin(Esquema):
    id: int
    titulo: str
    empresa: EmpresaMini
    categoria: Ref
    modalidad: Ref
    estado: Literal["borrador", "publicada", "pausada", "cerrada", "suspendida"]
    publicada_en: FechaHora | None
    postulados: int
    reportes_abiertos: int


class CategoriaAdmin(Esquema):
    id: int
    nombre: str
    descripcion: str | None
    activo: bool
    habilidades: int
    vacantes: int


class CategoriaEntrada(Esquema):
    nombre: str | None = None
    descripcion: str | None = None


class HabilidadAdmin(Esquema):
    id: int
    nombre: str
    categoria: Ref
    activo: bool
    candidatos: int
    vacantes: int


class HabilidadEntrada(Esquema):
    nombre: str | None = None
    categoria_id: int | None = None


class Activacion(Esquema):
    activo: bool | None = None


class CatalogoAdmin(Esquema):
    """Solo vienen los campos que aplican al tipo (se responde con exclude_unset)."""

    id: int
    nombre: str
    activo: bool
    en_uso: int
    descripcion: str | None = None
    categoria: str | None = None
    orden: int | None = None
    rango: str | None = None
    aplica_a: str | None = None


class CatalogoEntrada(Esquema):
    nombre: str | None = None
    descripcion: str | None = None
    categoria: str | None = None
    orden: int | None = None
    rango: str | None = None
    aplica_a: str | None = None
