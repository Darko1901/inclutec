"""Estadísticas del panel (WEB-02, CU-20). Solo datos agregados (RF-07): nunca identifican a nadie.

Mismas definiciones que el mock del panel (web/app/Servicios/Api/Mock/CalculadoraEstadisticas.php):

- `postulaciones`: creadas en el periodo. `contrataciones`: pasaron a «aceptada» en el periodo
  (una por cada cambio de estado del historial).
- `tasa_colocacion`: candidatos con al menos una postulación aceptada en el periodo ÷ candidatos
  que se postularon en el periodo × 100, a un decimal.
- Candidatos, empresas, vacantes, pendientes y brechas son el estado actual; no dependen del
  periodo.
- Las fechas del periodo son días de la Ciudad de México.

Privacidad de `brecha_ajustes`: si hay 5 o más candidatos que comparten necesidades, cada ajuste
pedido por menos de 5 se suma en «Otros», para que un número pequeño no apunte a una persona. Con
menos candidatos (los datos de prueba) se muestran tal cual, como pide el contrato.
"""

import datetime
import re
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import Date, cast, distinct, func, literal_column, select
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.estadisticas import (
    BrechaAjuste,
    BrechaHabilidad,
    Conteo,
    Estadisticas,
    Graficas,
    Indicadores,
    Mes,
    Pendientes,
    Periodo,
)
from app.modelos import (
    Ajuste,
    Candidato,
    CandidatoHabilidad,
    Categoria,
    Empresa,
    Habilidad,
    HistorialPostulacion,
    Modalidad,
    Postulacion,
    Reporte,
    Rol,
    Usuario,
    Vacante,
    VacanteAjuste,
    VacanteHabilidad,
    t_candidato_necesidad,
)
from app.servicios.horarios import ZONA
from app.validaciones import MENSAJE_VALIDACION

#: Orden de los estados de postulación en la gráfica.
ESTADOS_POSTULACION = (
    "postulada",
    "en_revision",
    "entrevista",
    "aceptada",
    "no_seleccionada",
    "retirada",
)
#: Ajustes y habilidades que se comparan en las gráficas de brecha.
MAX_BRECHAS = 8
#: Umbral de privacidad de `brecha_ajustes`.
MINIMO_ANONIMATO = 5
DIAS_POR_OMISION = 30
#: Un periodo más largo ya no cabe en una gráfica mensual legible (y evita respuestas enormes).
MAXIMO_ANIOS = 10

_FECHA = re.compile(r"\d{4}-\d{2}-\d{2}")


def _leer_fecha(valor: str | None) -> datetime.date | None | str:
    """La fecha, None si no vino, o el texto de error."""
    if valor is None:
        return None
    if _FECHA.fullmatch(valor):
        try:
            return datetime.date.fromisoformat(valor)
        except ValueError:
            pass
    return "Escribe la fecha como AAAA-MM-DD."


def leer_periodo(desde: str | None, hasta: str | None) -> tuple[datetime.date, datetime.date]:
    """Valida el periodo. Por omisión, los últimos 30 días hasta hoy."""
    leidas = {"desde": _leer_fecha(desde), "hasta": _leer_fecha(hasta)}
    campos = {campo: v for campo, v in leidas.items() if isinstance(v, str)}
    if campos:
        raise ApiError(422, "validacion", MENSAJE_VALIDACION, campos)
    fin = leidas["hasta"] or datetime.datetime.now(ZONA).date()
    inicio = leidas["desde"]
    if inicio is None:
        omision = fin.toordinal() - DIAS_POR_OMISION
        inicio = datetime.date.fromordinal(max(omision, 1))
    if inicio > fin:
        campos = (
            {"hasta": "La fecha final no puede ser anterior a la inicial."}
            if hasta is not None
            else {"desde": "La fecha inicial no puede ser posterior a hoy."}
        )
    elif fin.year - inicio.year > MAXIMO_ANIOS:
        campos = {"desde": f"Elige un periodo de máximo {MAXIMO_ANIOS} años."}
    if campos:
        raise ApiError(422, "validacion", MENSAJE_VALIDACION, campos)
    return inicio, fin


#: Constantes en el SQL (no parámetros) para que PostgreSQL reconozca el mismo GROUP BY.
_ZONA_SQL = literal_column(f"'{ZONA.key}'")
_FORMATO_MES = literal_column("'YYYY-MM'")


