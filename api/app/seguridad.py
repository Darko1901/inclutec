"""Contraseñas con bcrypt y tokens JWT HS256 (sección 1 del contrato)."""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import obtener_configuracion

ALGORITMO = "HS256"


def hashear_contrasena(contrasena: str) -> str:
    costo = obtener_configuracion().bcrypt_cost
    return bcrypt.hashpw(contrasena.encode(), bcrypt.gensalt(rounds=costo)).decode()


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    try:
        return bcrypt.checkpw(contrasena.encode(), hash_guardado.encode())
    except ValueError:
        # Un hash mal formado nunca debe dejar pasar a nadie ni tumbar el login.
        return False


def crear_token(usuario_id: int, rol: str) -> tuple[str, datetime]:
    """Devuelve el JWT y su vencimiento. Carga útil: {"sub": "<id>", "rol": ..., "exp": epoch}."""
    config = obtener_configuracion()
    expira = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=config.jwt_horas)
    carga = {"sub": str(usuario_id), "rol": rol, "exp": int(expira.timestamp())}
    return jwt.encode(carga, config.jwt_secret, algorithm=ALGORITMO), expira


def leer_token(token: str) -> dict | None:
    """Devuelve la carga útil o None si el token es inválido, está mal firmado o ya venció."""
    try:
        carga = jwt.decode(token, obtener_configuracion().jwt_secret, algorithms=[ALGORITMO])
    except jwt.PyJWTError:
        return None
    if not str(carga.get("sub", "")).isdigit() or "rol" not in carga:
        return None
    return carga
