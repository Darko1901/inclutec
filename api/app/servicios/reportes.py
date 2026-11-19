"""Reportes de vacantes, empresas y candidatos (CU-07, CU-12, CU-17 y CU-26)."""

from datetime import UTC, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.comunes import Ref
from app.esquemas.reporte import (
    EventoReporte,
    ObjetoReportado,
    Persona,
    PersonaCorta,
    ReporteAdmin,
    ReporteAdminDetalle,
    ReporteEntrada,
    ReportePrevio,
)
from app.modelos import (
    Empresa,
    HistorialReporte,
    MotivoReporte,
    Postulacion,
    Reclutador,
    Reporte,
    Usuario,
    Vacante,
)
from app.servicios import notificaciones
from app.servicios.vacantes import es_visible_para_candidato
from app.validaciones import existe, id_en_rango, lanzar_si_hay_campos

MAX_DESCRIPCION = 500
MAX_COMENTARIO = 500
MAX_RESOLUCION = 1000
ESTADOS = ("abierto", "en_revision", "resuelto", "descartado")
TIPOS = ("vacante", "empresa", "candidato")
ORDENES = ("antiguos", "recientes")

# Estado → estados a los que puede pasar (sección 2 del contrato).
TRANSICIONES: dict[str, tuple[str, ...]] = {
    "abierto": ("en_revision", "descartado"),
    "en_revision": ("resuelto", "descartado"),
    "resuelto": (),
    "descartado": (),
}


def tipo_de(r: Reporte) -> str:
    if r.vacante_id is not None:
        return "vacante"
    return "empresa" if r.empresa_id is not None else "candidato"


def objeto_id(r: Reporte) -> int:
    return r.vacante_id or r.empresa_id or r.candidato_id


# --- Crear (candidato y reclutador) -------------------------------------------------------------


def crear(db: Session, usuario_id: int, rol: str, datos: ReporteEntrada) -> Reporte:
    """El candidato reporta vacantes o empresas; el reclutador, candidatos que se le postularon."""
    indicados = [t for t in TIPOS if getattr(datos, f"{t}_id") is not None]
    campos: dict[str, str] = {}
    if len(indicados) != 1:
        campos["vacante_id"] = "Indica exactamente una vacante, una empresa o un candidato."
    objeto = indicados[0] if len(indicados) == 1 else None
    motivo = (
        db.get(MotivoReporte, datos.motivo_reporte_id)
        if existe(db, MotivoReporte, datos.motivo_reporte_id)
        else None
    )
    if motivo is None:
        campos["motivo_reporte_id"] = "Elige un motivo de la lista."
    elif objeto and motivo.aplica_a not in ("todos", objeto):
        campos["motivo_reporte_id"] = "Ese motivo no aplica a lo que estás reportando."
    if datos.descripcion is not None and len(datos.descripcion) > MAX_DESCRIPCION:
        campos["descripcion"] = f"La descripción puede tener hasta {MAX_DESCRIPCION} caracteres."
    lanzar_si_hay_campos(campos)

    permitidos = ("vacante", "empresa") if rol == "candidato" else ("candidato",)
    if objeto not in permitidos:
        raise ApiError(403, "sin_permiso", "No tienes permiso para realizar esta operación.")

    no_encontrado = ApiError(404, "no_encontrado", "Lo que quieres reportar ya no existe.")
    valor = getattr(datos, f"{objeto}_id")
    if objeto == "vacante":
        vacante = db.get(Vacante, valor) if id_en_rango(Vacante, valor) else None
        if vacante is None or not es_visible_para_candidato(db, vacante):
            raise no_encontrado
    elif objeto == "empresa":
        empresa = db.get(Empresa, valor) if id_en_rango(Empresa, valor) else None
        if empresa is None or empresa.estado != "validada":
            raise no_encontrado
    else:
        # El reclutador solo reporta a quien se postuló a una vacante de su empresa.
        empresa_id = db.scalar(
            select(Reclutador.empresa_id).where(Reclutador.usuario_id == usuario_id)
        )
        se_postulo = (
            id_en_rango(Usuario, valor)
            and db.scalar(
                select(Postulacion.id)
                .join(Vacante, Vacante.id == Postulacion.vacante_id)
                .where(Postulacion.candidato_id == valor, Vacante.empresa_id == empresa_id)
                .limit(1)
            )
            is not None
        )
        if not se_postulo:
            raise no_encontrado

    descripcion = (
        datos.descripcion.strip() if datos.descripcion and datos.descripcion.strip() else None
    )
    reporte = Reporte(
        reportante_id=usuario_id,
        motivo_reporte_id=motivo.id,
        vacante_id=datos.vacante_id if objeto == "vacante" else None,
        empresa_id=datos.empresa_id if objeto == "empresa" else None,
        candidato_id=datos.candidato_id if objeto == "candidato" else None,
        descripcion=descripcion,
        estado="abierto",
    )
    db.add(reporte)
    db.flush()
    db.add(
        HistorialReporte(
            reporte_id=reporte.id,
            usuario_id=usuario_id,
            estado_anterior=None,
            estado_nuevo="abierto",
        )
    )
    db.flush()
    db.refresh(reporte)
    return reporte


