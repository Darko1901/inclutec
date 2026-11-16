from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import obtener_configuracion


def crear_motor(url: str | None = None) -> Engine:
    return create_engine(url or obtener_configuracion().database_url, pool_pre_ping=True)


_motor: Engine | None = None
_fabrica: sessionmaker[Session] | None = None


def fabrica_de_sesiones() -> sessionmaker[Session]:
    """Crea el motor la primera vez que se necesita, no al importar el módulo."""
    global _motor, _fabrica
    if _fabrica is None:
        _motor = crear_motor()
        _fabrica = sessionmaker(bind=_motor, autoflush=False, expire_on_commit=False)
    return _fabrica


def obtener_db() -> Iterator[Session]:
    """Una sesión por petición. Confirma al terminar bien y deshace si hubo un error."""
    sesion = fabrica_de_sesiones()()
    try:
        yield sesion
        sesion.commit()
    except Exception:
        sesion.rollback()
        raise
    finally:
        sesion.close()
