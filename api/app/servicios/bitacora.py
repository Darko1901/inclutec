"""Bitácora de acciones del administrador (tabla `bitacora`)."""

from typing import Any

from sqlalchemy.orm import Session

from app.modelos import Bitacora


def registrar(
    db: Session,
    usuario_id: int,
    accion: str,
    entidad: str,
    entidad_id: int,
    anterior: dict[str, Any] | None = None,
    nuevo: dict[str, Any] | None = None,
) -> None:
    """Anota la acción (crear, editar, validar, rechazar, suspender, reactivar…)."""
    db.add(
        Bitacora(
            usuario_id=usuario_id,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            valor_anterior=anterior,
            valor_nuevo=nuevo,
        )
    )