# --- Lado del administrador ---------------------------------------------------------------------


def _nombre_objeto(db: Session, r: Reporte) -> str:
    tipo = tipo_de(r)
    if tipo == "vacante":
        vacante = db.get(Vacante, r.vacante_id)
        empresa = db.get(Empresa, vacante.empresa_id)
        return f"{vacante.titulo} · {empresa.nombre_comercial}"
    if tipo == "empresa":
        return db.get(Empresa, r.empresa_id).nombre_comercial
    usuario = db.get(Usuario, r.candidato_id)
    return f"{usuario.nombre} {usuario.apellidos}".strip()


def _estado_objeto(db: Session, r: Reporte) -> str:
    tipo = tipo_de(r)
    if tipo == "vacante":
        return db.get(Vacante, r.vacante_id).estado
    if tipo == "empresa":
        return db.get(Empresa, r.empresa_id).estado
    return db.get(Usuario, r.candidato_id).estado


def _persona(db: Session, usuario_id: int) -> Persona:
    u = db.get(Usuario, usuario_id)
    return Persona(id=u.id, nombre=u.nombre, apellidos=u.apellidos)


def vista(db: Session, r: Reporte) -> ReporteAdmin:
    motivo = db.get(MotivoReporte, r.motivo_reporte_id)
    return ReporteAdmin(
        id=r.id,
        tipo=tipo_de(r),
        objeto=ObjetoReportado(id=objeto_id(r), nombre=_nombre_objeto(db, r)),
        motivo=Ref(id=motivo.id, nombre=motivo.nombre),
        reportante=_persona(db, r.reportante_id),
        estado=r.estado,
        creado_en=r.creado_en,
    )


def detalle(db: Session, r: Reporte) -> ReporteAdminDetalle:
    tipo = tipo_de(r)
    columna = {"vacante": Reporte.vacante_id, "empresa": Reporte.empresa_id}.get(
        tipo, Reporte.candidato_id
    )
    previos = db.scalars(
        select(Reporte)
        .where(columna == objeto_id(r), Reporte.id != r.id)
        .order_by(Reporte.creado_en, Reporte.id)
    )
    historial = db.scalars(
        select(HistorialReporte)
        .where(HistorialReporte.reporte_id == r.id)
        .order_by(HistorialReporte.creado_en, HistorialReporte.id)
    )
    eventos = []
    for h in historial:
        # `usuario` es el administrador que movió el reporte. El renglón de alta (sin estado
        # anterior) va con `usuario: null`, como en el ejemplo del contrato: quien reportó ya
        # viene en `reporte.reportante`.
        alta = h.estado_anterior is None
        usuario = db.get(Usuario, h.usuario_id) if h.usuario_id is not None and not alta else None
        eventos.append(
            EventoReporte(
                estado_anterior=h.estado_anterior,
                estado_nuevo=h.estado_nuevo,
                comentario=h.comentario,
                usuario=PersonaCorta(id=usuario.id, nombre=usuario.nombre) if usuario else None,
                creado_en=h.creado_en,
            )
        )
    return ReporteAdminDetalle(
        reporte=vista(db, r),
        descripcion=r.descripcion,
        resolucion=r.resolucion,
        accion=r.accion,
        atendido_por=_persona(db, r.atendido_por) if r.atendido_por is not None else None,
        cerrado_en=r.cerrado_en,
        historial=eventos,
        objeto_estado=_estado_objeto(db, r),
        reportes_previos=[
            ReportePrevio(
                id=p.id,
                motivo=db.get(MotivoReporte, p.motivo_reporte_id).nombre,
                estado=p.estado,
                creado_en=p.creado_en,
            )
            for p in previos
        ],
    )


