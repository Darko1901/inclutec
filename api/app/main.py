import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import Configuracion, obtener_configuracion
from app.db import fabrica_de_sesiones
from app.errores import instalar_manejadores
from app.routers import (
    archivos,
    auth,
    candidatos,
    catalogos,
    empresas,
    entrevistas,
    horarios,
    notificaciones,
    postulaciones,
    reportes,
    vacantes,
)
from app.servicios.notificaciones import despachar_en_segundo_plano
from app.servicios.recordatorios import enviar_recordatorios

PREFIJO = "/api/v1"
registro = logging.getLogger("inclutec.api")


def _recordar_una_vez() -> None:
    """Un ciclo del recordatorio: crea los avisos y, ya confirmados, los manda."""
    with fabrica_de_sesiones()() as sesion:
        enviar_recordatorios(sesion)
        sesion.commit()
        despachar_en_segundo_plano(sesion.info.pop("entregas", []))


async def _ciclo_de_recordatorios(cada_segundos: int) -> None:
    while True:
        try:
            await asyncio.to_thread(_recordar_una_vez)
        except Exception:  # noqa: BLE001 - un ciclo fallido no debe detener los siguientes
            registro.exception("Falló el ciclo de recordatorios de entrevista")
        await asyncio.sleep(cada_segundos)


@asynccontextmanager
async def _vida(_: FastAPI):
    config = obtener_configuracion()
    if config.jwt_secret == Configuracion.model_fields["jwt_secret"].default:
        registro.warning(
            "JWT_SECRET usa el valor de ejemplo: cámbialo en el .env (cadena larga y aleatoria)."
        )
    cada = config.recordatorios_cada_segundos
    tarea = asyncio.create_task(_ciclo_de_recordatorios(cada)) if cada > 0 else None
    try:
        yield
    finally:
        if tarea is not None:
            tarea.cancel()


def crear_app() -> FastAPI:
    app = FastAPI(
        title="API de IncluTec",
        version="1.2",
        description=(
            "API REST de IncluTec. Implementa el contrato de `docs/api/contrato.md` (versión 1.2): "
            "las rutas, los campos, los estados y los códigos de error se copian de ahí."
        ),
        docs_url="/docs",
        openapi_url="/openapi.json",
        lifespan=_vida,
    )
    instalar_manejadores(app)
    app.include_router(auth.router, prefix=PREFIJO)
    app.include_router(catalogos.router, prefix=PREFIJO)
    app.include_router(candidatos.router, prefix=PREFIJO)
    app.include_router(empresas.router, prefix=PREFIJO)
    app.include_router(vacantes.router, prefix=PREFIJO)
    app.include_router(postulaciones.router, prefix=PREFIJO)
    app.include_router(horarios.router, prefix=PREFIJO)
    app.include_router(entrevistas.router, prefix=PREFIJO)
    app.include_router(notificaciones.router, prefix=PREFIJO)
    app.include_router(notificaciones.router_dispositivos, prefix=PREFIJO)
    app.include_router(reportes.router, prefix=PREFIJO)
    app.include_router(reportes.router_admin, prefix=PREFIJO)
    # Los archivos se sirven fuera de /api/v1 (por ejemplo /archivos/fotos/candidato-3.jpg).
    app.include_router(archivos.router)
    return app


app = crear_app()
