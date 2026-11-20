import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_API = Path(__file__).resolve().parent.parent

#: La clave de ejemplo de `.env.example` (y el valor por omisión). Es pública: está en el
#: repositorio, así que nunca se usa para firmar tokens.
JWT_SECRET_DE_EJEMPLO = "cambia-esta-clave-por-una-cadena-larga-y-aleatoria"
#: Clave aleatoria de esta instalación, creada la primera vez (fuera de Git).
ARCHIVO_SECRETO_LOCAL = RAIZ_API / ".jwt_secreto"


class Configuracion(BaseSettings):
    """Configuración del API: variables de entorno y archivo .env (ver .env.example)."""

    model_config = SettingsConfigDict(env_file=RAIZ_API / ".env", extra="ignore")

    database_url: str = "postgresql+psycopg://inclutec:inclutec_dev@localhost:5432/inclutec"
    test_database_url: str = (
        "postgresql+psycopg://inclutec:inclutec_dev@localhost:5432/inclutec_pruebas"
    )
    jwt_secret: str = JWT_SECRET_DE_EJEMPLO
    jwt_horas: int = 8
    bcrypt_cost: int = 12
    archivos_dir: str = "uploads"

    # Tras 5 intentos fallidos con el mismo correo, el acceso se bloquea 15 minutos.
    # Correo (en desarrollo, un SMTP local como Mailpit: smtp_host=localhost, smtp_port=1025).
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_remitente: str = "no-responder@inclutec.mx"

    # Notificaciones push (Expo). Sin tokens registrados no se manda nada.
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    # Cada cuántos segundos busca entrevistas a 24 horas para mandar el recordatorio (0 = apagado).
    recordatorios_cada_segundos: int = 300

    # Recuperación de contraseña: código de 6 dígitos, 15 minutos, 5 intentos, reenvío cada 60 s.
    codigo_vigencia_segundos: int = 15 * 60
    codigo_max_intentos: int = 5
    codigo_reenvio_segundos: int = 60

    login_max_intentos: int = 5
    login_bloqueo_segundos: int = 15 * 60


def secreto_local() -> str:
    """Lee la clave aleatoria de esta instalación o la crea la primera vez.

    Se guarda en un archivo para que sobreviva a los reinicios (y a `--reload`): con una clave
    nueva en cada arranque, todas las sesiones se cerrarían cada vez.
    """
    try:
        guardada = ARCHIVO_SECRETO_LOCAL.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        guardada = ""
    if guardada:
        return guardada
    nueva = secrets.token_urlsafe(48)
    ARCHIVO_SECRETO_LOCAL.write_text(nueva, encoding="utf-8")
    return nueva


@lru_cache
def obtener_configuracion() -> Configuracion:
    config = Configuracion()
    if config.jwt_secret == JWT_SECRET_DE_EJEMPLO:
        # Con la clave pública cualquiera en la misma red podría fabricarse un token de
        # administrador (el API escucha en la red local para el teléfono). Se usa una clave
        # aleatoria propia de esta computadora; main.py avisa al arrancar.
        config.jwt_secret = secreto_local()
    return config
