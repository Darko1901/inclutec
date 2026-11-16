"""Bloqueo del login tras 5 intentos fallidos con el mismo correo (15 minutos).

Guarda los intentos en memoria del proceso: la base de datos no tiene tabla para esto y el API se
corre con un solo proceso en desarrollo. Un reinicio del servidor los borra.
"""

import threading
import time
from dataclasses import dataclass


@dataclass
class _Intentos:
    fallidos: int = 0
    bloqueado_hasta: float | None = None


class LimiteIntentos:
    def __init__(self, maximo: int, bloqueo_segundos: int) -> None:
        self._maximo = maximo
        self._bloqueo = bloqueo_segundos
        self._estado: dict[str, _Intentos] = {}
        self._candado = threading.Lock()

    def segundos_restantes(self, clave: str) -> int:
        """Segundos que faltan para que se libere el correo; 0 si no está bloqueado."""
        with self._candado:
            intentos = self._estado.get(clave)
            if intentos is None or intentos.bloqueado_hasta is None:
                return 0
            restante = intentos.bloqueado_hasta - time.monotonic()
            if restante > 0:
                return int(restante) + 1
            # El bloqueo ya terminó: se empieza de cero.
            del self._estado[clave]
            return 0

    def registrar_fallo(self, clave: str) -> None:
        with self._candado:
            intentos = self._estado.setdefault(clave, _Intentos())
            intentos.fallidos += 1
            if intentos.fallidos >= self._maximo:
                intentos.bloqueado_hasta = time.monotonic() + self._bloqueo

    def limpiar(self, clave: str) -> None:
        with self._candado:
            self._estado.pop(clave, None)

    def reiniciar(self) -> None:
        with self._candado:
            self._estado.clear()
