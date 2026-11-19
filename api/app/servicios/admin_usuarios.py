"""Usuarios en el panel de administración (WEB-03, CU-21)."""

from datetime import UTC, datetime

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.admin import EmpresaMini, TotalesUsuario, UsuarioAdmin, UsuarioAdminDetalle
from app.modelos import (
    Candidato,
    Empresa,
    Observacion,
    Postulacion,
    Reclutador,
    Reporte,
    Rol,
    Usuario,
    Vacante,
)
from app.seguridad import hashear_contrasena
from app.validaciones import es_correo_valido, es_telefono_valido, existe, lanzar_si_hay_campos

ROLES = ("candidato", "reclutador", "administrador")
ESTADOS = ("activo", "suspendido", "eliminado")

# Sección 2 del contrato: activo ↔ suspendido; activo o suspendido → eliminado (definitivo).
TRANSICIONES: dict[str, tuple[str, ...]] = {
    "activo": ("suspendido", "eliminado"),
    "suspendido": ("activo", "eliminado"),
    "eliminado": (),
}


def rol_de(db: Session, usuario: Usuario) -> str:
    return db.scalar(select(Rol.nombre).where(Rol.id == usuario.rol_id))


def usuario_por_id(db: Session, id_: int) -> Usuario:
    usuario = db.get(Usuario, id_) if 1 <= id_ <= 2**63 - 1 else None
    if usuario is None:
        raise ApiError(404, "no_encontrado", "El usuario no existe.")
    return usuario


def vista(db: Session, usuario: Usuario) -> UsuarioAdmin:
    empresa = db.execute(
        select(Empresa.id, Empresa.nombre_comercial)
        .join(Reclutador, Reclutador.empresa_id == Empresa.id)
        .where(Reclutador.usuario_id == usuario.id)
    ).first()
    return UsuarioAdmin(
        id=usuario.id,
        nombre=usuario.nombre,
        apellidos=usuario.apellidos,
        correo=usuario.correo,
        telefono=usuario.telefono,
        rol=rol_de(db, usuario),
        estado=usuario.estado,
        empresa=EmpresaMini(id=empresa[0], nombre_comercial=empresa[1]) if empresa else None,
        creado_en=usuario.creado_en,
        ultimo_acceso_en=usuario.ultimo_acceso_en,
    )


def listar(
    db: Session,
    q: str | None,
    rol: str | None,
    estado: str | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[UsuarioAdmin], int]:
    """Más recientes primero."""
    filtros = []
    texto = (q or "").strip().lower()
    if texto:
        patron = f"%{texto.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')}%"
        filtros.append(
            or_(
                func.lower(Usuario.nombre).like(patron, escape="\\"),
                func.lower(Usuario.apellidos).like(patron, escape="\\"),
                func.lower(Usuario.correo).like(patron, escape="\\"),
                func.lower(func.concat(Usuario.nombre, " ", Usuario.apellidos)).like(
                    patron, escape="\\"
                ),
            )
        )
    if rol:
        filtros.append(Usuario.rol_id == select(Rol.id).where(Rol.nombre == rol).scalar_subquery())
    if estado:
        filtros.append(Usuario.estado == estado)
    total = db.scalar(select(func.count()).select_from(Usuario).where(*filtros)) or 0
    filas = db.scalars(
        select(Usuario)
        .where(*filtros)
        .order_by(Usuario.creado_en.desc(), Usuario.id.desc())
        .limit(limite)
        .offset(desplazamiento)
    )
    return [vista(db, u) for u in filas], total


def _cuenta(db: Session, consulta) -> int:
    return db.scalar(select(func.count()).select_from(consulta.subquery())) or 0


