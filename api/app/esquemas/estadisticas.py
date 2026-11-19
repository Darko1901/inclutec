"""Objeto Estadisticas del contrato (GET /admin/estadisticas/resumen). Solo datos agregados."""

import datetime

from pydantic import BaseModel


class Periodo(BaseModel):
    desde: datetime.date
    hasta: datetime.date


class Indicadores(BaseModel):
    candidatos_activos: int
    empresas_validadas: int
    vacantes_publicadas: int
    postulaciones: int
    contrataciones: int
    tasa_colocacion: float


class Pendientes(BaseModel):
    empresas_por_validar: int
    reportes_abiertos: int


class Conteo(BaseModel):
    etiqueta: str
    total: int


class Mes(BaseModel):
    mes: str
    postulaciones: int
    contrataciones: int


class BrechaAjuste(BaseModel):
    etiqueta: str
    solicitados: int
    ofrecidos: int


class BrechaHabilidad(BaseModel):
    etiqueta: str
    demandadas: int
    registradas: int


class Graficas(BaseModel):
    postulaciones_por_estado: list[Conteo]
    vacantes_por_modalidad: list[Conteo]
    vacantes_por_categoria: list[Conteo]
    evolucion_mensual: list[Mes]
    brecha_ajustes: list[BrechaAjuste]
    brecha_habilidades: list[BrechaHabilidad]


class Estadisticas(BaseModel):
    """Solo datos agregados.

    Las categorías con menos de 5 registros en `brecha_ajustes` se suman en «Otros» cuando hay 5
    o más candidatos; con datos de prueba se muestran tal cual.
    """

    periodo: Periodo
    indicadores: Indicadores
    pendientes: Pendientes
    graficas: Graficas
