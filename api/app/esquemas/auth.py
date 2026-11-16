from typing import Literal

from pydantic import EmailStr, Field

from app.esquemas.comunes import Esquema, FechaHora


class Login(Esquema):
    correo: EmailStr = Field(max_length=254)
    contrasena: str = Field(min_length=1, max_length=128)


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
