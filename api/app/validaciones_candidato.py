"""Validaciones de los cuerpos de /candidatos/me, con los mensajes del mock de la app móvil."""

import re
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errores import MENSAJE_VALIDACION, ApiError
from app.esquemas.candidato import (
    ExperienciaEntrada,
    FormacionEntrada,
    HabilidadesEntrada,
    NecesidadesEntrada,
    PerfilCandidatoEntrada,
)
from app.modelos import (
    Ajuste,
    Candidato,
    CandidatoHabilidad,
    Categoria,
    Habilidad,
    Jornada,
    Modalidad,
    Municipio,
    NivelEducativo,
    t_candidato_categoria,
    t_candidato_modalidad,
    t_candidato_necesidad,
)
from app.validaciones import (
    Campos,
    es_telefono_valido,
    existe,
    lanzar_si_hay_campos,
    texto_valido,
)

MAX_HABILIDADES = 30
COMPARTIR = ("preguntar", "siempre", "nunca")
ESTADOS_FORMACION = ("concluida", "en_curso", "trunca")
NIVELES = ("basico", "intermedio", "avanzado")

_FECHA = re.compile(r"\d{4}-\d{2}-\d{2}")


def texto_opcional(valor: Any, maximo: int) -> bool:
    return valor is None or (isinstance(valor, str) and len(valor) <= maximo)


def fecha_valida(valor: Any) -> date | None:
    """Convierte «AAAA-MM-DD» a fecha si existe en el calendario; si no, None."""
    if not isinstance(valor, str) or _FECHA.fullmatch(valor) is None:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        return None


def _son_ids(db: Session, modelo: Any, ids: Any, guardados: set[int] = frozenset()) -> bool:
    return isinstance(ids, list) and all(existe(db, modelo, i, guardados) for i in ids)


def _ids(db: Session, columna, filtro, candidato_id: int | None) -> set[int]:
    """Lo que el candidato ya tenía guardado: se acepta aunque se haya desactivado después."""
    if candidato_id is None:
        return set()
    return set(db.scalars(select(columna).where(filtro == candidato_id)))


def validar_perfil(
    db: Session, datos: PerfilCandidatoEntrada, candidato_id: int | None = None
) -> Campos:
    candidato = db.get(Candidato, candidato_id) if candidato_id is not None else None
    municipio = {candidato.municipio_id} if candidato and candidato.municipio_id else set()
    jornada = {candidato.jornada_id} if candidato and candidato.jornada_id else set()
    modalidades = _ids(
        db, t_candidato_modalidad.c.modalidad_id, t_candidato_modalidad.c.candidato_id, candidato_id
    )
    categorias = _ids(
        db, t_candidato_categoria.c.categoria_id, t_candidato_categoria.c.candidato_id, candidato_id
    )
    campos: Campos = {}
    if not texto_valido(datos.nombre, 80):
        campos["nombre"] = "Escribe tu nombre (máximo 80 caracteres)."
    if not texto_valido(datos.apellidos, 120):
        campos["apellidos"] = "Escribe tus apellidos (máximo 120 caracteres)."
    if datos.telefono is not None and not es_telefono_valido(datos.telefono):
        campos["telefono"] = "Escribe un teléfono de 10 dígitos, sin espacios ni guiones."
    if datos.municipio_id is not None and not existe(db, Municipio, datos.municipio_id, municipio):
        campos["municipio_id"] = "Elige un municipio de la lista."
    if datos.jornada_id is not None and not existe(db, Jornada, datos.jornada_id, jornada):
        campos["jornada_id"] = "Elige una jornada de la lista."
    if not texto_opcional(datos.resumen, 500):
        campos["resumen"] = "Escribe máximo 500 caracteres."
    if datos.disponible_reubicacion is None:
        campos["disponible_reubicacion"] = "Indica si puedes reubicarte."
    if not _son_ids(db, Modalidad, datos.modalidad_ids, modalidades):
        campos["modalidad_ids"] = "Elige modalidades de la lista."
    if not _son_ids(db, Categoria, datos.categoria_ids, categorias):
        campos["categoria_ids"] = "Elige categorías de la lista."
    if datos.compartir_ajustes not in COMPARTIR:
        campos["compartir_ajustes"] = "Elige una opción para compartir tus necesidades."
    return campos


