"""Empresas en el panel de administración (WEB-04, CU-22 y CU-26)."""

import re
from datetime import UTC, datetime

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.modelos import (
    Empresa,
    Municipio,
    Postulacion,
    Reclutador,
    Reporte,
    Sector,
    TamanoEmpresa,
    Usuario,
    Vacante,
)
from app.servicios import bitacora, notificaciones
from app.servicios.empresas import sector_de
from app.validaciones import existe, lanzar_si_hay_campos
from app.validaciones_empresa import guardados_de

ESTADOS = ("pendiente", "validada", "rechazada", "suspendida")
ESTADOS_ACTIVOS = ("postulada", "en_revision", "entrevista")
_RFC = re.compile(r"[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}")
_SITIO = re.compile(r"https?://\S+", re.IGNORECASE)


def empresa_por_id(db: Session, id_: int) -> Empresa:
    empresa = db.get(Empresa, id_) if 1 <= id_ <= 2**63 - 1 else None
    if empresa is None:
        raise ApiError(404, "no_encontrado", "La empresa no existe.")
    return empresa


def _contar(db: Session, consulta) -> int:
    return db.scalar(select(func.count()).select_from(consulta.subquery())) or 0


def fila_admin(db: Session, e: Empresa) -> dict:
    return {
        "id": e.id,
        "razon_social": e.razon_social,
        "nombre_comercial": e.nombre_comercial,
        "rfc": e.rfc,
        "sector": sector_de(db, e.sector_id),
        "estado": e.estado,
        "reclutadores": _contar(
            db, select(Reclutador.usuario_id).where(Reclutador.empresa_id == e.id)
        ),
        "vacantes_activas": _contar(
            db, select(Vacante.id).where(Vacante.empresa_id == e.id, Vacante.estado == "publicada")
        ),
        "documento": e.documento_url is not None,
        "creado_en": e.creado_en,
    }


def listar(
    db: Session,
    q: str | None,
    estado: str | None,
    sector_id: int | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[dict], int]:
    """Las pendientes primero (de la más antigua a la más reciente); luego las demás por nombre."""
    filtros = []
    texto = (q or "").strip().lower()
    if texto:
        patron = "%" + texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        filtros.append(
            or_(
                func.lower(Empresa.razon_social).like(patron, escape="\\"),
                func.lower(Empresa.nombre_comercial).like(patron, escape="\\"),
                func.lower(Empresa.rfc).like(patron, escape="\\"),
            )
        )
    if estado:
        filtros.append(Empresa.estado == estado)
    if sector_id is not None:
        filtros.append(Empresa.sector_id == sector_id)
    total = db.scalar(select(func.count()).select_from(Empresa).where(*filtros)) or 0
    pendiente = Empresa.estado == "pendiente"
    filas = db.scalars(
        select(Empresa)
        .where(*filtros)
        .order_by(
            case((pendiente, 0), else_=1),
            case((pendiente, Empresa.creado_en), else_=None),
            func.lower(Empresa.nombre_comercial),
            Empresa.id,
        )
        .limit(limite)
        .offset(desplazamiento)
    )
    return [fila_admin(db, e) for e in filas], total


def detalle(db: Session, empresa: Empresa) -> dict:
    reclutadores = db.execute(
        select(Usuario, Reclutador.puesto)
        .join(Reclutador, Reclutador.usuario_id == Usuario.id)
        .where(Reclutador.empresa_id == empresa.id)
        .order_by(Usuario.id)
    ).all()
    vacantes = select(Vacante.id).where(Vacante.empresa_id == empresa.id)
    return {
        "reclutadores": [
            {
                "usuario_id": u.id,
                "nombre": u.nombre,
                "apellidos": u.apellidos,
                "correo": u.correo,
                "puesto": puesto,
                "estado": u.estado,
            }
            for u, puesto in reclutadores
        ],
        "rfc_duplicado": db.scalar(
            select(Empresa.id).where(Empresa.rfc == empresa.rfc, Empresa.id != empresa.id).limit(1)
        )
        is not None,
        "reportes": _contar(
            db,
            select(Reporte.id).where(
                or_(Reporte.empresa_id == empresa.id, Reporte.vacante_id.in_(vacantes))
            ),
        ),
    }


