"""Notificaciones (sección 2 del contrato): en la app, push (Expo) y correo.

Cada evento crea un renglón en `notificacion` (lo ve la persona en MOV-04) y, según sus
preferencias por tipo, se manda además por push y por correo. El envío se hace **en segundo plano**
y después de confirmar la transacción: nunca retrasa la respuesta ni la rompe, y si la transacción
se deshace no sale ningún aviso. Los mensajes nunca llevan datos sensibles (necesidades de ajuste)
ni detalles de sanciones.
"""

import logging
import threading
from dataclasses import dataclass, field

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.modelos import Dispositivo, Notificacion, PreferenciaNotificacion, Usuario
from app.servicios import correo as servicio_correo

registro = logging.getLogger("inclutec.notificaciones")

TIPOS = (
    "cambio_estado",
    "nueva_postulacion",
    "entrevista_agendada",
    "entrevista_cancelada",
    "recordatorio_entrevista",
    "empresa_validada",
    "empresa_rechazada",
    "vacante_suspendida",
    "vacante_actualizada",
    "reporte_resuelto",
)

# Tipos que recibe cada rol (qué preferencias tiene sentido guardar).
TIPOS_POR_ROL: dict[str, tuple[str, ...]] = {
    "candidato": (
        "cambio_estado",
        "entrevista_cancelada",
        "recordatorio_entrevista",
        "vacante_suspendida",
        "vacante_actualizada",
        "reporte_resuelto",
    ),
    "reclutador": (
        "nueva_postulacion",
        "entrevista_agendada",
        "entrevista_cancelada",
        "recordatorio_entrevista",
        "empresa_validada",
        "empresa_rechazada",
        "vacante_suspendida",
        "reporte_resuelto",
    ),
    "administrador": (),
}


@dataclass
class Entrega:
    """Lo necesario para mandar un aviso sin volver a tocar la base de datos."""

    tipo: str
    titulo: str
    mensaje: str
    referencia: dict | None
    tokens_push: list[str] = field(default_factory=list)
    correo: str | None = None
    #: Texto del correo si difiere del mensaje (por ejemplo, la confirmación con la liga).
    correo_texto: str | None = None


def _preferencia(db: Session, usuario_id: int, tipo: str) -> tuple[bool, bool]:
    """(push, correo). Sin preferencia guardada, ambos canales están activos."""
    fila = db.execute(
        select(PreferenciaNotificacion.push, PreferenciaNotificacion.correo).where(
            PreferenciaNotificacion.usuario_id == usuario_id, PreferenciaNotificacion.tipo == tipo
        )
    ).first()
    return (fila[0], fila[1]) if fila else (True, True)


def crear(
    db: Session,
    usuario_id: int,
    tipo: str,
    titulo: str,
    mensaje: str,
    referencia_tipo: str | None = None,
    referencia_id: int | None = None,
    *,
    correo_siempre: bool = False,
    correo_texto: str | None = None,
) -> Notificacion:
    """Crea el aviso en la app y deja programado el push y el correo para después del commit.

    `correo_siempre` manda el correo aunque la persona lo haya desactivado: solo para las
    confirmaciones de una entrevista, que el contrato manda «a ambos».
    """
    notificacion = Notificacion(
        usuario_id=usuario_id,
        tipo=tipo,
        titulo=titulo[:120],
        mensaje=mensaje[:300],
        referencia_tipo=referencia_tipo,
        referencia_id=referencia_id,
    )
    db.add(notificacion)

    quiere_push, quiere_correo = _preferencia(db, usuario_id, tipo)
    usuario = db.get(Usuario, usuario_id)
    entrega = Entrega(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        referencia=(
            {"tipo": referencia_tipo, "id": referencia_id} if referencia_tipo is not None else None
        ),
        tokens_push=(
            list(
                db.scalars(
                    select(Dispositivo.expo_push_token).where(Dispositivo.usuario_id == usuario_id)
                )
            )
            if quiere_push
            else []
        ),
        correo=usuario.correo
        if usuario is not None and (quiere_correo or correo_siempre)
        else None,
        correo_texto=correo_texto,
    )
    if entrega.tokens_push or entrega.correo:
        db.info.setdefault("entregas", []).append(entrega)
    return notificacion


# --- Envío (en segundo plano) -------------------------------------------------------------------


def _enviar_push(tokens: list[str], titulo: str, mensaje: str, datos: dict | None) -> None:
    url = obtener_configuracion().expo_push_url
    cuerpo = [
        {"to": token, "title": titulo, "body": mensaje, "sound": "default", "data": datos or {}}
        for token in tokens
    ]
    try:
        httpx.post(url, json=cuerpo, timeout=10)
    except httpx.HTTPError:
        registro.warning("No se pudo mandar el push «%s»", titulo, exc_info=True)


def entregar(entregas: list[Entrega]) -> None:
    """Manda los avisos. Un fallo se registra y no se propaga."""
    for entrega in entregas:
        try:
            if entrega.tokens_push:
                _enviar_push(
                    entrega.tokens_push, entrega.titulo, entrega.mensaje, entrega.referencia
                )
            if entrega.correo:
                servicio_correo.enviar_por_smtp(
                    entrega.correo, entrega.titulo, entrega.correo_texto or entrega.mensaje
                )
        except Exception:  # noqa: BLE001 - un aviso fallido nunca debe tumbar a los demás
            registro.exception("No se pudo entregar el aviso «%s»", entrega.titulo)


def despachar_en_segundo_plano(entregas: list[Entrega]) -> None:
    """Lanza el envío en otro hilo para no retrasar la respuesta."""
    if entregas:
        threading.Thread(target=entregar, args=(entregas,), daemon=True).start()
