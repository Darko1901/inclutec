"""Validación de VacanteEntrada, con los mensajes del mock de la app móvil.

Guardar como borrador solo revisa formatos; publicar exige además lo que valida
`campos_faltantes_para_publicar` (422 `vacante_incompleta`).
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.vacante import VacanteEntrada
from app.modelos import (
    Ajuste,
    Categoria,
    Habilidad,
    Jornada,
    Modalidad,
    Municipio,
    NivelEducativo,
    TipoContrato,
    Vacante,
    VacanteAjuste,
    VacanteHabilidad,
)
from app.validaciones import Campos, existe, lanzar_si_hay_campos

TIPOS_AJUSTE = ("existente", "bajo_solicitud")
ESTADOS_ENTRADA = ("borrador", "publicada")


def _numero_opcional(valor: Any) -> bool:
    return valor is None or (
        isinstance(valor, (int, float)) and not isinstance(valor, bool) and valor >= 0
    )


def es_presencial_o_hibrida(db: Session, modalidad_id: Any) -> bool:
    nombre = db.scalar(select(Modalidad.nombre).where(Modalidad.id == modalidad_id))
    return nombre in ("Presencial", "Híbrido")


def _guardado(actual: Vacante | None, campo: str) -> set[int]:
    valor = getattr(actual, campo) if actual is not None else None
    return {valor} if valor is not None else set()


def validar_vacante(db: Session, datos: VacanteEntrada, actual: Vacante | None = None) -> Campos:
    """`actual` es la vacante que se edita: lo que ya tenía se acepta aunque se haya desactivado."""
    habilidades_guardadas: set[int] = set()
    ajustes_guardados: set[int] = set()
    if actual is not None:
        habilidades_guardadas = set(
            db.scalars(
                select(VacanteHabilidad.habilidad_id).where(
                    VacanteHabilidad.vacante_id == actual.id
                )
            )
        )
        ajustes_guardados = set(
            db.scalars(select(VacanteAjuste.ajuste_id).where(VacanteAjuste.vacante_id == actual.id))
        )
    campos: Campos = {}
    if not isinstance(datos.titulo, str) or not datos.titulo.strip():
        campos["titulo"] = "Escribe el título de la vacante."
    elif len(datos.titulo) > 120:
        campos["titulo"] = "Usa máximo 120 caracteres."
    if not existe(db, Categoria, datos.categoria_id, _guardado(actual, "categoria_id")):
        campos["categoria_id"] = "Elige una categoría."
    if not isinstance(datos.descripcion, str) or not datos.descripcion.strip():
        campos["descripcion"] = "Describe la vacante."
    elif len(datos.descripcion) > 2000:
        campos["descripcion"] = "Usa máximo 2000 caracteres."
    if not existe(db, Jornada, datos.jornada_id, _guardado(actual, "jornada_id")):
        campos["jornada_id"] = "Elige la jornada."
    if not existe(db, TipoContrato, datos.tipo_contrato_id, _guardado(actual, "tipo_contrato_id")):
        campos["tipo_contrato_id"] = "Elige el tipo de contrato."
    if datos.plazas is None or datos.plazas < 1:
        campos["plazas"] = "Escribe cuántas plazas hay (mínimo 1)."
    elif datos.plazas > 32767:
        campos["plazas"] = "Escribe un número de plazas menor."
    if not existe(db, Modalidad, datos.modalidad_id, _guardado(actual, "modalidad_id")):
        campos["modalidad_id"] = "Elige la modalidad."
    if not existe(db, Municipio, datos.municipio_id, _guardado(actual, "municipio_id")):
        campos["municipio_id"] = "Elige el municipio."
    if datos.direccion is not None and len(datos.direccion) > 255:
        campos["direccion"] = "Usa máximo 255 caracteres."
    # numeric(10,2): hasta 99 999 999.99
    for nombre in ("salario_min", "salario_max"):
        valor = getattr(datos, nombre)
        if not _numero_opcional(valor) or (valor is not None and valor >= 10**8):
            campos[nombre] = "Escribe un monto válido."
    if (
        "salario_min" not in campos
        and "salario_max" not in campos
        and datos.salario_min is not None
        and datos.salario_max is not None
        and datos.salario_max < datos.salario_min
    ):
        campos["salario_max"] = "El salario máximo no puede ser menor que el mínimo."
    if datos.mostrar_salario is None:
        campos["mostrar_salario"] = "Indica si se muestra el salario."
    if datos.nivel_educativo_id is not None and not existe(
        db, NivelEducativo, datos.nivel_educativo_id, _guardado(actual, "nivel_educativo_id")
    ):
        campos["nivel_educativo_id"] = "Elige una formación válida."
    if datos.experiencia_anios is None or not 0 <= datos.experiencia_anios <= 50:
        campos["experiencia_anios"] = "Escribe un número de años de 0 a 50."

    if datos.habilidades is None:
        campos["habilidades"] = "Revisa las habilidades."
    else:
        ids = [h.habilidad_id for h in datos.habilidades]
        if any(
            not existe(db, Habilidad, h.habilidad_id, habilidades_guardadas)
            or h.obligatoria is None
            for h in datos.habilidades
        ) or len(set(ids)) != len(ids):
            campos["habilidades"] = "Hay habilidades que no existen o están repetidas."

    if datos.ajustes is None:
        campos["ajustes"] = "Revisa los ajustes."
    else:
        ids = [a.ajuste_id for a in datos.ajustes]
        if any(
            not existe(db, Ajuste, a.ajuste_id, ajustes_guardados) or a.tipo not in TIPOS_AJUSTE
            for a in datos.ajustes
        ) or len(set(ids)) != len(ids):
            campos["ajustes"] = "Hay ajustes que no existen o están en los dos grupos."
        elif datos.sin_condiciones_accesibilidad is True and datos.ajustes:
            campos["ajustes"] = (
                "Quita los ajustes o desmarca «Por ahora no contamos con condiciones»."
            )
    if datos.sin_condiciones_accesibilidad is None:
        campos["sin_condiciones_accesibilidad"] = (
            "Indica si cuentas con condiciones de accesibilidad."
        )
    if datos.notas_accesibilidad is not None and len(datos.notas_accesibilidad) > 500:
        campos["notas_accesibilidad"] = "Usa máximo 500 caracteres."
    if datos.estado not in ESTADOS_ENTRADA:
        campos["estado"] = "El estado puede ser «borrador» o «publicada»."
    return campos


def lanzar_si_vacante_invalida(
    db: Session, datos: VacanteEntrada, actual: Vacante | None = None
) -> None:
    lanzar_si_hay_campos(validar_vacante(db, datos, actual))


def campos_faltantes_para_publicar(
    db: Session,
    *,
    hay_obligatoria: bool,
    modalidad_id: int,
    direccion: str | None,
    hay_ajustes: bool,
    sin_condiciones: bool,
) -> Campos:
    """Lo que falta para publicar, con el mismo nombre de campo que el 422 `vacante_incompleta`."""
    faltantes: Campos = {}
    if not hay_obligatoria:
        faltantes["habilidades"] = "Agrega al menos una habilidad obligatoria."
    if es_presencial_o_hibrida(db, modalidad_id) and not (direccion or "").strip():
        faltantes["direccion"] = "Escribe la dirección: la vacante es presencial o híbrida."
    if not hay_ajustes and not sin_condiciones:
        faltantes["ajustes"] = (
            "Indica las condiciones de accesibilidad o marca que por ahora no cuentas con ellas."
        )
    return faltantes


def exigir_completa(db: Session, **datos: Any) -> None:
    faltantes = campos_faltantes_para_publicar(db, **datos)
    if faltantes:
        raise ApiError(
            422, "vacante_incompleta", "Faltan datos para publicar la vacante.", faltantes
        )
