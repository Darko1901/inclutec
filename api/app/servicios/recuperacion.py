"""Código de 6 dígitos para recuperar la contraseña (CU-04).

El código se guarda con bcrypt en `token_recuperacion`; vale 15 minutos, admite 5 intentos y el
reenvío exige 60 s. Responde igual exista o no la cuenta: para un correo que no existe se lleva un
registro en memoria que se comporta igual pero nunca acepta ningún código.
"""

import math
import secrets
import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.errores import ApiError
from app.modelos import TokenRecuperacion, Usuario
from app.validaciones import normalizar_correo

MENSAJE_SOLICITUD = "Si el correo está registrado, te enviamos un código de 6 dígitos."
MENSAJE_VENCIDO = "El código venció. Pide uno nuevo."
MENSAJE_AGOTADO = "Agotaste los intentos. Pide un código nuevo."


@dataclass
class _Fantasma:
    creado_en: float
    intentos: int = 0


_fantasmas: dict[str, _Fantasma] = {}
_candado = threading.Lock()


def reiniciar_fantasmas() -> None:
    with _candado:
        _fantasmas.clear()


def _generar_codigo() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def _hash_codigo(codigo: str) -> str:
    # El código dura minutos y tiene 5 intentos: un cost bajo basta y no vuelve lento el flujo.
    return bcrypt.hashpw(codigo.encode(), bcrypt.gensalt(rounds=4)).decode()


def _reenvio_prematuro(restante: float) -> ApiError:
    segundos = max(1, math.ceil(restante))
    return ApiError(
        429,
        "reenvio_prematuro",
        "Aún no pasan 60 segundos. Espera para pedir otro código.",
        encabezados={"Retry-After": str(segundos)},
    )


def _usuario_por_correo(db: Session, correo: str) -> Usuario | None:
    usuario = db.scalar(select(Usuario).where(Usuario.correo == correo))
    return usuario if usuario is not None and usuario.estado != "eliminado" else None


def solicitar_codigo(db: Session, correo_crudo: str) -> tuple[str, str] | None:
    """Crea el código. Devuelve (correo, código) para enviarlo, o None si la cuenta no existe."""
    config = obtener_configuracion()
    correo = normalizar_correo(correo_crudo)
    usuario = _usuario_por_correo(db, correo)
    ahora = datetime.now(UTC)

    if usuario is None:
        with _candado:
            previo = _fantasmas.get(correo)
            if previo is not None:
                restante = config.codigo_reenvio_segundos - (time.monotonic() - previo.creado_en)
                if restante > 0:
                    raise _reenvio_prematuro(restante)
            _fantasmas[correo] = _Fantasma(creado_en=time.monotonic())
        return None

    ultimo = db.scalar(
        select(TokenRecuperacion.creado_en)
        .where(TokenRecuperacion.usuario_id == usuario.id)
        .order_by(TokenRecuperacion.id.desc())
        .limit(1)
    )
    if ultimo is not None:
        restante = config.codigo_reenvio_segundos - (ahora - ultimo).total_seconds()
        if restante > 0:
            raise _reenvio_prematuro(restante)

    # Solo el código más reciente sirve: los anteriores quedan usados.
    db.execute(
        update(TokenRecuperacion)
        .where(TokenRecuperacion.usuario_id == usuario.id, TokenRecuperacion.usado_en.is_(None))
        .values(usado_en=ahora)
    )
    codigo = _generar_codigo()
    db.add(
        TokenRecuperacion(
            usuario_id=usuario.id,
            codigo_hash=_hash_codigo(codigo),
            expira_en=ahora + timedelta(seconds=config.codigo_vigencia_segundos),
        )
    )
    return correo, codigo


def _fallo_de_codigo(intentos_usados: int, maximo: int) -> ApiError:
    quedan = maximo - intentos_usados
    if quedan <= 0:
        return ApiError(410, "codigo_vencido", MENSAJE_AGOTADO)
    texto = "queda 1 intento" if quedan == 1 else f"quedan {quedan} intentos"
    return ApiError(400, "codigo_invalido", f"Código incorrecto. Te {texto}.")


def comprobar_codigo(db: Session, correo_crudo: str, codigo: str) -> Usuario | None:
    """Valida el código sin consumirlo; cada intento fallido cuenta (máximo 5).

    Devuelve el usuario si el código es correcto. Lanza 410 `codigo_vencido` si no hay código
    vigente o se agotaron los intentos, y 400 `codigo_invalido` si no coincide.
    """
    config = obtener_configuracion()
    correo = normalizar_correo(correo_crudo)
    usuario = _usuario_por_correo(db, correo)

    if usuario is None:
        with _candado:
            fantasma = _fantasmas.get(correo)
            vigente = (
                fantasma is not None
                and time.monotonic() - fantasma.creado_en <= config.codigo_vigencia_segundos
            )
            if fantasma is None or not vigente:
                raise ApiError(410, "codigo_vencido", MENSAJE_VENCIDO)
            fantasma.intentos += 1
            usados = fantasma.intentos
            if usados >= config.codigo_max_intentos:
                del _fantasmas[correo]
        raise _fallo_de_codigo(usados, config.codigo_max_intentos)

    token = db.scalar(
        select(TokenRecuperacion)
        .where(TokenRecuperacion.usuario_id == usuario.id)
        .order_by(TokenRecuperacion.id.desc())
        .limit(1)
        .with_for_update()
    )
    ahora = datetime.now(UTC)
    if token is None or token.usado_en is not None or token.expira_en < ahora:
        raise ApiError(410, "codigo_vencido", MENSAJE_VENCIDO)

    if bcrypt.checkpw(codigo.encode(), token.codigo_hash.encode()):
        return usuario

    token.intentos += 1
    if token.intentos >= config.codigo_max_intentos:
        token.usado_en = ahora
    # El intento fallido se conserva aunque se responda con error.
    db.commit()
    raise _fallo_de_codigo(token.intentos, config.codigo_max_intentos)


def consumir_codigo(db: Session, usuario: Usuario) -> None:
    """Marca como usados todos los códigos pendientes del usuario."""
    db.execute(
        update(TokenRecuperacion)
        .where(TokenRecuperacion.usuario_id == usuario.id, TokenRecuperacion.usado_en.is_(None))
        .values(usado_en=datetime.now(UTC))
    )
