from typing import Annotated, Any

from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from app.dependencias import Db
from app.errores import ApiError
from app.esquemas.catalogos import CatalogoItem
from app.modelos import (
    Ajuste,
    Categoria,
    EntidadFederativa,
    Habilidad,
    Jornada,
    Modalidad,
    MotivoReporte,
    Municipio,
    NivelEducativo,
    Sector,
    TamanoEmpresa,
    TipoContrato,
)

router = APIRouter(prefix="/catalogos", tags=["Catálogos"])

# tipo de la ruta → (modelo, campos extra del elemento, columna de orden). Entidades y municipios no
# tienen la columna `activo`.
_CATALOGOS: dict[str, tuple[Any, dict[str, str], str]] = {
    "entidades": (EntidadFederativa, {}, "nombre"),
    "municipios": (Municipio, {"entidad_federativa_id": "entidad_federativa_id"}, "nombre"),
    "modalidades": (Modalidad, {}, "nombre"),
    "jornadas": (Jornada, {}, "nombre"),
    "tipos-contrato": (TipoContrato, {}, "nombre"),
    "niveles-educativos": (NivelEducativo, {"orden": "orden"}, "orden"),
    "sectores": (Sector, {}, "nombre"),
    "tamanos-empresa": (TamanoEmpresa, {"rango": "rango"}, "nombre"),
    "categorias": (Categoria, {"descripcion": "descripcion"}, "nombre"),
    "habilidades": (Habilidad, {"categoria_id": "categoria_id"}, "nombre"),
    "ajustes": (Ajuste, {"descripcion": "descripcion", "categoria": "categoria"}, "nombre"),
    "motivos-reporte": (MotivoReporte, {"aplica_a": "aplica_a"}, "nombre"),
}
_APLICA_A = {"vacante", "empresa", "candidato"}
_MENSAJE_VALIDACION = "Revisa los datos marcados."


@router.get(
    "/{tipo}",
    response_model=list[CatalogoItem],
    response_model_exclude_unset=True,
    summary="Catálogo activo",
    operation_id="get_catalogos_tipo",
)
def listar_catalogo(
    tipo: str,
    db: Db,
    entidad_id: Annotated[int | None, Query(description="Solo `municipios`.")] = None,
    categoria_id: Annotated[int | None, Query(description="Solo `habilidades`.")] = None,
    q: Annotated[str | None, Query(description="Solo `habilidades`: autocompletado.")] = None,
    aplica_a: Annotated[str | None, Query(description="Solo `motivos-reporte`.")] = None,
) -> list[CatalogoItem]:
    if tipo not in _CATALOGOS:
        raise ApiError(404, "no_encontrado", "El catálogo no existe.")
    modelo, extras, orden = _CATALOGOS[tipo]

    consulta = select(modelo)
    if hasattr(modelo, "activo"):
        consulta = consulta.where(modelo.activo.is_(True))
    if tipo == "municipios" and entidad_id is not None:
        consulta = consulta.where(Municipio.entidad_federativa_id == entidad_id)
    if tipo == "habilidades":
        if categoria_id is not None:
            consulta = consulta.where(Habilidad.categoria_id == categoria_id)
        if q is not None:
            texto = q.strip()
            if len(texto) < 2:
                raise ApiError(
                    422,
                    "validacion",
                    _MENSAJE_VALIDACION,
                    {"q": "Escribe al menos 2 caracteres."},
                )
            consulta = consulta.where(Habilidad.nombre.ilike(f"%{texto}%")).limit(20)
    if tipo == "motivos-reporte" and aplica_a is not None:
        if aplica_a not in _APLICA_A:
            raise ApiError(
                422,
                "validacion",
                _MENSAJE_VALIDACION,
                {"aplica_a": "Elige vacante, empresa o candidato."},
            )
        consulta = consulta.where(
            or_(MotivoReporte.aplica_a == "todos", MotivoReporte.aplica_a == aplica_a)
        )

    consulta = consulta.order_by(getattr(modelo, orden), modelo.id)
    return [
        CatalogoItem(
            id=fila.id,
            nombre=fila.nombre,
            **{campo: getattr(fila, columna) for campo, columna in extras.items()},
        )
        for fila in db.scalars(consulta)
    ]
