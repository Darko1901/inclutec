from typing import Literal

from pydantic import Field

from app.esquemas.comunes import Esquema, FechaHora


class Login(Esquema):
    """Los campos se validan a mano (app/validaciones.py) para dar los mensajes del contrato."""

    correo: str | None = None
    contrasena: str | None = None


class EmpresaDeSesion(Esquema):
    id: int
    nombre_comercial: str
    estado: Literal["pendiente", "validada", "rechazada", "suspendida"]


class Usuario(Esquema):
    id: int
    correo: str
    nombre: str
    apellidos: str
    telefono: str | None
    rol: Literal["candidato", "reclutador", "administrador"]
    estado: Literal["activo", "suspendido", "eliminado"]
    empresa: EmpresaDeSesion | None
    consentimiento_sensibles: bool | None


class Sesion(Esquema):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expira_en: FechaHora
    usuario: Usuario


class Logout(Esquema):
    expo_push_token: str | None = Field(default=None, max_length=255)


class RegistroCandidato(Esquema):
    nombre: str | None = None
    apellidos: str | None = None
    correo: str | None = None
    telefono: str | None = None
    municipio_id: int | None = None
    contrasena: str | None = None
    acepta_aviso: bool | None = None
    consentimiento_sensibles: bool | None = None


class DatosReclutador(Esquema):
    nombre: str | None = None
    apellidos: str | None = None
    puesto: str | None = None
    correo: str | None = None
    telefono: str | None = None
    contrasena: str | None = None


class DatosEmpresaRegistro(Esquema):
    razon_social: str | None = None
    nombre_comercial: str | None = None
    rfc: str | None = None
    sector_id: int | None = None
    tamano_empresa_id: int | None = None
    municipio_id: int | None = None


class RegistroReclutador(Esquema):
    reclutador: DatosReclutador | None = None
    empresa: DatosEmpresaRegistro | None = None
    acepta_aviso: bool | None = None


class SolicitudCodigo(Esquema):
    correo: str | None = None


class VerificacionCodigo(Esquema):
    correo: str | None = None
    codigo: str | None = None


class Restablecimiento(Esquema):
    correo: str | None = None
    codigo: str | None = None
    contrasena: str | None = None


class CambioContrasena(Esquema):
    contrasena_actual: str | None = None
    contrasena_nueva: str | None = None


class Mensaje(Esquema):
    detail: str
