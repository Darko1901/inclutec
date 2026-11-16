from sqlalchemy import select
from sqlalchemy.orm import Session

from app.esquemas.auth import EmpresaDeSesion
from app.esquemas.auth import Usuario as UsuarioSalida
from app.modelos import Candidato, Empresa, Reclutador, Usuario


def usuario_de_sesion(db: Session, usuario: Usuario, rol: str) -> UsuarioSalida:
    """Arma el objeto Usuario del contrato: empresa (reclutador) y consentimiento (candidato)."""
    empresa: EmpresaDeSesion | None = None
    consentimiento: bool | None = None
    if rol == "reclutador":
        fila = db.execute(
            select(Empresa.id, Empresa.nombre_comercial, Empresa.estado)
            .join(Reclutador, Reclutador.empresa_id == Empresa.id)
            .where(Reclutador.usuario_id == usuario.id)
        ).first()
        if fila is not None:
            empresa = EmpresaDeSesion(id=fila[0], nombre_comercial=fila[1], estado=fila[2])
    elif rol == "candidato":
        otorgado = db.scalar(
            select(Candidato.consentimiento_sensibles_en).where(Candidato.usuario_id == usuario.id)
        )
        consentimiento = otorgado is not None
    return UsuarioSalida(
        id=usuario.id,
        correo=usuario.correo,
        nombre=usuario.nombre,
        apellidos=usuario.apellidos,
        telefono=usuario.telefono,
        rol=rol,
        estado=usuario.estado,
        empresa=empresa,
        consentimiento_sensibles=consentimiento,
    )
