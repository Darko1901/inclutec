"""Categorías, habilidades y catálogos en el panel de administración (WEB-06 y WEB-07, CU-24/25).

«En uso» cuenta TODAS las filas que apuntan al elemento (vacantes, candidatos, empresas,
reportes…), no solo las vacantes: así eliminar algo en uso responde 409 `en_uso` y nunca llega a
violar una llave foránea de la base de datos.
"""

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.modelos import (
    Ajuste,
    Candidato,
    CandidatoHabilidad,
    Categoria,
    Empresa,
    Formacion,
    Habilidad,
    Jornada,
    Modalidad,
    MotivoReporte,
    NivelEducativo,
    Reporte,
    Sector,
    TamanoEmpresa,
    TipoContrato,
    Vacante,
    VacanteAjuste,
    VacanteHabilidad,
    t_candidato_categoria,
    t_candidato_modalidad,
    t_candidato_necesidad,
)
from app.validaciones import id_en_rango, lanzar_si_hay_campos

CATEGORIAS_AJUSTE = (
    "movilidad",
    "visual",
    "auditiva",
    "comunicacion",
    "cognitiva_psicosocial",
    "general",
)
APLICA_A = ("vacante", "empresa", "candidato", "todos")


@dataclass(frozen=True)
class Catalogo:
    modelo: Any
    #: Columnas de otras tablas que apuntan a este catálogo.
    referencias: tuple = ()
    #: Campos propios además de id, nombre y activo.
    extras: tuple[str, ...] = field(default=())
    maximo_nombre: int = 100


CATALOGOS: dict[str, Catalogo] = {
    "modalidades": Catalogo(
        Modalidad, (Vacante.modalidad_id, t_candidato_modalidad.c.modalidad_id)
    ),
    "jornadas": Catalogo(Jornada, (Vacante.jornada_id, Candidato.jornada_id)),
    "tipos-contrato": Catalogo(TipoContrato, (Vacante.tipo_contrato_id,)),
    "niveles-educativos": Catalogo(
        NivelEducativo, (Vacante.nivel_educativo_id, Formacion.nivel_educativo_id), ("orden",)
    ),
    "sectores": Catalogo(Sector, (Empresa.sector_id,)),
    "tamanos-empresa": Catalogo(TamanoEmpresa, (Empresa.tamano_empresa_id,), ("rango",)),
    "ajustes": Catalogo(
        Ajuste,
        (VacanteAjuste.ajuste_id, t_candidato_necesidad.c.ajuste_id),
        ("descripcion", "categoria"),
    ),
    "motivos-reporte": Catalogo(MotivoReporte, (Reporte.motivo_reporte_id,), ("aplica_a",)),
}
CATEGORIAS = Catalogo(
    Categoria,
    (Habilidad.categoria_id, Vacante.categoria_id, t_candidato_categoria.c.categoria_id),
    ("descripcion",),
    80,
)
HABILIDADES = Catalogo(
    Habilidad,
    (CandidatoHabilidad.habilidad_id, VacanteHabilidad.habilidad_id),
    ("categoria_id",),
    80,
)


def catalogo_de(tipo: str) -> Catalogo:
    if tipo not in CATALOGOS:
        raise ApiError(404, "no_encontrado", "El tipo de catálogo no existe.")
    return CATALOGOS[tipo]


def contar(db: Session, columna, valor: int) -> int:
    tabla = columna.table if hasattr(columna, "table") else columna.class_.__table__
    return db.scalar(select(func.count()).select_from(tabla).where(columna == valor)) or 0


def usos(db: Session, catalogo: Catalogo, id_: int) -> int:
    return sum(contar(db, columna, id_) for columna in catalogo.referencias)


def elemento(db: Session, catalogo: Catalogo, id_: int, mensaje: str):
    fila = db.get(catalogo.modelo, id_) if id_en_rango(catalogo.modelo, id_) else None
    if fila is None:
        raise ApiError(404, "no_encontrado", mensaje)
    return fila


def listar(db: Session, catalogo: Catalogo, q: str | None = None, tipo: str | None = None) -> list:
    """Incluye los inactivos. Por nombre; los niveles educativos, por orden."""
    consulta = select(catalogo.modelo)
    texto = (q or "").strip().lower()
    if texto:
        consulta = consulta.where(
            func.lower(catalogo.modelo.nombre).contains(texto, autoescape=True)
        )
    if tipo == "niveles-educativos":
        consulta = consulta.order_by(NivelEducativo.orden, NivelEducativo.id)
    else:
        consulta = consulta.order_by(func.lower(catalogo.modelo.nombre), catalogo.modelo.id)
    return list(db.scalars(consulta))


