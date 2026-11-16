from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencias import Db, SesionActual, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.comunes import Archivo, Pagina, Ref
from app.esquemas.empresa import EmpresaEntrada, EmpresaPropia, EmpresaResumen, TamanoEmpresa
from app.modelos import Empresa, Reclutador, Sector, Vacante
from app.modelos import TamanoEmpresa as TamanoEmpresaTabla
from app.paginacion import PaginacionConsulta
from app.servicios import archivos
from app.servicios.candidato import municipio_de
from app.validaciones import lanzar_si_hay_campos
from app.validaciones_empresa import validar_empresa

router = APIRouter(prefix="/empresas", tags=["Empresas"])

_ACENTOS = "áéíóúüñ"
_SIN_ACENTOS = "aeiouun"


def _sin_acentos(texto: str) -> str:
    return texto.lower().translate(str.maketrans(_ACENTOS, _SIN_ACENTOS))


def _tamano(db: Session, tamano_id: int) -> TamanoEmpresa:
    fila = db.get(TamanoEmpresaTabla, tamano_id)
    return TamanoEmpresa(id=fila.id, nombre=fila.nombre, rango=fila.rango)


def _sector(db: Session, sector_id: int) -> Ref:
    fila = db.get(Sector, sector_id)
    return Ref(id=fila.id, nombre=fila.nombre)


def _puesto_de(db: Session, usuario_id: int) -> str | None:
    return db.scalar(select(Reclutador.puesto).where(Reclutador.usuario_id == usuario_id))


def empresa_propia_de(db: Session, empresa: Empresa, puesto: str | None) -> EmpresaPropia:
    """EmpresaPropia del contrato; `puesto` es el del reclutador que consulta (null: admin)."""
    return EmpresaPropia(
        id=empresa.id,
        razon_social=empresa.razon_social,
        nombre_comercial=empresa.nombre_comercial,
        rfc=empresa.rfc,
        sector=_sector(db, empresa.sector_id),
        tamano_empresa=_tamano(db, empresa.tamano_empresa_id),
        municipio=municipio_de(db, empresa.municipio_id),
        direccion=empresa.direccion,
        descripcion=empresa.descripcion,
        sitio_web=empresa.sitio_web,
        logo_url=empresa.logo_url,
        practicas_inclusion=empresa.practicas_inclusion,
        documento_url=empresa.documento_url,
        estado=empresa.estado,
        motivo_estado=empresa.motivo_estado,
        validada_en=empresa.validada_en,
        puesto=puesto,
        datos_fiscales_editables=empresa.estado != "validada",
    )


def _empresa_del_reclutador(db: Session, actual: UsuarioActual) -> Empresa:
    empresa = db.scalar(
        select(Empresa)
        .join(Reclutador, Reclutador.empresa_id == Empresa.id)
        .where(Reclutador.usuario_id == actual.id)
    )
    if empresa is None:
        raise ApiError(404, "no_encontrado", "No encontramos tu empresa.")
    return empresa


Reclutadora = Annotated[UsuarioActual, Depends(exigir_roles("reclutador"))]


# --- Directorio ---------------------------------------------------------------------------------


@router.get(
    "",
    response_model=Pagina[EmpresaResumen],
    summary="Directorio de empresas",
    operation_id="get_empresas",
)
def directorio(
    _: SesionActual,
    db: Db,
    pagina: PaginacionConsulta,
    q: Annotated[str | None, Query(description="Busca en el nombre comercial.")] = None,
    sector_id: Annotated[int | None, Query(description="Filtra por sector.")] = None,
) -> Pagina[EmpresaResumen]:
    """Solo empresas validadas, ordenadas por nombre comercial."""
    filtros = [Empresa.estado == "validada"]
    texto = q.strip() if q else ""
    if texto:
        nombre = func.translate(func.lower(Empresa.nombre_comercial), _ACENTOS, _SIN_ACENTOS)
        filtros.append(nombre.contains(_sin_acentos(texto), autoescape=True))
    if sector_id is not None:
        filtros.append(Empresa.sector_id == sector_id)

    total = db.scalar(select(func.count()).select_from(Empresa).where(*filtros)) or 0
    publicadas = (
        select(func.count())
        .where(Vacante.empresa_id == Empresa.id, Vacante.estado == "publicada")
        .scalar_subquery()
    )
    filas = db.execute(
        select(Empresa, publicadas)
        .where(*filtros)
        .order_by(func.lower(Empresa.nombre_comercial), Empresa.id)
        .limit(pagina.size)
        .offset(pagina.desplazamiento)
    ).all()
    items = [
        EmpresaResumen(
            id=empresa.id,
            nombre_comercial=empresa.nombre_comercial,
            logo_url=empresa.logo_url,
            sector=_sector(db, empresa.sector_id),
            tamano_empresa=_tamano(db, empresa.tamano_empresa_id),
            municipio=municipio_de(db, empresa.municipio_id),
            vacantes_publicadas=vacantes,
        )
        for empresa, vacantes in filas
    ]
    return Pagina[EmpresaResumen](items=items, total=total, page=pagina.page, size=pagina.size)


