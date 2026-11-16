"""Validación del cuerpo de PUT /empresas/me, con los mensajes del mock de la app móvil."""

import re

from sqlalchemy.orm import Session

from app.esquemas.empresa import EmpresaEntrada
from app.modelos import Municipio, Sector, TamanoEmpresa
from app.validaciones import MENSAJE_RFC, Campos, es_rfc_valido, existe, texto_valido
from app.validaciones_candidato import texto_opcional

_SITIO = re.compile(r"https?://\S+\.\S+")


def validar_empresa(db: Session, datos: EmpresaEntrada, campos_enviados: set[str]) -> Campos:
    """`campos_enviados` distingue «no vino» de «vino vacío» en razon_social, rfc y puesto."""
    campos: Campos = {}
    nombre = datos.nombre_comercial
    if not isinstance(nombre, str) or not nombre.strip():
        campos["nombre_comercial"] = "Escribe el nombre comercial."
    elif len(nombre) > 150:
        campos["nombre_comercial"] = "Usa máximo 150 caracteres."
    if not existe(db, Sector, datos.sector_id):
        campos["sector_id"] = "Elige un sector."
    if not existe(db, TamanoEmpresa, datos.tamano_empresa_id):
        campos["tamano_empresa_id"] = "Elige el tamaño de la empresa."
    if not existe(db, Municipio, datos.municipio_id):
        campos["municipio_id"] = "Elige el municipio."
    if not texto_opcional(datos.direccion, 255):
        campos["direccion"] = "Usa máximo 255 caracteres."
    if not texto_opcional(datos.descripcion, 1000):
        campos["descripcion"] = "Usa máximo 1000 caracteres."
    if not texto_opcional(datos.practicas_inclusion, 1000):
        campos["practicas_inclusion"] = "Usa máximo 1000 caracteres."
    if not texto_opcional(datos.sitio_web, 255):
        campos["sitio_web"] = "Usa máximo 255 caracteres."
    elif datos.sitio_web and not _SITIO.fullmatch(datos.sitio_web):
        campos["sitio_web"] = "Escribe la dirección completa, por ejemplo https://tuempresa.mx."
    if "razon_social" in campos_enviados:
        if not isinstance(datos.razon_social, str) or not datos.razon_social.strip():
            campos["razon_social"] = "Escribe la razón social."
        elif len(datos.razon_social) > 200:
            campos["razon_social"] = "Usa máximo 200 caracteres."
    if "rfc" in campos_enviados and not es_rfc_valido(datos.rfc):
        campos["rfc"] = MENSAJE_RFC
    if "puesto" in campos_enviados and not texto_valido(datos.puesto, 100):
        campos["puesto"] = (
            "Escribe tu puesto."
            if not isinstance(datos.puesto, str) or not datos.puesto.strip()
            else "Usa máximo 100 caracteres."
        )
    return campos
