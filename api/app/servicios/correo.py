"""Envío de correos. Siempre en segundo plano: nunca retrasa ni rompe la respuesta."""

import logging
import smtplib
from collections.abc import Callable
from email.message import EmailMessage

from app.config import obtener_configuracion

registro = logging.getLogger("inclutec.correo")

Enviador = Callable[[str, str, str], None]
"""(destinatario, asunto, texto) → None."""


def enviar_por_smtp(destinatario: str, asunto: str, texto: str) -> None:
    """Manda el correo por el SMTP de la configuración. Un fallo se registra y no se propaga."""
    config = obtener_configuracion()
    mensaje = EmailMessage()
    mensaje["From"] = config.smtp_remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    try:
        with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=10) as servidor:
            servidor.send_message(mensaje)
    except (OSError, smtplib.SMTPException):
        # Sin servidor de correo (por ejemplo, Mailpit apagado) el API sigue funcionando.
        registro.warning("No se pudo enviar el correo «%s»", asunto, exc_info=True)


def obtener_enviador() -> Enviador:
    """Dependencia de FastAPI; las pruebas la reemplazan para no tocar la red."""
    return enviar_por_smtp


def texto_codigo_recuperacion(codigo: str, minutos: int) -> tuple[str, str]:
    asunto = "Tu código para recuperar tu contraseña de IncluTec"
    texto = (
        f"Tu código de verificación es {codigo}.\n\n"
        f"Vence en {minutos} minutos. Si no lo pediste, ignora este mensaje: "
        "tu contraseña no cambia."
    )
    return asunto, texto
