from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencias import UsuarioActual
from app.errores import ApiError
from app.modelos import Empresa, Reclutador


def empresa_del_reclutador(db: Session, actual: UsuarioActual) -> Empresa:
    empresa = db.scalar(
        select(Empresa)
        .join(Reclutador, Reclutador.empresa_id == Empresa.id)
        .where(Reclutador.usuario_id == actual.id)
    )
    if empresa is None:
        raise ApiError(404, "no_encontrado", "No encontramos tu empresa.")
    return empresa