def validar_necesidades(
    db: Session, datos: NecesidadesEntrada, candidato_id: int | None = None
) -> Campos:
    guardadas = _ids(
        db, t_candidato_necesidad.c.ajuste_id, t_candidato_necesidad.c.candidato_id, candidato_id
    )
    campos: Campos = {}
    if not _son_ids(db, Ajuste, datos.ajuste_ids, guardadas):
        campos["ajuste_ids"] = "Elige necesidades de la lista."
    if not texto_opcional(datos.nota_ajustes, 300):
        campos["nota_ajustes"] = "Escribe máximo 300 caracteres."
    return campos


def validar_experiencia(datos: ExperienciaEntrada) -> Campos:
    campos: Campos = {}
    if not texto_valido(datos.puesto, 100):
        campos["puesto"] = "Escribe el puesto (máximo 100 caracteres)."
    if not texto_valido(datos.empresa, 120):
        campos["empresa"] = "Escribe la empresa (máximo 120 caracteres)."
    inicio = fecha_valida(datos.fecha_inicio)
    if inicio is None:
        campos["fecha_inicio"] = "Elige la fecha de inicio."
    if datos.actual is None:
        campos["actual"] = "Indica si trabajas aquí actualmente."
    if datos.actual is True:
        if datos.fecha_fin is not None:
            campos["fecha_fin"] = "Déjala vacía si trabajas aquí actualmente."
    else:
        fin = fecha_valida(datos.fecha_fin)
        if fin is None:
            campos["fecha_fin"] = "Elige la fecha de fin o marca «Trabajo aquí actualmente»."
        elif inicio is not None and fin < inicio:
            campos["fecha_fin"] = "La fecha de fin no puede ser anterior a la de inicio."
    if not texto_opcional(datos.descripcion, 500):
        campos["descripcion"] = "Escribe máximo 500 caracteres."
    return campos


def validar_formacion(
    db: Session, datos: FormacionEntrada, nivel_guardado: int | None = None
) -> Campos:
    campos: Campos = {}
    guardado = {nivel_guardado} if nivel_guardado is not None else set()
    if not existe(db, NivelEducativo, datos.nivel_educativo_id, guardado):
        campos["nivel_educativo_id"] = "Elige el nivel educativo."
    if not texto_valido(datos.institucion, 150):
        campos["institucion"] = "Escribe la institución (máximo 150 caracteres)."
    if not texto_opcional(datos.carrera, 150):
        campos["carrera"] = "Escribe máximo 150 caracteres."
    if datos.estado not in ESTADOS_FORMACION:
        campos["estado"] = "Elige el estado de tus estudios."
    inicio = fecha_valida(datos.fecha_inicio)
    fin = fecha_valida(datos.fecha_fin)
    if datos.fecha_inicio is not None and inicio is None:
        campos["fecha_inicio"] = "Elige una fecha válida."
    if datos.fecha_fin is not None and fin is None:
        campos["fecha_fin"] = "Elige una fecha válida."
    elif inicio is not None and fin is not None and fin < inicio:
        campos["fecha_fin"] = "La fecha de fin no puede ser anterior a la de inicio."
    return campos


def validar_habilidades(
    db: Session, datos: HabilidadesEntrada, candidato_id: int | None = None
) -> None:
    """Máximo 30 y sin repetidos (`limite_habilidades`); lo demás es `validacion`."""
    guardadas = _ids(
        db, CandidatoHabilidad.habilidad_id, CandidatoHabilidad.candidato_id, candidato_id
    )
    lista = datos.habilidades
    if lista is None:
        raise ApiError(
            422,
            "validacion",
            MENSAJE_VALIDACION,
            {"habilidades": "Envía la lista de habilidades."},
        )
    campos: Campos = {}
    for indice, habilidad in enumerate(lista):
        if not existe(db, Habilidad, habilidad.habilidad_id, guardadas):
            campos[f"habilidades.{indice}.habilidad_id"] = "Elige una habilidad de la lista."
        if habilidad.nivel not in NIVELES:
            campos[f"habilidades.{indice}.nivel"] = "Elige básico, intermedio o avanzado."
    lanzar_si_hay_campos(campos)
    if len(lista) > MAX_HABILIDADES:
        raise ApiError(
            422,
            "limite_habilidades",
            f"Puedes guardar máximo {MAX_HABILIDADES} habilidades. Quita algunas para continuar.",
        )
    if len({h.habilidad_id for h in lista}) != len(lista):
        raise ApiError(
            422, "limite_habilidades", "Hay habilidades repetidas. Quita las duplicadas."
        )