def validar_entrada(db: Session, datos, actual: Empresa | None = None) -> dict:
    """Mismas reglas que el mock del panel. El RFC se pasa a mayúsculas."""

    def texto(valor) -> str:
        return valor.strip() if isinstance(valor, str) else ""

    razon = texto(datos.razon_social)
    comercial = texto(datos.nombre_comercial)
    rfc = texto(datos.rfc).upper()
    sitio = texto(datos.sitio_web) or None
    campos: dict[str, str] = {}
    if not razon or len(razon) > 200:
        campos["razon_social"] = (
            "Escribe la razón social." if not razon else "Debe tener máximo 200 caracteres."
        )
    if not comercial or len(comercial) > 150:
        campos["nombre_comercial"] = (
            "Escribe el nombre comercial." if not comercial else "Debe tener máximo 150 caracteres."
        )
    if _RFC.fullmatch(rfc) is None:
        campos["rfc"] = (
            "El RFC debe tener 3 o 4 letras, 6 dígitos de fecha y 3 caracteres de homoclave."
        )
    # Lo que la empresa ya tenía se acepta aunque su catálogo se haya desactivado después.
    if not existe(db, Sector, datos.sector_id, guardados_de(actual, "sector_id")):
        campos["sector_id"] = "Elige un sector de la lista."
    if not existe(
        db, TamanoEmpresa, datos.tamano_empresa_id, guardados_de(actual, "tamano_empresa_id")
    ):
        campos["tamano_empresa_id"] = "Elige un tamaño de la lista."
    if not existe(db, Municipio, datos.municipio_id, guardados_de(actual, "municipio_id")):
        campos["municipio_id"] = "Elige un municipio de la lista."
    if len(texto(datos.direccion)) > 255:
        campos["direccion"] = "Debe tener máximo 255 caracteres."
    for campo in ("descripcion", "practicas_inclusion"):
        if len(texto(getattr(datos, campo))) > 1000:
            campos[campo] = "Debe tener máximo 1000 caracteres."
    if sitio is not None and (len(sitio) > 255 or _SITIO.fullmatch(sitio) is None):
        campos["sitio_web"] = "Escribe la dirección completa, por ejemplo https://empresa.mx."
    lanzar_si_hay_campos(campos)
    return {
        "razon_social": razon,
        "nombre_comercial": comercial,
        "rfc": rfc,
        "sector_id": datos.sector_id,
        "tamano_empresa_id": datos.tamano_empresa_id,
        "municipio_id": datos.municipio_id,
        "direccion": texto(datos.direccion) or None,
        "descripcion": texto(datos.descripcion) or None,
        "sitio_web": sitio,
        "practicas_inclusion": texto(datos.practicas_inclusion) or None,
    }


def exigir_rfc_libre(db: Session, rfc: str, excepto: int | None) -> None:
    otra = db.scalar(select(Empresa.id).where(Empresa.rfc == rfc))
    if otra is not None and otra != excepto:
        raise ApiError(
            409,
            "rfc_duplicado",
            "Otra empresa ya registró ese RFC.",
            {"rfc": "Otra empresa ya registró ese RFC."},
        )


def crear(db: Session, limpios: dict, administrador_id: int) -> Empresa:
    """Se crea en estado «validada»."""
    exigir_rfc_libre(db, limpios["rfc"], None)
    ahora = datetime.now(UTC)
    empresa = Empresa(
        **limpios, estado="validada", validada_por=administrador_id, validada_en=ahora
    )
    db.add(empresa)
    db.flush()
    bitacora.registrar(
        db, administrador_id, "crear", "empresa", empresa.id, None, {"estado": "validada"}
    )
    db.flush()
    db.refresh(empresa)
    return empresa


def editar(db: Session, empresa: Empresa, limpios: dict, administrador_id: int) -> Empresa:
    """El administrador sí corrige razón social y RFC de una empresa validada."""
    exigir_rfc_libre(db, limpios["rfc"], empresa.id)
    anterior = {"razon_social": empresa.razon_social, "rfc": empresa.rfc}
    for campo, valor in limpios.items():
        setattr(empresa, campo, valor)
    empresa.actualizado_en = datetime.now(UTC)
    bitacora.registrar(
        db,
        administrador_id,
        "editar",
        "empresa",
        empresa.id,
        anterior,
        {"razon_social": empresa.razon_social, "rfc": empresa.rfc},
    )
    db.flush()
    return empresa


def _avisar_reclutadores(
    db: Session, empresa: Empresa, tipo: str, titulo: str, mensaje: str
) -> None:
    for (reclutador_id,) in db.execute(
        select(Reclutador.usuario_id).where(Reclutador.empresa_id == empresa.id)
    ):
        notificaciones.crear(db, reclutador_id, tipo, titulo, mensaje, "empresa", empresa.id)


