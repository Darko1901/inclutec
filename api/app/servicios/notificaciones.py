"""Notificaciones dentro de la app (tabla `notificacion`, sección 2 del contrato).

Los mensajes nunca incluyen datos sensibles (necesidades de ajuste) ni detalles de sanciones.
El envío por push y por correo se agrega en el paso 4; aquí solo se crea el renglón que ve la
persona en MOV-04.
"""

from sqlalchemy.orm import Session

from app.modelos import Notificacion


def crear(
    db: Session,
    usuario_id: int,
    tipo: str,
    titulo: str,
    mensaje: str,
    referencia_tipo: str | None = None,
    referencia_id: int | None = None,
) -> Notificacion:
    notificacion = Notificacion(
        usuario_id=usuario_id,
        tipo=tipo,
        titulo=titulo[:120],
        mensaje=mensaje[:300],
        referencia_tipo=referencia_tipo,
        referencia_id=referencia_id,
    )
    db.add(notificacion)
    return notificacion
