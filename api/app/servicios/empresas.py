"""Respuestas de empresa que comparten el reclutador y el administrador."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.esquemas.comunes import Ref
from app.esquemas.empresa import EmpresaPropia, TamanoEmpresa
from app.modelos import Empresa, Reclutador, Sector
from app.modelos import TamanoEmpresa as TamanoEmpresaTabla
from app.servicios.candidato import municipio_de


def tamano_de(db: Session, tamano_id: int) -> TamanoEmpresa:
    fila = db.get(TamanoEmpresaTabla, tamano_id)
    return TamanoEmpresa(id=fila.id, nombre=fila.nombre, rango=fila.rango)


def sector_de(db: Session, sector_id: int) -> Ref:
    fila = db.get(Sector, sector_id)
    return Ref(id=fila.id, nombre=fila.nombre)


def puesto_de(db: Session, usuario_id: int) -> str | None:
    return db.scalar(select(Reclutador.puesto).where(Reclutador.usuario_id == usuario_id))


def empresa_propia_de(db: Session, empresa: Empresa, puesto: str | None) -> EmpresaPropia:
    """EmpresaPropia del contrato; `puesto` es el del reclutador que consulta (null: admin)."""
    return EmpresaPropia(
        id=empresa.id,
        razon_social=empresa.razon_social,
        nombre_comercial=empresa.nombre_comercial,
        rfc=empresa.rfc,
        sector=sector_de(db, empresa.sector_id),
        tamano_empresa=tamano_de(db, empresa.tamano_empresa_id),
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