def validar(
    db: Session, empresa: Empresa, decision: str | None, motivo: str | None, administrador_id: int
) -> Empresa:
    """Solo para empresas «pendiente». Registra quién y cuándo, bitácora y aviso al reclutador."""
    motivo = motivo.strip() if motivo is not None else None
    campos: dict[str, str] = {}
    if decision not in ("validada", "rechazada"):
        campos["decision"] = "Elige validar o rechazar."
    if decision == "rechazada" and not motivo:
        campos["motivo"] = "Escribe el motivo del rechazo."
    elif motivo is not None and len(motivo) > 255:
        campos["motivo"] = "Debe tener máximo 255 caracteres."
    lanzar_si_hay_campos(campos)
    if empresa.estado != "pendiente":
        raise ApiError(409, "estado_invalido", "La empresa no está pendiente.")

    ahora = datetime.now(UTC)
    empresa.estado = decision
    empresa.motivo_estado = motivo if decision == "rechazada" else None
    empresa.validada_por = administrador_id
    empresa.validada_en = ahora if decision == "validada" else None
    empresa.actualizado_en = ahora
    bitacora.registrar(
        db,
        administrador_id,
        "validar" if decision == "validada" else "rechazar",
        "empresa",
        empresa.id,
        {"estado": "pendiente"},
        {"estado": decision, "motivo": empresa.motivo_estado},
    )
    if decision == "validada":
        _avisar_reclutadores(
            db,
            empresa,
            "empresa_validada",
            "Tu empresa fue validada",
            f"Validamos a {empresa.nombre_comercial}. Ya puedes publicar vacantes.",
        )
    else:
        _avisar_reclutadores(
            db,
            empresa,
            "empresa_rechazada",
            "Revisa los datos de tu empresa",
            f"No pudimos validar a {empresa.nombre_comercial}: {motivo} "
            "Puedes subir otra constancia para que la revisemos de nuevo.",
        )
    db.flush()
    return empresa


def cambiar_estado(
    db: Session, empresa: Empresa, nuevo: str | None, motivo: str | None, administrador_id: int
) -> tuple[Empresa, int, int]:
    """Suspender una validada o reactivar una suspendida.

    Al suspender, sus vacantes publicadas pasan a «suspendida» y se avisa a los postulados con
    proceso en curso y a los reclutadores. Al reactivar, las vacantes siguen suspendidas hasta que
    el administrador las reactive una por una. Devuelve (empresa, vacantes suspendidas, avisados).
    """
    motivo = motivo.strip() if motivo is not None else None
    campos: dict[str, str] = {}
    if nuevo not in ("suspendida", "validada"):
        campos["estado"] = "Elige suspendida o validada."
    if nuevo == "suspendida" and not motivo:
        campos["motivo"] = "Escribe el motivo de la suspensión."
    elif motivo is not None and len(motivo) > 255:
        campos["motivo"] = "Debe tener máximo 255 caracteres."
    lanzar_si_hay_campos(campos)
    if (nuevo == "suspendida" and empresa.estado != "validada") or (
        nuevo == "validada" and empresa.estado != "suspendida"
    ):
        raise ApiError(
            409,
            "transicion_invalida",
            "Solo se suspende una empresa validada y solo se reactiva una suspendida.",
        )

    ahora = datetime.now(UTC)
    suspendidas: list[Vacante] = []
    avisados: set[int] = set()
    if nuevo == "suspendida":
        suspendidas = list(
            db.scalars(
                select(Vacante).where(
                    Vacante.empresa_id == empresa.id, Vacante.estado == "publicada"
                )
            )
        )
        for vacante in suspendidas:
            avisados |= suspender_vacante(db, vacante, motivo, avisar_reclutador=False)
        if suspendidas:
            _avisar_reclutadores(
                db,
                empresa,
                "vacante_suspendida",
                "Se suspendieron tus vacantes",
                f"Suspendimos a {empresa.nombre_comercial}; sus vacantes publicadas ya no se ven.",
            )
    empresa.estado = nuevo
    empresa.motivo_estado = motivo if nuevo == "suspendida" else None
    empresa.actualizado_en = ahora
    bitacora.registrar(
        db,
        administrador_id,
        "suspender" if nuevo == "suspendida" else "reactivar",
        "empresa",
        empresa.id,
        None,
        {
            "estado": nuevo,
            "motivo": empresa.motivo_estado,
            "vacantes_suspendidas": len(suspendidas),
        },
    )
    db.flush()
    return empresa, len(suspendidas), len(avisados)


def suspender_vacante(
    db: Session, vacante: Vacante, motivo: str | None, *, avisar_reclutador: bool
) -> set[int]:
    """Pasa una vacante a «suspendida» y avisa a sus postulados activos. Devuelve a quiénes."""
    vacante.estado = "suspendida"
    vacante.motivo_estado = motivo
    vacante.actualizado_en = datetime.now(UTC)
    activas = db.execute(
        select(Postulacion.id, Postulacion.candidato_id).where(
            Postulacion.vacante_id == vacante.id, Postulacion.estado.in_(ESTADOS_ACTIVOS)
        )
    ).all()
    for postulacion_id, candidato_id in activas:
        notificaciones.crear(
            db,
            candidato_id,
            "vacante_suspendida",
            "Una vacante ya no está disponible",
            f"La vacante «{vacante.titulo}» se suspendió y por ahora no recibe postulaciones.",
            "postulacion",
            postulacion_id,
        )
    if avisar_reclutador:
        notificaciones.crear(
            db,
            vacante.reclutador_id,
            "vacante_suspendida",
            "Suspendimos una de tus vacantes",
            f"La vacante «{vacante.titulo}» se suspendió. Motivo: {motivo}",
            "vacante",
            vacante.id,
        )
    return {candidato_id for _, candidato_id in activas}
