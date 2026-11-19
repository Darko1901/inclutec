from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func, select

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.esquemas.admin import (
    Activacion,
    CatalogoAdmin,
    CatalogoEntrada,
    CategoriaAdmin,
    CategoriaEntrada,
    HabilidadAdmin,
    HabilidadEntrada,
)
from app.esquemas.comunes import Pagina, Ref
from app.modelos import CandidatoHabilidad, Categoria, Habilidad, Vacante, VacanteHabilidad
from app.paginacion import IdPequeno, PaginacionPanel
from app.servicios import admin_catalogos as servicio
from app.validaciones import lanzar_si_hay_campos

router = APIRouter(prefix="/admin", tags=["Administración: categorías y catálogos"])

Administrador = Annotated[UsuarioActual, Depends(exigir_roles("administrador"))]

CATEGORIA_NO_EXISTE = "La categoría no existe."
HABILIDAD_NO_EXISTE = "La habilidad no existe."
ELEMENTO_NO_EXISTE = "El elemento no existe."


def _exigir_activacion(datos: Activacion) -> bool:
    if datos.activo is None:
        lanzar_si_hay_campos({"activo": "Indica si se activa o se desactiva."})
    return datos.activo


# --- Categorías ---------------------------------------------------------------------------------


def _categoria(db: Db, c: Categoria) -> CategoriaAdmin:
    return CategoriaAdmin(
        id=c.id,
        nombre=c.nombre,
        descripcion=c.descripcion,
        activo=c.activo,
        habilidades=servicio.contar(db, Habilidad.categoria_id, c.id),
        vacantes=servicio.contar(db, Vacante.categoria_id, c.id),
    )


@router.get(
    "/categorias",
    response_model=list[CategoriaAdmin],
    summary="Listar categorías",
    operation_id="get_admin_categorias",
)
def listar_categorias(
    _: Administrador,
    db: Db,
    q: Annotated[str | None, Query(description="Busca por nombre.")] = None,
) -> list[CategoriaAdmin]:
    """Incluye las inactivas."""
    return [_categoria(db, c) for c in servicio.listar(db, servicio.CATEGORIAS, q)]


@router.post(
    "/categorias",
    response_model=CategoriaAdmin,
    status_code=status.HTTP_201_CREATED,
    summary="Crear categoría",
    operation_id="post_admin_categorias",
)
def crear_categoria(datos: CategoriaEntrada, _: Administrador, db: Db) -> CategoriaAdmin:
    limpios = servicio.validar_categoria(datos)
    servicio.exigir_nombre_libre(
        db, servicio.CATEGORIAS, limpios["nombre"], None, "Ya existe una categoría con ese nombre."
    )
    fila = Categoria(**limpios, activo=True)
    db.add(fila)
    db.flush()
    return _categoria(db, fila)


@router.put(
    "/categorias/{id}",
    response_model=CategoriaAdmin,
    summary="Editar categoría",
    operation_id="put_admin_categorias_id",
)
def editar_categoria(id: int, datos: CategoriaEntrada, _: Administrador, db: Db) -> CategoriaAdmin:
    fila = servicio.elemento(db, servicio.CATEGORIAS, id, CATEGORIA_NO_EXISTE)
    limpios = servicio.validar_categoria(datos)
    servicio.exigir_nombre_libre(
        db,
        servicio.CATEGORIAS,
        limpios["nombre"],
        fila.id,
        "Ya existe una categoría con ese nombre.",
    )
    servicio.guardar(db, fila, limpios)
    return _categoria(db, fila)


@router.patch(
    "/categorias/{id}",
    response_model=CategoriaAdmin,
    summary="Activar o desactivar categoría",
    operation_id="patch_admin_categorias_id",
)
def activar_categoria(id: int, datos: Activacion, _: Administrador, db: Db) -> CategoriaAdmin:
    """Desactivada, deja de ofrecerse en registros nuevos; lo ya guardado no cambia."""
    fila = servicio.elemento(db, servicio.CATEGORIAS, id, CATEGORIA_NO_EXISTE)
    servicio.guardar(db, fila, {"activo": _exigir_activacion(datos)})
    return _categoria(db, fila)