def exigir_nombre_libre(
    db: Session, catalogo: Catalogo, nombre: str, excepto: int | None, mensaje: str
) -> None:
    otro = db.scalar(
        select(catalogo.modelo.id).where(func.lower(catalogo.modelo.nombre) == nombre.lower())
    )
    if otro is not None and otro != excepto:
        raise ApiError(409, "nombre_duplicado", mensaje)


def _texto(valor: Any) -> str:
    return valor.strip() if isinstance(valor, str) else ""


def validar_nombre(campos: dict[str, str], nombre: str, maximo: int) -> None:
    if not nombre or len(nombre) > maximo:
        campos["nombre"] = (
            "Escribe el nombre." if not nombre else f"Debe tener máximo {maximo} caracteres."
        )


def validar_categoria(datos) -> dict:
    nombre = _texto(datos.nombre)
    descripcion = _texto(datos.descripcion)
    campos: dict[str, str] = {}
    validar_nombre(campos, nombre, 80)
    if len(descripcion) > 255:
        campos["descripcion"] = "Debe tener máximo 255 caracteres."
    lanzar_si_hay_campos(campos)
    return {"nombre": nombre, "descripcion": descripcion or None}


def validar_habilidad(db: Session, datos) -> dict:
    nombre = _texto(datos.nombre)
    campos: dict[str, str] = {}
    validar_nombre(campos, nombre, 80)
    categoria = datos.categoria_id
    if not id_en_rango(Categoria, categoria) or db.get(Categoria, categoria) is None:
        campos["categoria_id"] = "Elige una categoría de la lista."
    lanzar_si_hay_campos(campos)
    return {"nombre": nombre, "categoria_id": categoria}


def validar_elemento(db: Session, tipo: str, datos, excepto: int | None) -> dict:
    """Los campos obligatorios dependen del tipo (ver CatalogoEntrada en el contrato)."""
    nombre = _texto(datos.nombre)
    descripcion = _texto(datos.descripcion)
    categoria = _texto(datos.categoria)
    rango = _texto(datos.rango)
    aplica_a = _texto(datos.aplica_a)
    campos: dict[str, str] = {}
    validar_nombre(campos, nombre, 100)
    limpios: dict[str, Any] = {"nombre": nombre}
    if tipo == "ajustes":
        if not descripcion or len(descripcion) > 255:
            campos["descripcion"] = (
                "Escribe la descripción en lenguaje claro."
                if not descripcion
                else "Debe tener máximo 255 caracteres."
            )
        if categoria not in CATEGORIAS_AJUSTE:
            campos["categoria"] = "Elige una categoría de la lista."
        limpios |= {"descripcion": descripcion, "categoria": categoria}
    if tipo == "niveles-educativos":
        orden = datos.orden
        if not isinstance(orden, int) or isinstance(orden, bool) or not 0 <= orden <= 32767:
            campos["orden"] = "Escribe el orden como un número entero."
        else:
            otro = db.scalar(select(NivelEducativo.id).where(NivelEducativo.orden == orden))
            if otro is not None and otro != excepto:
                campos["orden"] = "Ya hay un nivel con ese orden."
        limpios["orden"] = orden
    if tipo == "tamanos-empresa":
        if not rango or len(rango) > 40:
            campos["rango"] = (
                "Escribe el rango de trabajadores."
                if not rango
                else "Debe tener máximo 40 caracteres."
            )
        limpios["rango"] = rango
    if tipo == "motivos-reporte":
        if aplica_a not in APLICA_A:
            campos["aplica_a"] = "Elige a qué aplica el motivo."
        limpios["aplica_a"] = aplica_a
    lanzar_si_hay_campos(campos)
    # Los nombres tienen su límite en la base (más corto en algunos catálogos).
    maximo = catalogo_de(tipo).modelo.__table__.c.nombre.type.length
    if len(nombre) > maximo:
        lanzar_si_hay_campos({"nombre": f"Debe tener máximo {maximo} caracteres."})
    return limpios


def guardar(db: Session, fila, valores: dict) -> None:
    for campo, valor in valores.items():
        setattr(fila, campo, valor)
    db.flush()


def eliminar(db: Session, catalogo: Catalogo, fila, mensaje_en_uso: str) -> None:
    if usos(db, catalogo, fila.id) > 0:
        raise ApiError(409, "en_uso", mensaje_en_uso)
    try:
        with db.begin_nested():
            db.delete(fila)
            db.flush()
    except IntegrityError as error:
        # Última defensa: si otra tabla lo referencia, sigue «en uso».
        raise ApiError(409, "en_uso", mensaje_en_uso) from error