# --- Mi organización ----------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=EmpresaPropia,
    summary="Mi organización",
    operation_id="get_empresas_me",
)
def mi_organizacion(actual: Reclutadora, db: Db) -> EmpresaPropia:
    empresa = _empresa_del_reclutador(db, actual)
    return empresa_propia_de(db, empresa, _puesto_de(db, actual.id))


def _rfc_duplicado() -> ApiError:
    mensaje = "Otra empresa ya registró ese RFC."
    return ApiError(409, "rfc_duplicado", mensaje, {"rfc": mensaje})


@router.put(
    "/me",
    response_model=EmpresaPropia,
    summary="Actualizar mi organización",
    operation_id="put_empresas_me",
)
def actualizar_organizacion(datos: EmpresaEntrada, actual: Reclutadora, db: Db) -> EmpresaPropia:
    """`razon_social` y `rfc` solo se aceptan mientras la empresa no esté validada."""
    empresa = _empresa_del_reclutador(db, actual)
    enviados = datos.model_fields_set
    lanzar_si_hay_campos(validar_empresa(db, datos, enviados))

    cambia_razon = "razon_social" in enviados and datos.razon_social.strip() != empresa.razon_social
    cambia_rfc = "rfc" in enviados and datos.rfc != empresa.rfc
    if empresa.estado == "validada" and (cambia_razon or cambia_rfc):
        raise ApiError(
            403,
            "datos_fiscales_bloqueados",
            "La razón social y el RFC de una empresa validada solo los cambia soporte.",
        )
    if cambia_rfc and db.scalar(select(Empresa.id).where(Empresa.rfc == datos.rfc)) is not None:
        raise _rfc_duplicado()

    if cambia_razon:
        empresa.razon_social = datos.razon_social.strip()
    if cambia_rfc:
        empresa.rfc = datos.rfc
    empresa.nombre_comercial = datos.nombre_comercial.strip()
    empresa.sector_id = datos.sector_id
    empresa.tamano_empresa_id = datos.tamano_empresa_id
    empresa.municipio_id = datos.municipio_id
    empresa.direccion = (datos.direccion or "").strip() or None
    empresa.descripcion = (datos.descripcion or "").strip() or None
    empresa.sitio_web = (datos.sitio_web or "").strip() or None
    empresa.practicas_inclusion = (datos.practicas_inclusion or "").strip() or None
    empresa.actualizado_en = datetime.now(UTC)
    if "puesto" in enviados:
        reclutador = db.get(Reclutador, actual.id)
        reclutador.puesto = datos.puesto.strip()
    try:
        db.flush()
    except IntegrityError as error:
        db.rollback()
        raise _rfc_duplicado() from error
    return empresa_propia_de(db, empresa, _puesto_de(db, actual.id))


@router.post(
    "/me/logo",
    response_model=Archivo,
    summary="Subir logotipo",
    operation_id="post_empresas_me_logo",
)
def subir_logo(
    actual: Reclutadora, db: Db, archivo: Annotated[UploadFile | None, File()] = None
) -> Archivo:
    empresa = _empresa_del_reclutador(db, actual)
    contenido, extension = archivos.leer_imagen(archivo, "El logotipo", "uno más ligero")
    empresa.logo_url = archivos.guardar("logos", f"empresa-{empresa.id}", extension, contenido)
    empresa.actualizado_en = datetime.now(UTC)
    return Archivo(url=empresa.logo_url)


@router.delete(
    "/me/logo",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Quitar logotipo",
    operation_id="delete_empresas_me_logo",
)
def quitar_logo(actual: Reclutadora, db: Db) -> Response:
    """Deja `logo_url` en null y borra el archivo; responde 204 aunque no hubiera logotipo."""
    empresa = _empresa_del_reclutador(db, actual)
    archivos.borrar_por_url(empresa.logo_url)
    empresa.logo_url = None
    empresa.actualizado_en = datetime.now(UTC)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/me/documento",
    response_model=Archivo,
    summary="Subir constancia de situación fiscal",
    operation_id="post_empresas_me_documento",
)
def subir_constancia(
    actual: Reclutadora, db: Db, archivo: Annotated[UploadFile | None, File()] = None
) -> Archivo:
    """Si la empresa estaba «rechazada», vuelve a «pendiente» para una nueva revisión."""
    empresa = _empresa_del_reclutador(db, actual)
    if empresa.estado == "validada":
        raise ApiError(
            409,
            "estado_invalido",
            "Tu empresa ya está validada: no necesitas subir otra constancia.",
        )
    if empresa.estado == "suspendida":
        raise ApiError(
            409,
            "estado_invalido",
            "Tu empresa está suspendida: escribe a soporte para revisarla.",
        )
    contenido = archivos.leer_pdf(archivo)
    empresa.documento_url = archivos.guardar(
        "documentos", f"empresa-{empresa.id}", "pdf", contenido
    )
    if empresa.estado == "rechazada":
        empresa.estado = "pendiente"
        empresa.motivo_estado = None
    empresa.actualizado_en = datetime.now(UTC)
    return Archivo(url=empresa.documento_url)
