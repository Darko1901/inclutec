"""Motor de compatibilidad candidato–vacante (sección 2 del contrato).

Las fórmulas son las de `db/pruebas/P002__compatibilidad.sql`:

    H = (2·obligatorias cumplidas + deseables cumplidas) / (2·obligatorias + deseables)
    A = necesidades cubiertas por la vacante / necesidades registradas  (1 si no hay)
    M = 1 si la modalidad está entre las preferidas; 0.5 si la vacante es híbrida; 0
    F = 1 si tiene una formación concluida del nivel mínimo o mayor; 0.5 si la está cursando; 0

    candidato  = round(100 · (0.40·H + 0.30·A + 0.15·M + 0.15·F))
    reclutador = round(100 · (0.40·H + 0.15·M + 0.15·F) / 0.70)      (sin A)

El cálculo es exacto (fracciones): el redondeo es «mitad hacia arriba», igual que `round()` de
PostgreSQL sobre numéricos, y no depende de errores de coma flotante. Las necesidades de ajuste
solo cuentan si el candidato dio su consentimiento, y nunca alteran el puntaje del reclutador.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as insertar
from sqlalchemy.orm import Session

from app.modelos import (
    Candidato,
    CandidatoHabilidad,
    Compatibilidad,
    Formacion,
    Modalidad,
    NivelEducativo,
    Usuario,
    Vacante,
    VacanteAjuste,
    VacanteHabilidad,
    t_candidato_modalidad,
    t_candidato_necesidad,
)

PESO_H = Fraction(40, 100)
PESO_A = Fraction(30, 100)
PESO_M = Fraction(15, 100)
PESO_F = Fraction(15, 100)
PESO_SIN_A = Fraction(70, 100)

ESTADOS_CON_COMPATIBILIDAD = ("publicada", "pausada", "cerrada", "suspendida")


@dataclass(frozen=True)
class EntradaCandidato:
    habilidad_ids: frozenset[int]
    #: Vacío si no registró necesidades o no dio su consentimiento.
    necesidad_ids: tuple[int, ...]
    modalidad_ids: frozenset[int]
    #: (orden del nivel educativo, estado) de cada formación.
    formaciones: tuple[tuple[int, str], ...]


@dataclass(frozen=True)
class EntradaVacante:
    modalidad_id: int
    es_hibrida: bool
    #: Orden del nivel educativo mínimo; None si no se exige.
    nivel_orden: int | None
    habilidades: tuple[tuple[int, bool], ...]  # (habilidad_id, obligatoria)
    ajuste_ids: frozenset[int]


@dataclass(frozen=True)
class Resultado:
    h: Fraction
    a: Fraction
    m: Fraction
    f: Fraction
    puntaje_candidato: int
    puntaje_reclutador: int
    obligatorias_cumplidas: tuple[int, ...]
    obligatorias_faltantes: tuple[int, ...]
    deseables_cumplidas: tuple[int, ...]
    deseables_faltantes: tuple[int, ...]
    necesidades_cubiertas: tuple[int, ...]
    necesidades_no_cubiertas: tuple[int, ...]
    modalidad_coincide: bool
    formacion_cumple: str  # si | cursando | no

    @property
    def cubre_necesidades(self) -> bool:
        return not self.necesidades_no_cubiertas


def _redondear_entero(valor: Fraction) -> int:
    """Mitad hacia arriba (los puntajes nunca son negativos)."""
    return int((valor + Fraction(1, 2)).__floor__())


def a_decimal3(valor: Fraction) -> Decimal:
    """Componente con 3 decimales, como se guarda en la tabla `compatibilidad`."""
    exacto = Decimal(valor.numerator) / Decimal(valor.denominator)
    return exacto.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def calcular(candidato: EntradaCandidato, vacante: EntradaVacante) -> Resultado:
    obligatorias = [i for i, obligatoria in vacante.habilidades if obligatoria]
    deseables = [i for i, obligatoria in vacante.habilidades if not obligatoria]
    obligatorias_cumplidas = [i for i in obligatorias if i in candidato.habilidad_ids]
    deseables_cumplidas = [i for i in deseables if i in candidato.habilidad_ids]
    denominador = 2 * len(obligatorias) + len(deseables)
    # Una vacante sin requisitos no deja nada por cumplir (el API no deja publicarla así).
    h = (
        Fraction(1)
        if denominador == 0
        else Fraction(2 * len(obligatorias_cumplidas) + len(deseables_cumplidas), denominador)
    )

    cubiertas = [i for i in candidato.necesidad_ids if i in vacante.ajuste_ids]
    a = (
        Fraction(1)
        if not candidato.necesidad_ids
        else Fraction(len(cubiertas), len(candidato.necesidad_ids))
    )

    coincide = vacante.modalidad_id in candidato.modalidad_ids
    m = Fraction(1) if coincide else (Fraction(1, 2) if vacante.es_hibrida else Fraction(0))

    cumple = "si"
    if vacante.nivel_orden is not None:
        minimo = vacante.nivel_orden

        def alcanza(estado: str) -> bool:
            return any(e == estado and orden >= minimo for orden, e in candidato.formaciones)

        cumple = "si" if alcanza("concluida") else "cursando" if alcanza("en_curso") else "no"
    f = {"si": Fraction(1), "cursando": Fraction(1, 2), "no": Fraction(0)}[cumple]

    return Resultado(
        h=h,
        a=a,
        m=m,
        f=f,
        puntaje_candidato=_redondear_entero(
            100 * (PESO_H * h + PESO_A * a + PESO_M * m + PESO_F * f)
        ),
        puntaje_reclutador=_redondear_entero(
            100 * (PESO_H * h + PESO_M * m + PESO_F * f) / PESO_SIN_A
        ),
        obligatorias_cumplidas=tuple(obligatorias_cumplidas),
        obligatorias_faltantes=tuple(i for i in obligatorias if i not in candidato.habilidad_ids),
        deseables_cumplidas=tuple(deseables_cumplidas),
        deseables_faltantes=tuple(i for i in deseables if i not in candidato.habilidad_ids),
        necesidades_cubiertas=tuple(cubiertas),
        necesidades_no_cubiertas=tuple(
            i for i in candidato.necesidad_ids if i not in vacante.ajuste_ids
        ),
        modalidad_coincide=coincide,
        formacion_cumple=cumple,
    )


# --- Lectura de los datos -----------------------------------------------------------------------


def entrada_de_candidato(db: Session, candidato_id: int) -> EntradaCandidato:
    candidato = db.get(Candidato, candidato_id)
    con_consentimiento = candidato.consentimiento_sensibles_en is not None
    necesidades = (
        tuple(
            db.scalars(
                select(t_candidato_necesidad.c.ajuste_id)
                .where(t_candidato_necesidad.c.candidato_id == candidato_id)
                .order_by(t_candidato_necesidad.c.ajuste_id)
            )
        )
        if con_consentimiento
        else ()
    )
    return EntradaCandidato(
        habilidad_ids=frozenset(
            db.scalars(
                select(CandidatoHabilidad.habilidad_id).where(
                    CandidatoHabilidad.candidato_id == candidato_id
                )
            )
        ),
        necesidad_ids=necesidades,
        modalidad_ids=frozenset(
            db.scalars(
                select(t_candidato_modalidad.c.modalidad_id).where(
                    t_candidato_modalidad.c.candidato_id == candidato_id
                )
            )
        ),
        formaciones=tuple(
            (orden, estado)
            for orden, estado in db.execute(
                select(NivelEducativo.orden, Formacion.estado)
                .join(NivelEducativo, NivelEducativo.id == Formacion.nivel_educativo_id)
                .where(Formacion.candidato_id == candidato_id)
            )
        ),
    )


def entrada_de_vacante(db: Session, vacante: Vacante) -> EntradaVacante:
    nombre_modalidad = db.scalar(
        select(Modalidad.nombre).where(Modalidad.id == vacante.modalidad_id)
    )
    nivel = (
        db.scalar(
            select(NivelEducativo.orden).where(NivelEducativo.id == vacante.nivel_educativo_id)
        )
        if vacante.nivel_educativo_id is not None
        else None
    )
    return EntradaVacante(
        modalidad_id=vacante.modalidad_id,
        es_hibrida=nombre_modalidad == "Híbrido",
        nivel_orden=nivel,
        habilidades=tuple(
            (h, o)
            for h, o in db.execute(
                select(VacanteHabilidad.habilidad_id, VacanteHabilidad.obligatoria)
                .where(VacanteHabilidad.vacante_id == vacante.id)
                .order_by(VacanteHabilidad.habilidad_id)
            )
        ),
        ajuste_ids=frozenset(
            db.scalars(
                select(VacanteAjuste.ajuste_id).where(VacanteAjuste.vacante_id == vacante.id)
            )
        ),
    )


# --- Persistencia (tabla `compatibilidad`) ------------------------------------------------------


def _guardar(db: Session, candidato_id: int, vacante_id: int, r: Resultado) -> None:
    valores = {
        "candidato_id": candidato_id,
        "vacante_id": vacante_id,
        "puntaje_candidato": r.puntaje_candidato,
        "puntaje_reclutador": r.puntaje_reclutador,
        "componente_h": a_decimal3(r.h),
        "componente_a": a_decimal3(r.a),
        "componente_m": a_decimal3(r.m),
        "componente_f": a_decimal3(r.f),
        "calculado_en": datetime.now(UTC),
    }
    sentencia = insertar(Compatibilidad).values(**valores)
    db.execute(
        sentencia.on_conflict_do_update(
            index_elements=["candidato_id", "vacante_id"],
            set_={k: v for k, v in valores.items() if k not in ("candidato_id", "vacante_id")},
        )
    )


def recalcular_par(db: Session, candidato_id: int, vacante: Vacante) -> Resultado:
    """Calcula la compatibilidad del par y la guarda (inserta o actualiza)."""
    resultado = calcular(entrada_de_candidato(db, candidato_id), entrada_de_vacante(db, vacante))
    _guardar(db, candidato_id, vacante.id, resultado)
    return resultado


def _candidatos_activos(db: Session) -> list[int]:
    return list(
        db.scalars(
            select(Candidato.usuario_id)
            .join(Usuario, Usuario.id == Candidato.usuario_id)
            .where(Usuario.estado == "activo")
        )
    )


def recalcular_candidato(db: Session, candidato_id: int) -> None:
    """Recalcula al candidato contra todas las vacantes que ya salieron de borrador."""
    entrada = entrada_de_candidato(db, candidato_id)
    vacantes = db.scalars(select(Vacante).where(Vacante.estado.in_(ESTADOS_CON_COMPATIBILIDAD)))
    for vacante in vacantes:
        _guardar(db, candidato_id, vacante.id, calcular(entrada, entrada_de_vacante(db, vacante)))


def recalcular_vacante(db: Session, vacante: Vacante) -> None:
    """Recalcula la vacante con todos los candidatos activos (al publicar o cambiar requisitos)."""
    if vacante.estado not in ESTADOS_CON_COMPATIBILIDAD:
        return
    entrada_vacante = entrada_de_vacante(db, vacante)
    for candidato_id in _candidatos_activos(db):
        resultado = calcular(entrada_de_candidato(db, candidato_id), entrada_vacante)
        _guardar(db, candidato_id, vacante.id, resultado)


def asegurar_candidato(db: Session, candidato_id: int, vacantes: list[Vacante]) -> None:
    """Calcula los pares que faltan o quedaron desactualizados (se editó el perfil o la vacante)."""
    if not vacantes:
        return
    actualizado_candidato = db.scalar(
        select(Candidato.actualizado_en).where(Candidato.usuario_id == candidato_id)
    )
    guardados = {
        v_id: calculado
        for v_id, calculado in db.execute(
            select(Compatibilidad.vacante_id, Compatibilidad.calculado_en).where(
                Compatibilidad.candidato_id == candidato_id,
                Compatibilidad.vacante_id.in_([v.id for v in vacantes]),
            )
        )
    }
    entrada = None
    for vacante in vacantes:
        calculado = guardados.get(vacante.id)
        if (
            calculado is not None
            and calculado >= actualizado_candidato
            and calculado >= vacante.actualizado_en
        ):
            continue
        entrada = entrada or entrada_de_candidato(db, candidato_id)
        _guardar(db, candidato_id, vacante.id, calcular(entrada, entrada_de_vacante(db, vacante)))


def puntaje_guardado(db: Session, candidato_id: int, vacante_id: int) -> int | None:
    return db.scalar(
        select(Compatibilidad.puntaje_candidato).where(
            Compatibilidad.candidato_id == candidato_id, Compatibilidad.vacante_id == vacante_id
        )
    )


def total_de_pares(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Compatibilidad)) or 0