def detalle(db: Session, usuario: Usuario) -> UsuarioAdminDetalle:
    rol = rol_de(db, usuario)
    vacantes_propias = select(Vacante.id).where(Vacante.reclutador_id == usuario.id)
    if rol == "candidato":
        recibidos = _cuenta(db, select(Reporte.id).where(Reporte.candidato_id == usuario.id))
    elif rol == "reclutador":
        recibidos = _cuenta(db, select(Reporte.id).where(Reporte.vacante_id.in_(vacantes_propias)))
    else:
        recibidos = 0
    puesto = db.scalar(select(Reclutador.puesto).where(Reclutador.usuario_id == usuario.id))
    return UsuarioAdminDetalle(
        usuario=vista(db, usuario),
        motivo_estado=usuario.motivo_estado,
        puesto=puesto if rol == "reclutador" else None,
        totales=TotalesUsuario(
            postulaciones=(
                _cuenta(db, select(Postulacion.id).where(Postulacion.candidato_id == usuario.id))
                if rol == "candidato"
                else None
            ),
            vacantes=_cuenta(db, vacantes_propias) if rol == "reclutador" else None,
            reportes_recibidos=recibidos,
            reportes_hechos=_cuenta(
                db, select(Reporte.id).where(Reporte.reportante_id == usuario.id)
            ),
        ),
    )


def validar(db: Session, datos, al_crear: bool) -> dict:
    """Devuelve los datos limpios o lanza el 422 con los mensajes del mock del panel."""

    def texto(valor) -> str:
        return valor.strip() if isinstance(valor, str) else ""

    rol = texto(datos.rol)
    nombre = texto(datos.nombre)
    apellidos = texto(datos.apellidos)
    correo = texto(datos.correo).lower()
    telefono = texto(datos.telefono)
    puesto = texto(datos.puesto)
    campos: dict[str, str] = {}
    if rol not in ROLES:
        campos["rol"] = "Elige candidato, reclutador o administrador."
    if not nombre or len(nombre) > 80:
        campos["nombre"] = (
            "Escribe el nombre." if not nombre else "Debe tener máximo 80 caracteres."
        )
    if not apellidos or len(apellidos) > 120:
        campos["apellidos"] = (
            "Escribe los apellidos." if not apellidos else "Debe tener máximo 120 caracteres."
        )
    if not es_correo_valido(correo):
        campos["correo"] = "Escribe un correo válido."
    if telefono and not es_telefono_valido(telefono):
        campos["telefono"] = "Debe tener 10 dígitos."
    if al_crear:
        contrasena = datos.contrasena
        if not isinstance(contrasena, str) or not 8 <= len(contrasena) <= 64:
            campos["contrasena"] = "Debe tener de 8 a 64 caracteres."
    if rol == "reclutador":
        if not existe(db, Empresa, datos.empresa_id):
            campos["empresa_id"] = "Elige una empresa de la lista."
        if not puesto or len(puesto) > 100:
            campos["puesto"] = (
                "Escribe el puesto." if not puesto else "Debe tener máximo 100 caracteres."
            )
    lanzar_si_hay_campos(campos)
    es_reclutador = rol == "reclutador"
    return {
        "rol": rol,
        "nombre": nombre,
        "apellidos": apellidos,
        "correo": correo,
        "telefono": telefono or None,
        "empresa_id": datos.empresa_id if es_reclutador else None,
        "puesto": puesto if es_reclutador else None,
    }


def exigir_correo_libre(db: Session, correo: str, excepto: int | None) -> None:
    otro = db.scalar(select(Usuario.id).where(Usuario.correo == correo))
    if otro is not None and otro != excepto:
        raise ApiError(409, "correo_duplicado", "El correo ya está registrado.")


def _rol_id(db: Session, rol: str) -> int:
    return db.scalar(select(Rol.id).where(Rol.nombre == rol))


def _asegurar_perfil(db: Session, usuario: Usuario, limpios: dict) -> None:
    """Crea o actualiza la fila de candidato o reclutador que corresponde al rol."""
    if limpios["rol"] == "candidato" and db.get(Candidato, usuario.id) is None:
        # Un candidato creado por el administrador empieza sin consentimiento.
        db.add(Candidato(usuario_id=usuario.id))
    if limpios["rol"] == "reclutador":
        reclutador = db.get(Reclutador, usuario.id)
        if reclutador is None:
            db.add(
                Reclutador(
                    usuario_id=usuario.id,
                    empresa_id=limpios["empresa_id"],
                    puesto=limpios["puesto"],
                )
            )
        else:
            reclutador.empresa_id = limpios["empresa_id"]
            reclutador.puesto = limpios["puesto"]


