"""Validaciones de los cuerpos, con los mismos mensajes que el mock de la app móvil."""

import re
from collections.abc import Collection
from typing import Any

from sqlalchemy import BigInteger, Integer, SmallInteger, select
from sqlalchemy.orm import Session

from app.errores import MENSAJE_VALIDACION, ApiError

LONGITUD_MIN_CONTRASENA = 8
LONGITUD_MAX_CONTRASENA = 64

# Formato práctico de correo (local@dominio.tld), igual que el de los clientes.
_CORREO = re.compile(
    r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+"
)
_TELEFONO = re.compile(r"[0-9]{10}")
_CODIGO = re.compile(r"[0-9]{6}")
_RFC = re.compile(r"[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}")
_LETRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]")
_NUMERO = re.compile(r"[0-9]")

MENSAJE_CONTRASENA = (
    f"La contraseña debe tener de {LONGITUD_MIN_CONTRASENA} a {LONGITUD_MAX_CONTRASENA} "
    "caracteres, con al menos una letra y un número."
)
MENSAJE_AVISO = "Debes aceptar el aviso de privacidad."
MENSAJE_CORREO = "Escribe un correo válido."
MENSAJE_TELEFONO = "Escribe un teléfono de 10 dígitos, sin espacios."
MENSAJE_RFC = "Escribe un RFC de 12 o 13 caracteres, en mayúsculas."

Campos = dict[str, str]


def normalizar_correo(correo: str) -> str:
    return correo.strip().lower()


def es_correo_valido(correo: Any) -> bool:
    if not isinstance(correo, str):
        return False
    valor = correo.strip()
    return 0 < len(valor) <= 254 and _CORREO.fullmatch(valor) is not None


def es_telefono_valido(telefono: Any) -> bool:
    return isinstance(telefono, str) and _TELEFONO.fullmatch(telefono) is not None


def es_codigo_valido(codigo: Any) -> bool:
    return isinstance(codigo, str) and _CODIGO.fullmatch(codigo) is not None


def es_rfc_valido(rfc: Any) -> bool:
    return isinstance(rfc, str) and _RFC.fullmatch(rfc) is not None


def es_contrasena_de_login(contrasena: Any) -> bool:
    return (
        isinstance(contrasena, str)
        and LONGITUD_MIN_CONTRASENA <= len(contrasena) <= LONGITUD_MAX_CONTRASENA
    )


def es_contrasena_valida(contrasena: Any) -> bool:
    """Política de registro y recuperación: 8 a 64 caracteres con al menos una letra y un número."""
    return (
        es_contrasena_de_login(contrasena)
        and _LETRA.search(contrasena) is not None
        and _NUMERO.search(contrasena) is not None
    )


def texto_valido(valor: Any, maximo: int) -> bool:
    return isinstance(valor, str) and len(valor.strip()) > 0 and len(valor) <= maximo


def entero_valido(valor: Any) -> bool:
    return isinstance(valor, int) and not isinstance(valor, bool)


def lanzar_si_hay_campos(campos: Campos) -> None:
    if campos:
        raise ApiError(422, "validacion", MENSAJE_VALIDACION, campos)


_MAXIMOS = ((SmallInteger, 2**15 - 1), (BigInteger, 2**63 - 1), (Integer, 2**31 - 1))


def id_en_rango(modelo: Any, valor: Any) -> bool:
    """Entero positivo que cabe en la llave primaria (si no, la base respondería con un error)."""
    if not isinstance(valor, int) or isinstance(valor, bool) or valor < 1:
        return False
    tipo = modelo.id.type
    for clase, tope in _MAXIMOS:
        if isinstance(tipo, clase):
            return valor <= tope
    return True


def existe(db: Session, modelo: Any, valor: Any, guardados: Collection[int] = ()) -> bool:
    """El id existe en la tabla y, si tiene la columna `activo`, está activo.

    `guardados` son los ids que ya tenía el registro que se edita. Un elemento de catálogo
    desactivado deja de ofrecerse en registros nuevos, pero «lo ya guardado no cambia» (contrato,
    catálogos del panel): volver a guardar una vacante o un perfil que ya lo tenía es válido.
    """
    if not id_en_rango(modelo, valor):
        return False
    if valor in guardados:
        return True
    consulta = select(modelo.id).where(modelo.id == valor)
    if hasattr(modelo, "activo"):
        consulta = consulta.where(modelo.activo.is_(True))
    return db.scalar(consulta) is not None