def _dia(columna):
    """El día (Ciudad de México) de una fecha-hora guardada."""
    return cast(func.timezone(_ZONA_SQL, columna), Date)


def _mes(columna):
    return func.to_char(func.timezone(_ZONA_SQL, columna), _FORMATO_MES)


def _redondear(valor: Decimal) -> float:
    return float(valor.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def _contar(db: Session, consulta) -> int:
    return db.scalar(consulta) or 0


def _meses(inicio: datetime.date, fin: datetime.date) -> list[str]:
    anio, mes = inicio.year, inicio.month
    lista = []
    while (anio, mes) <= (fin.year, fin.month):
        lista.append(f"{anio:04d}-{mes:02d}")
        anio, mes = (anio + 1, 1) if mes == 12 else (anio, mes + 1)
    return lista


def _por_catalogo(db: Session, columna, catalogo) -> list[Conteo]:
    filas = db.execute(
        select(catalogo.nombre, func.count())
        .select_from(Vacante)
        .join(catalogo, catalogo.id == columna)
        .where(Vacante.estado == "publicada")
        .group_by(catalogo.id, catalogo.nombre)
    ).all()
    filas = sorted(filas, key=lambda f: (-f[1], f[0]))
    return [Conteo(etiqueta=nombre, total=total) for nombre, total in filas]


def _comparar(catalogo: dict[int, str], primero: dict[int, int], segundo: dict[int, int]):
    """Renglones (etiqueta, a, b) con algún valor, de mayor a menor por a y luego por b."""
    filas = [
        (nombre, primero.get(id_, 0), segundo.get(id_, 0))
        for id_, nombre in catalogo.items()
        if primero.get(id_, 0) + segundo.get(id_, 0) > 0
    ]
    return sorted(filas, key=lambda f: (-f[1], -f[2], f[0]))


def calcular(db: Session, inicio: datetime.date, fin: datetime.date) -> Estadisticas:
    rol_candidato = select(Rol.id).where(Rol.nombre == "candidato").scalar_subquery()
    activos = select(Usuario.id).where(Usuario.rol_id == rol_candidato, Usuario.estado == "activo")

    en_periodo = _dia(Postulacion.creado_en).between(inicio, fin)
    aceptada_en_periodo = (HistorialPostulacion.estado_nuevo == "aceptada") & _dia(
        HistorialPostulacion.creado_en
    ).between(inicio, fin)

    postulaciones = _contar(db, select(func.count()).select_from(Postulacion).where(en_periodo))
    contrataciones = _contar(
        db,
        select(func.count()).select_from(HistorialPostulacion).where(aceptada_en_periodo),
    )
    postulantes = _contar(
        db, select(func.count(distinct(Postulacion.candidato_id))).where(en_periodo)
    )
    colocados = _contar(
        db,
        select(func.count(distinct(Postulacion.candidato_id)))
        .join(HistorialPostulacion, HistorialPostulacion.postulacion_id == Postulacion.id)
        .where(aceptada_en_periodo),
    )
    tasa = _redondear(Decimal(colocados) * 100 / Decimal(postulantes)) if postulantes else 0.0

    def estado_de(modelo, estado: str) -> int:
        return _contar(db, select(func.count()).select_from(modelo).where(modelo.estado == estado))

    # --- Gráficas ---
    por_estado = dict(
        db.execute(
            select(Postulacion.estado, func.count()).where(en_periodo).group_by(Postulacion.estado)
        ).all()
    )
    postulaciones_mes = dict(
        db.execute(
            select(_mes(Postulacion.creado_en), func.count())
            .where(en_periodo)
            .group_by(_mes(Postulacion.creado_en))
        ).all()
    )
    contrataciones_mes = dict(
        db.execute(
            select(_mes(HistorialPostulacion.creado_en), func.count())
            .where(aceptada_en_periodo)
            .group_by(_mes(HistorialPostulacion.creado_en))
        ).all()
    )

    publicadas = select(Vacante.id).where(Vacante.estado == "publicada")
    candidatos_activos = _contar(db, select(func.count()).select_from(activos.subquery()))

    return Estadisticas(
        periodo=Periodo(desde=inicio, hasta=fin),
        indicadores=Indicadores(
            candidatos_activos=candidatos_activos,
            empresas_validadas=estado_de(Empresa, "validada"),
            vacantes_publicadas=estado_de(Vacante, "publicada"),
            postulaciones=postulaciones,
            contrataciones=contrataciones,
            tasa_colocacion=tasa,
        ),
        pendientes=Pendientes(
            empresas_por_validar=estado_de(Empresa, "pendiente"),
            reportes_abiertos=estado_de(Reporte, "abierto"),
        ),
        graficas=Graficas(
            postulaciones_por_estado=[
                Conteo(etiqueta=e, total=por_estado[e])
                for e in ESTADOS_POSTULACION
                if por_estado.get(e)
            ],
            vacantes_por_modalidad=_por_catalogo(db, Vacante.modalidad_id, Modalidad),
            vacantes_por_categoria=_por_catalogo(db, Vacante.categoria_id, Categoria),
            evolucion_mensual=[
                Mes(
                    mes=mes,
                    postulaciones=postulaciones_mes.get(mes, 0),
                    contrataciones=contrataciones_mes.get(mes, 0),
                )
                for mes in _meses(inicio, fin)
            ],
            brecha_ajustes=_brecha_ajustes(db, activos, publicadas),
            brecha_habilidades=_brecha_habilidades(db, activos, publicadas),
        ),
    )


def _brecha_ajustes(db: Session, activos, publicadas) -> list[BrechaAjuste]:
    """Necesidades de los candidatos activos con consentimiento contra ajustes de las vacantes."""
    consienten = select(Candidato.usuario_id).where(
        Candidato.usuario_id.in_(activos), Candidato.consentimiento_sensibles_en.is_not(None)
    )
    necesidad = t_candidato_necesidad.c
    solicitados = dict(
        db.execute(
            select(necesidad.ajuste_id, func.count(distinct(necesidad.candidato_id)))
            .where(necesidad.candidato_id.in_(consienten))
            .group_by(necesidad.ajuste_id)
        ).all()
    )
    ofrecidos = dict(
        db.execute(
            select(VacanteAjuste.ajuste_id, func.count(distinct(VacanteAjuste.vacante_id)))
            .where(VacanteAjuste.vacante_id.in_(publicadas))
            .group_by(VacanteAjuste.ajuste_id)
        ).all()
    )
    catalogo = dict(db.execute(select(Ajuste.id, Ajuste.nombre)).all())
    filas = _comparar(catalogo, solicitados, ofrecidos)

    otros = (0, 0)
    # Cuántos candidatos registraron al menos una necesidad (comparten este dato).
    con_necesidades = _contar(
        db,
        select(func.count(distinct(necesidad.candidato_id))).where(
            necesidad.candidato_id.in_(consienten)
        ),
    )
    if con_necesidades >= MINIMO_ANONIMATO:
        visibles = []
        for etiqueta, solicitado, ofrecido in filas:
            if 0 < solicitado < MINIMO_ANONIMATO:
                otros = (otros[0] + solicitado, otros[1] + ofrecido)
            else:
                visibles.append((etiqueta, solicitado, ofrecido))
        filas = visibles
    lista = [
        BrechaAjuste(etiqueta=e, solicitados=s, ofrecidos=o) for e, s, o in filas[:MAX_BRECHAS]
    ]
    if otros != (0, 0):
        lista.append(BrechaAjuste(etiqueta="Otros", solicitados=otros[0], ofrecidos=otros[1]))
    return lista


def _brecha_habilidades(db: Session, activos, publicadas) -> list[BrechaHabilidad]:
    """Habilidades que piden las vacantes publicadas contra las de los candidatos activos."""
    demandadas = dict(
        db.execute(
            select(VacanteHabilidad.habilidad_id, func.count(distinct(VacanteHabilidad.vacante_id)))
            .where(VacanteHabilidad.vacante_id.in_(publicadas))
            .group_by(VacanteHabilidad.habilidad_id)
        ).all()
    )
    registradas = dict(
        db.execute(
            select(
                CandidatoHabilidad.habilidad_id,
                func.count(distinct(CandidatoHabilidad.candidato_id)),
            )
            .where(CandidatoHabilidad.candidato_id.in_(activos))
            .group_by(CandidatoHabilidad.habilidad_id)
        ).all()
    )
    catalogo = dict(db.execute(select(Habilidad.id, Habilidad.nombre)).all())
    return [
        BrechaHabilidad(etiqueta=e, demandadas=d, registradas=r)
        for e, d, r in _comparar(catalogo, demandadas, registradas)[:MAX_BRECHAS]
    ]
