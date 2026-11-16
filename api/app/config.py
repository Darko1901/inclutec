from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_API = Path(__file__).resolve().parent.parent


class Configuracion(BaseSettings):
    """Configuración del API: variables de entorno y archivo .env (ver .env.example)."""

    model_config = SettingsConfigDict(env_file=RAIZ_API / ".env", extra="ignore")

    database_url: str = "postgresql+psycopg://inclutec:inclutec_dev@localhost:5432/inclutec"
    test_database_url: str = (
        "postgresql+psycopg://inclutec:inclutec_dev@localhost:5432/inclutec_pruebas"
    )
    jwt_secret: str = "cambia-esta-clave-por-una-cadena-larga-y-aleatoria"
    jwt_horas: int = 8
    bcrypt_cost: int = 12
    archivos_dir: str = "uploads"

    # Tras 5 intentos fallidos con el mismo correo, el acceso se bloquea 15 minutos.
    login_max_intentos: int = 5
    login_bloqueo_segundos: int = 15 * 60


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()
