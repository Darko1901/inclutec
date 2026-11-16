from fastapi import FastAPI

from app.errores import instalar_manejadores
from app.routers import archivos, auth, candidatos, catalogos, empresas

PREFIJO = "/api/v1"


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
    )
    instalar_manejadores(app)
    app.include_router(auth.router, prefix=PREFIJO)
    app.include_router(catalogos.router, prefix=PREFIJO)
    app.include_router(candidatos.router, prefix=PREFIJO)
    app.include_router(empresas.router, prefix=PREFIJO)
    # Los archivos se sirven fuera de /api/v1 (por ejemplo /archivos/fotos/candidato-3.jpg).
    app.include_router(archivos.router)
    return app


app = crear_app()