def filtros_de_bandeja(
    estado: str | None,
    tipo: str | None,
    motivo_reporte_id: int | None,
    vacante_id: int | None,
    empresa_id: int | None,
    candidato_id: int | None,
) -> list:
    filtros = []
    if estado:
        filtros.append(Reporte.estado == estado)
    if tipo == "vacante":
        filtros.append(Reporte.vacante_id.is_not(None))
    elif tipo == "empresa":
        filtros.append(Reporte.empresa_id.is_not(None))
    elif tipo == "candidato":
        filtros.append(Reporte.candidato_id.is_not(None))
    for columna, valor in (
        (Reporte.motivo_reporte_id, motivo_reporte_id),
        (Reporte.vacante_id, vacante_id),
        (Reporte.empresa_id, empresa_id),
        (Reporte.candidato_id, candidato_id),
    ):
        if valor is not None:
            filtros.append(columna == valor)
    return filtros


def bandeja(
    db: Session, filtros: list, orden: str, desplazamiento: int, limite: int
) -> tuple[list[ReporteAdmin], int]:
    condicion = and_(True, *filtros)
    total = db.scalar(select(func.count()).select_from(Reporte).where(condicion)) or 0
    criterio = (
        (Reporte.creado_en.desc(), Reporte.id.desc())
        if orden == "recientes"
        else (Reporte.creado_en, Reporte.id)
    )
    filas = db.scalars(
        select(Reporte).where(condicion).order_by(*criterio).limit(limite).offset(desplazamiento)
    )
    return [vista(db, r) for r in filas], total


def seguimiento(
    db: Session,
    reporte: Reporte,
    administrador_id: int,
    nuevo: str | None,
    comentario: str | None,
    resolucion: str | None,
    accion: str | None,
) -> ReporteAdminDetalle:
    """abierto → en_revision → resuelto o descartado; abierto → descartado.

    Cerrar exige la resolución.
    """
    comentario = comentario.strip() if comentario is not None else None
    resolucion = resolucion.strip() if resolucion is not None else None
    cierra = nuevo in ("resuelto", "descartado")
    campos: dict[str, str] = {}
    if nuevo not in ("en_revision", "resuelto", "descartado"):
        campos["estado"] = "Elige en_revision, resuelto o descartado."
    if comentario is not None and len(comentario) > MAX_COMENTARIO:
        campos["comentario"] = f"Debe tener máximo {MAX_COMENTARIO} caracteres."
    if cierra and not resolucion:
        campos["resolucion"] = "Escribe la resolución para cerrar el reporte."
    elif resolucion is not None and len(resolucion) > MAX_RESOLUCION:
        campos["resolucion"] = f"Debe tener máximo {MAX_RESOLUCION} caracteres."
    if accion is not None and accion not in ("ninguna", "suspension"):
        campos["accion"] = "Elige ninguna o suspension."
    lanzar_si_hay_campos(campos)

    if nuevo not in TRANSICIONES[reporte.estado]:
        raise ApiError(
            409,
            "transicion_invalida",
            "El reporte ya está cerrado."
            if reporte.estado in ("resuelto", "descartado")
            else (
                "Un reporte abierto primero se toma en revisión o se descarta; "
                "solo uno en revisión se resuelve."
            ),
        )

    ahora = datetime.now(UTC)
    db.add(
        HistorialReporte(
            reporte_id=reporte.id,
            usuario_id=administrador_id,
            estado_anterior=reporte.estado,
            estado_nuevo=nuevo,
            comentario=comentario or None,
        )
    )
    reporte.estado = nuevo
    reporte.atendido_por = administrador_id
    if cierra:
        reporte.resolucion = resolucion
        # Descartar nunca lleva sanción.
        reporte.accion = "ninguna" if nuevo == "descartado" else (accion or "ninguna")
        reporte.cerrado_en = ahora
        # Avisa a quien reportó, sin detalles de la sanción.
        notificaciones.crear(
            db,
            reporte.reportante_id,
            "reporte_resuelto",
            "Revisamos tu reporte",
            "Gracias por avisarnos. Ya revisamos tu reporte y lo cerramos."
            if nuevo == "resuelto"
            else "Gracias por avisarnos. Revisamos tu reporte y no encontramos motivo para actuar.",
            "reporte",
            reporte.id,
        )
    db.flush()
    return detalle(db, reporte)


def reporte_por_id(db: Session, id_: int) -> Reporte:
    reporte = db.get(Reporte, id_) if 1 <= id_ <= 2**63 - 1 else None
    if reporte is None:
        raise ApiError(404, "no_encontrado", "El reporte no existe.")
    return reporte
