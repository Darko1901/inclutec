from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencias import Db, SesionActual, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.comunes import Archivo, Pagina, Ref
from app.esquemas.empresa import (
    EmpresaEntrada,
    EmpresaPropia,
    EmpresaPublica,
    EmpresaResumen,
    TamanoEmpresa,
)
from app.esquemas.vacante import VacanteReclutador
from app.modelos import Empresa, Reclutador, Sector, Vacante
from app.modelos import TamanoEmpresa as TamanoEmpresaTabla
from app.paginacion import IdPequeno, PaginacionConsulta
from app.servicios import archivos
from app.servicios import compatibilidad as motor
from app.servicios import vacantes as servicio_vacantes
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
    sector_id: Annotated[IdPequeno | None, Query(description="Filtra por sector.")] = None,
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


ESTADOS_VACANTE = ("borrador", "publicada", "pausada", "cerrada", "suspendida")


@router.get(
    "/me/vacantes",
    response_model=Pagina[VacanteReclutador],
    summary="Vacantes de mi empresa",
    operation_id="get_empresas_me_vacantes",
)
def mis_vacantes(
    actual: Reclutadora,
    db: Db,
    pagina: PaginacionConsulta,
    estado: Annotated[str | None, Query(description="Estado de la vacante.")] = None,
) -> Pagina[VacanteReclutador]:
    """Más recientes primero."""
    if estado is not None and estado not in ESTADOS_VACANTE:
        lanzar_si_hay_campos(
            {"estado": "El estado puede ser borrador, publicada, pausada, cerrada o suspendida."}
        )
    empresa = _empresa_del_reclutador(db, actual)
    filtros = [Vacante.empresa_id == empresa.id]
    if estado is not None:
        filtros.append(Vacante.estado == estado)
    total = db.scalar(select(func.count()).select_from(Vacante).where(*filtros)) or 0
    vacantes = db.scalars(
        select(Vacante)
        .where(*filtros)
        .order_by(
            func.coalesce(Vacante.publicada_en, Vacante.actualizado_en).desc(), Vacante.id.desc()
        )
        .limit(pagina.size)
        .offset(pagina.desplazamiento)
    )
    items = [servicio_vacantes.resumen_para_reclutador(db, v) for v in vacantes]
    return Pagina[VacanteReclutador](items=items, total=total, page=pagina.page, size=pagina.size)


@router.get(
    "/{id}",
    response_model=EmpresaPublica,
    summary="Ficha de empresa",
    operation_id="get_empresas_id",
)
def ficha(id: int, actual: SesionActual, db: Db) -> EmpresaPublica:
    """Datos públicos de una empresa validada y sus vacantes publicadas.

    La compatibilidad solo viene si quien consulta es candidato.
    """
    empresa = db.get(Empresa, id) if 1 <= id <= 2**63 - 1 else None
    if empresa is None or empresa.estado != "validada":
        raise ApiError(404, "no_encontrado", "La empresa no existe o ya no está disponible.")
    vacantes = list(
        db.scalars(
            select(Vacante)
            .where(Vacante.empresa_id == empresa.id, Vacante.estado == "publicada")
            .order_by(Vacante.publicada_en.desc().nulls_last(), Vacante.id)
        )
    )
    candidato_id = actual.id if actual.rol == "candidato" else None
    if candidato_id is not None:
        motor.asegurar_candidato(db, candidato_id, vacantes)
    return EmpresaPublica(
        id=empresa.id,
        nombre_comercial=empresa.nombre_comercial,
        logo_url=empresa.logo_url,
        sector=_sector(db, empresa.sector_id),
        tamano_empresa=_tamano(db, empresa.tamano_empresa_id),
        municipio=municipio_de(db, empresa.municipio_id),
        descripcion=empresa.descripcion,
        sitio_web=empresa.sitio_web,
        practicas_inclusion=empresa.practicas_inclusion,
        vacantes=[servicio_vacantes.resumen_de(db, v, candidato_id) for v in vacantes],
    )
