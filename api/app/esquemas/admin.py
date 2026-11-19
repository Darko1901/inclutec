"""Cuerpos y respuestas de los endpoints del panel de administración."""

from typing import Literal

from app.esquemas.comunes import Esquema, FechaHora

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