@router.delete(
    "/categorias/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar categoría",
    operation_id="delete_admin_categorias_id",
)
def eliminar_categoria(id: int, _: Administrador, db: Db) -> Response:
    fila = servicio.elemento(db, servicio.CATEGORIAS, id, CATEGORIA_NO_EXISTE)
    servicio.eliminar(
        db, servicio.CATEGORIAS, fila, "La categoría está en uso; solo se puede desactivar."
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Habilidades --------------------------------------------------------------------------------


def _habilidad(db: Db, h: Habilidad) -> HabilidadAdmin:
    categoria = db.get(Categoria, h.categoria_id)
    return HabilidadAdmin(
        id=h.id,
        nombre=h.nombre,
        categoria=Ref(id=categoria.id, nombre=categoria.nombre),
        activo=h.activo,
        candidatos=servicio.contar(db, CandidatoHabilidad.habilidad_id, h.id),
        vacantes=servicio.contar(db, VacanteHabilidad.habilidad_id, h.id),
    )


@router.get(
    "/habilidades",
    response_model=Pagina[HabilidadAdmin],
    summary="Listar habilidades",
    operation_id="get_admin_habilidades",
)
def listar_habilidades(
    _: Administrador,
    db: Db,
    pagina: PaginacionPanel,
    q: Annotated[str | None, Query(description="Busca por nombre.")] = None,
    categoria_id: Annotated[IdPequeno | None, Query(description="Categoría.")] = None,
) -> Pagina[HabilidadAdmin]:
    """Incluye las inactivas y cuántos candidatos y vacantes usan cada una."""
    filtros = []
    texto = (q or "").strip().lower()
    if texto:
        filtros.append(func.lower(Habilidad.nombre).contains(texto, autoescape=True))
    if categoria_id is not None:
        filtros.append(Habilidad.categoria_id == categoria_id)
    total = db.scalar(select(func.count()).select_from(Habilidad).where(*filtros)) or 0
    filas = db.scalars(
        select(Habilidad)
        .where(*filtros)
        .order_by(func.lower(Habilidad.nombre), Habilidad.id)
        .limit(pagina.size)
        .offset(pagina.desplazamiento)
    )
    return Pagina[HabilidadAdmin](
        items=[_habilidad(db, h) for h in filas], total=total, page=pagina.page, size=pagina.size
    )


@router.post(
    "/habilidades",
    response_model=HabilidadAdmin,
    status_code=status.HTTP_201_CREATED,
    summary="Crear habilidad",
    operation_id="post_admin_habilidades",
)
def crear_habilidad(datos: HabilidadEntrada, _: Administrador, db: Db) -> HabilidadAdmin:
    limpios = servicio.validar_habilidad(db, datos)
    servicio.exigir_nombre_libre(
        db, servicio.HABILIDADES, limpios["nombre"], None, "Ya existe una habilidad con ese nombre."
    )
    fila = Habilidad(**limpios, activo=True)
    db.add(fila)
    db.flush()
    return _habilidad(db, fila)


@router.put(
    "/habilidades/{id}",
    response_model=HabilidadAdmin,
    summary="Editar habilidad",
    operation_id="put_admin_habilidades_id",
)
def editar_habilidad(id: int, datos: HabilidadEntrada, _: Administrador, db: Db) -> HabilidadAdmin:
    fila = servicio.elemento(db, servicio.HABILIDADES, id, HABILIDAD_NO_EXISTE)
    limpios = servicio.validar_habilidad(db, datos)
    servicio.exigir_nombre_libre(
        db,
        servicio.HABILIDADES,
        limpios["nombre"],
        fila.id,
        "Ya existe una habilidad con ese nombre.",
    )
    servicio.guardar(db, fila, limpios)
    return _habilidad(db, fila)


@router.patch(
    "/habilidades/{id}",
    response_model=HabilidadAdmin,
    summary="Activar o desactivar habilidad",
    operation_id="patch_admin_habilidades_id",
)
def activar_habilidad(id: int, datos: Activacion, _: Administrador, db: Db) -> HabilidadAdmin:
    fila = servicio.elemento(db, servicio.HABILIDADES, id, HABILIDAD_NO_EXISTE)
    servicio.guardar(db, fila, {"activo": _exigir_activacion(datos)})
    return _habilidad(db, fila)


@router.delete(
    "/habilidades/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar habilidad",
    operation_id="delete_admin_habilidades_id",
)
def eliminar_habilidad(id: int, _: Administrador, db: Db) -> Response:
    fila = servicio.elemento(db, servicio.HABILIDADES, id, HABILIDAD_NO_EXISTE)
    servicio.eliminar(
        db, servicio.HABILIDADES, fila, "La habilidad está en uso; solo se puede desactivar."
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Catálogos genéricos ------------------------------------------------------------------------


def _elemento(db: Db, tipo: str, fila) -> CatalogoAdmin:
    catalogo = servicio.catalogo_de(tipo)
    return CatalogoAdmin(
        id=fila.id,
        nombre=fila.nombre,
        activo=fila.activo,
        en_uso=servicio.usos(db, catalogo, fila.id),
        **{campo: getattr(fila, campo) for campo in catalogo.extras},
    )


@router.get(
    "/catalogos/{tipo}",
    response_model=list[CatalogoAdmin],
    response_model_exclude_unset=True,
    summary="Listar catálogo",
    operation_id="get_admin_catalogos_tipo",
)
def listar_catalogo(tipo: str, _: Administrador, db: Db) -> list[CatalogoAdmin]:
    """Incluye los inactivos y cuántos registros usan cada elemento.

    Las entidades y los municipios no se editan desde el panel.
    """
    catalogo = servicio.catalogo_de(tipo)
    return [_elemento(db, tipo, f) for f in servicio.listar(db, catalogo, tipo=tipo)]


@router.post(
    "/catalogos/{tipo}",
    response_model=CatalogoAdmin,
    response_model_exclude_unset=True,
    status_code=status.HTTP_201_CREATED,
    summary="Crear elemento",
    operation_id="post_admin_catalogos_tipo",
)
def crear_elemento(tipo: str, datos: CatalogoEntrada, _: Administrador, db: Db) -> CatalogoAdmin:
    """Los campos obligatorios dependen del tipo (ver CatalogoEntrada)."""
    catalogo = servicio.catalogo_de(tipo)
    limpios = servicio.validar_elemento(db, tipo, datos, None)
    servicio.exigir_nombre_libre(
        db,
        catalogo,
        limpios["nombre"],
        None,
        "Ya existe un elemento con ese nombre en el catálogo.",
    )
    fila = catalogo.modelo(**limpios, activo=True)
    db.add(fila)
    db.flush()
    return _elemento(db, tipo, fila)


@router.put(
    "/catalogos/{tipo}/{id}",
    response_model=CatalogoAdmin,
    response_model_exclude_unset=True,
    summary="Editar elemento",
    operation_id="put_admin_catalogos_tipo_id",
)
def editar_elemento(
    tipo: str, id: int, datos: CatalogoEntrada, _: Administrador, db: Db
) -> CatalogoAdmin:
    catalogo = servicio.catalogo_de(tipo)
    fila = servicio.elemento(db, catalogo, id, ELEMENTO_NO_EXISTE)
    limpios = servicio.validar_elemento(db, tipo, datos, fila.id)
    servicio.exigir_nombre_libre(
        db,
        catalogo,
        limpios["nombre"],
        fila.id,
        "Ya existe un elemento con ese nombre en el catálogo.",
    )
    servicio.guardar(db, fila, limpios)
    return _elemento(db, tipo, fila)


@router.patch(
    "/catalogos/{tipo}/{id}",
    response_model=CatalogoAdmin,
    response_model_exclude_unset=True,
    summary="Activar o desactivar elemento",
    operation_id="patch_admin_catalogos_tipo_id",
)
def activar_elemento(
    tipo: str, id: int, datos: Activacion, _: Administrador, db: Db
) -> CatalogoAdmin:
    catalogo = servicio.catalogo_de(tipo)
    fila = servicio.elemento(db, catalogo, id, ELEMENTO_NO_EXISTE)
    servicio.guardar(db, fila, {"activo": _exigir_activacion(datos)})
    return _elemento(db, tipo, fila)


@router.delete(
    "/catalogos/{tipo}/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar elemento",
    operation_id="delete_admin_catalogos_tipo_id",
)
def eliminar_elemento(tipo: str, id: int, _: Administrador, db: Db) -> Response:
    catalogo = servicio.catalogo_de(tipo)
    fila = servicio.elemento(db, catalogo, id, ELEMENTO_NO_EXISTE)
    servicio.eliminar(db, catalogo, fila, "El elemento está en uso; solo se puede desactivar.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
