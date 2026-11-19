from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.estadisticas import Estadisticas
from app.servicios import estadisticas as servicio
from app.servicios import exportar_estadisticas as exportar
from app.validaciones import MENSAJE_VALIDACION

router = APIRouter(prefix="/admin/estadisticas", tags=["Administración: estadísticas"])

Administrador = Annotated[UsuarioActual, Depends(exigir_roles("administrador"))]
Desde = Annotated[str | None, Query(description="AAAA-MM-DD.")]
Hasta = Annotated[str | None, Query(description="AAAA-MM-DD.")]


@router.get(
    "/resumen",
    response_model=Estadisticas,
    summary="Indicadores y gráficas",
    operation_id="get_admin_estadisticas_resumen",
)
def resumen(_: Administrador, db: Db, desde: Desde = None, hasta: Hasta = None) -> Estadisticas:
    """Por omisión, los últimos 30 días."""
    return servicio.calcular(db, *servicio.leer_periodo(desde, hasta))


@router.get(
    "/exportar",
    summary="Exportar estadísticas",
    operation_id="get_admin_estadisticas_exportar",
    response_class=Response,
    responses={
        200: {
            "content": {
                exportar.TIPO_PDF: {"schema": {"type": "string", "format": "binary"}},
                exportar.TIPO_XLSX: {"schema": {"type": "string", "format": "binary"}},
            }
        }
    },
)
def exportar_estadisticas(
    _: Administrador,
    db: Db,
    formato: Annotated[str | None, Query(description="`pdf` o `xlsx`. Obligatorio.")] = None,
    desde: Desde = None,
    hasta: Hasta = None,
) -> Response:
    """Devuelve el archivo con `Content-Disposition: attachment`. El panel lo reenvía."""
    if formato not in ("pdf", "xlsx"):
        raise ApiError(422, "validacion", MENSAJE_VALIDACION, {"formato": "Elige pdf o xlsx."})
    datos = servicio.calcular(db, *servicio.leer_periodo(desde, hasta))
    contenido = exportar.pdf(datos) if formato == "pdf" else exportar.xlsx(datos)
    return Response(
        content=contenido,
        media_type=exportar.TIPO_PDF if formato == "pdf" else exportar.TIPO_XLSX,
        headers={
            "Content-Disposition": f'attachment; filename="{exportar.nombre(datos, formato)}"'
        },
    )