def crear(db: Session, limpios: dict, contrasena: str) -> Usuario:
    exigir_correo_libre(db, limpios["correo"], None)
    usuario = Usuario(
        rol_id=_rol_id(db, limpios["rol"]),
        correo=limpios["correo"],
        contrasena_hash=hashear_contrasena(contrasena),
        nombre=limpios["nombre"],
        apellidos=limpios["apellidos"],
        telefono=limpios["telefono"],
        # La persona acepta el aviso al iniciar sesión por primera vez desde la app o el panel.
        acepto_aviso_en=datetime.now(UTC),
    )
    db.add(usuario)
    db.flush()
    _asegurar_perfil(db, usuario, limpios)
    db.flush()
    db.refresh(usuario)
    return usuario


def editar(db: Session, usuario: Usuario, limpios: dict) -> Usuario:
    """Sin contraseña. Cambiar el rol solo si no tiene postulaciones ni vacantes."""
    exigir_correo_libre(db, limpios["correo"], usuario.id)
    actual = rol_de(db, usuario)
    if limpios["rol"] != actual:
        en_uso = False
        if actual == "candidato":
            en_uso = (
                _cuenta(db, select(Postulacion.id).where(Postulacion.candidato_id == usuario.id))
                > 0
            )
        elif actual == "reclutador":
            en_uso = (
                _cuenta(db, select(Vacante.id).where(Vacante.reclutador_id == usuario.id)) > 0
                or _cuenta(db, select(Observacion.id).where(Observacion.autor_id == usuario.id)) > 0
            )
        if en_uso:
            raise ApiError(
                409, "en_uso", "No se puede cambiar el rol: tiene postulaciones o vacantes."
            )
        # Deja de ser candidato o reclutador: su perfil de ese rol desaparece.
        if actual == "candidato":
            db.execute(delete(Candidato).where(Candidato.usuario_id == usuario.id))
        elif actual == "reclutador":
            db.execute(delete(Reclutador).where(Reclutador.usuario_id == usuario.id))
        usuario.rol_id = _rol_id(db, limpios["rol"])
    usuario.correo = limpios["correo"]
    usuario.nombre = limpios["nombre"]
    usuario.apellidos = limpios["apellidos"]
    usuario.telefono = limpios["telefono"]
    usuario.actualizado_en = datetime.now(UTC)
    db.flush()
    _asegurar_perfil(db, usuario, limpios)
    db.flush()
    return usuario


def cambiar_estado(
    db: Session, usuario: Usuario, administrador_id: int, nuevo: str | None, motivo: str | None
) -> Usuario:
    """Nunca se borra físicamente; un usuario suspendido o eliminado no puede iniciar sesión."""
    motivo = motivo.strip() if motivo is not None else None
    campos: dict[str, str] = {}
    if nuevo not in ESTADOS:
        campos["estado"] = "Elige activo, suspendido o eliminado."
    if nuevo != "activo" and not motivo:
        campos["motivo"] = "Escribe el motivo."
    elif motivo is not None and len(motivo) > 255:
        campos["motivo"] = "Debe tener máximo 255 caracteres."
    lanzar_si_hay_campos(campos)
    if usuario.id == administrador_id and nuevo != "activo":
        raise ApiError(409, "estado_invalido", "Un administrador no puede suspenderse a sí mismo.")
    if nuevo not in TRANSICIONES[usuario.estado]:
        raise ApiError(
            409,
            "transicion_invalida",
            "Una cuenta eliminada ya no cambia de estado."
            if usuario.estado == "eliminado"
            else f"La cuenta ya está en «{usuario.estado}».",
        )
    usuario.estado = nuevo
    usuario.motivo_estado = None if nuevo == "activo" else motivo
    usuario.actualizado_en = datetime.now(UTC)
    db.flush()
    return usuario
