"""Motor de compatibilidad: fórmulas, redondeo y prueba de aceptación con los datos S002."""

from fractions import Fraction

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.modelos import Compatibilidad, Vacante
from app.servicios.compatibilidad import (
    EntradaCandidato,
    EntradaVacante,
    a_decimal3,
    calcular,
    entrada_de_candidato,
    entrada_de_vacante,
    recalcular_candidato,
)


def _candidato(**cambios) -> EntradaCandidato:
    base = {
        "habilidad_ids": frozenset(),
        "necesidad_ids": (),
        "modalidad_ids": frozenset(),
        "formaciones": (),
    }
    return EntradaCandidato(**{**base, **cambios})


def _vacante(**cambios) -> EntradaVacante:
    base = {
        "modalidad_id": 1,
        "es_hibrida": False,
        "nivel_orden": None,
        "habilidades": (),
        "ajuste_ids": frozenset(),
    }
    return EntradaVacante(**{**base, **cambios})


class TestPruebaDeAceptacion:
    def test_mariana_con_la_vacante_1_da_88_para_ella_y_83_para_la_reclutadora(
        self, db: Session
    ) -> None:
        vacante = db.get(Vacante, 1)

        resultado = calcular(entrada_de_candidato(db, 3), entrada_de_vacante(db, vacante))

        assert resultado.puntaje_candidato == 88
        assert resultado.puntaje_reclutador == 83
        assert (resultado.h, resultado.a, resultado.m, resultado.f) == (
            Fraction(7, 10),
            Fraction(1),
            Fraction(1),
            Fraction(1),
        )

    def test_las_12_filas_de_s002_coinciden_con_el_motor(self, db: Session) -> None:
        filas = db.scalars(select(Compatibilidad).order_by("candidato_id", "vacante_id")).all()
        assert len(filas) == 12

        for fila in filas:
            vacante = db.get(Vacante, fila.vacante_id)
            resultado = calcular(
                entrada_de_candidato(db, fila.candidato_id), entrada_de_vacante(db, vacante)
            )
            par = (fila.candidato_id, fila.vacante_id)
            assert resultado.puntaje_candidato == fila.puntaje_candidato, par
            assert resultado.puntaje_reclutador == fila.puntaje_reclutador, par
            assert a_decimal3(resultado.h) == fila.componente_h, par
            assert a_decimal3(resultado.a) == fila.componente_a, par
            assert a_decimal3(resultado.m) == fila.componente_m, par
            assert a_decimal3(resultado.f) == fila.componente_f, par

    def test_recalcular_candidato_deja_la_tabla_igual_que_s002(self, db: Session) -> None:
        antes = {
            (f.candidato_id, f.vacante_id): (f.puntaje_candidato, f.puntaje_reclutador)
            for f in db.scalars(select(Compatibilidad))
        }

        recalcular_candidato(db, 3)
        recalcular_candidato(db, 4)

        despues = {
            (f.candidato_id, f.vacante_id): (f.puntaje_candidato, f.puntaje_reclutador)
            for f in db.scalars(select(Compatibilidad))
        }
        # Los pares de S002 no cambian; solo se agregan los de las vacantes 7 y 8 (borradores no).
        assert {k: v for k, v in despues.items() if k in antes} == antes

    def test_los_borradores_no_tienen_compatibilidad(self, db: Session) -> None:
        recalcular_candidato(db, 3)

        borradores = db.scalar(
            text(
                "SELECT count(*) FROM compatibilidad c JOIN vacante v ON v.id = c.vacante_id "
                "WHERE v.estado = 'borrador'"
            )
        )
        assert borradores == 0


class TestFormulas:
    def test_h_pondera_el_doble_las_obligatorias(self) -> None:
        vacante = _vacante(habilidades=((1, True), (2, True), (3, False)))

        r = calcular(_candidato(habilidad_ids=frozenset({1, 3})), vacante)

        # (2·1 + 1) / (2·2 + 1)
        assert r.h == Fraction(3, 5)
        assert r.obligatorias_cumplidas == (1,)
        assert r.obligatorias_faltantes == (2,)
        assert r.deseables_cumplidas == (3,)
        assert r.deseables_faltantes == ()

    def test_vacante_sin_requisitos_da_h_igual_a_1(self) -> None:
        assert calcular(_candidato(), _vacante()).h == 1

    def test_a_es_1_si_no_hay_necesidades(self) -> None:
        assert calcular(_candidato(), _vacante()).a == 1

    def test_a_cuenta_las_necesidades_cubiertas(self) -> None:
        r = calcular(
            _candidato(necesidad_ids=(1, 2, 3, 4)), _vacante(ajuste_ids=frozenset({1, 4, 9}))
        )

        assert r.a == Fraction(1, 2)
        assert r.necesidades_cubiertas == (1, 4)
        assert r.necesidades_no_cubiertas == (2, 3)
        assert r.cubre_necesidades is False

    def test_m_vale_1_si_coincide_medio_si_es_hibrida_y_cero_si_no(self) -> None:
        candidato = _candidato(modalidad_ids=frozenset({2}))

        assert calcular(candidato, _vacante(modalidad_id=2)).m == 1
        assert calcular(candidato, _vacante(modalidad_id=3, es_hibrida=True)).m == Fraction(1, 2)
        assert calcular(candidato, _vacante(modalidad_id=1)).m == 0

    @pytest.mark.parametrize(
        ("formaciones", "esperado", "f"),
        [
            (((4, "concluida"),), "si", 1),
            (((5, "concluida"),), "si", 1),
            (((4, "en_curso"),), "cursando", Fraction(1, 2)),
            (((3, "concluida"),), "no", 0),
            (((4, "trunca"),), "no", 0),
            (((3, "concluida"), (4, "en_curso")), "cursando", Fraction(1, 2)),
            (((4, "en_curso"), (4, "concluida")), "si", 1),
            ((), "no", 0),
        ],
    )
    def test_f_segun_la_formacion_minima(self, formaciones, esperado, f) -> None:
        r = calcular(_candidato(formaciones=formaciones), _vacante(nivel_orden=4))

        assert r.formacion_cumple == esperado
        assert r.f == f

    def test_sin_formacion_minima_f_es_1(self) -> None:
        assert calcular(_candidato(), _vacante(nivel_orden=None)).f == 1


class TestPuntajes:
    def test_el_puntaje_del_reclutador_ignora_las_necesidades(self) -> None:
        vacante = _vacante(ajuste_ids=frozenset({1}))
        sin = calcular(_candidato(), vacante)
        con = calcular(_candidato(necesidad_ids=(1, 2, 3)), vacante)

        assert con.a < sin.a
        assert con.puntaje_candidato < sin.puntaje_candidato
        assert con.puntaje_reclutador == sin.puntaje_reclutador

    def test_todo_cumplido_da_100_y_nada_da_cero_o_su_piso(self) -> None:
        perfecto = calcular(
            _candidato(habilidad_ids=frozenset({1}), modalidad_ids=frozenset({1})),
            _vacante(habilidades=((1, True),)),
        )
        nada = calcular(
            _candidato(necesidad_ids=(1,)),
            _vacante(habilidades=((1, True),), ajuste_ids=frozenset({9}), nivel_orden=4),
        )

        assert (perfecto.puntaje_candidato, perfecto.puntaje_reclutador) == (100, 100)
        assert (nada.puntaje_candidato, nada.puntaje_reclutador) == (0, 0)

    def test_un_medio_exacto_sube_como_en_postgresql(self) -> None:
        # H = 1/16, A = 1, M = 0, F = 1 → 100·(0.4/16 + 0.3 + 0.15) = 47.5 exacto → 48.
        # Con coma flotante podría quedar en 47.4999… y bajar a 47.
        r = calcular(
            _candidato(habilidad_ids=frozenset({1})),
            _vacante(habilidades=tuple((i, False) for i in range(1, 17))),
        )

        assert r.h == Fraction(1, 16)
        assert r.puntaje_candidato == 48

    def test_el_puntaje_del_reclutador_tambien_redondea_hacia_arriba(self) -> None:
        # H = 1/16, M = 0, F = 1 → 100·(0.4/16 + 0.15)/0.7 = 24.8214… → 25.
        r = calcular(
            _candidato(habilidad_ids=frozenset({1})),
            _vacante(habilidades=tuple((i, False) for i in range(1, 17))),
        )

        assert r.puntaje_reclutador == 25

    def test_formacion_en_curso_e_hibrida_suman_medio_punto_cada_una(self) -> None:
        # H = 1, A = 1/8, M = 1/2, F = 1/2 → 100·(0.4 + 0.0375 + 0.075 + 0.075) = 58.75 → 59.
        r = calcular(
            _candidato(
                necesidad_ids=tuple(range(8)),
                habilidad_ids=frozenset({1}),
                formaciones=((4, "en_curso"),),
            ),
            _vacante(
                habilidades=((1, True),),
                es_hibrida=True,
                ajuste_ids=frozenset({0}),
                nivel_orden=4,
            ),
        )

        assert r.a == Fraction(1, 8)
        assert r.puntaje_candidato == 59

    def test_los_componentes_se_guardan_con_3_decimales(self) -> None:
        assert str(a_decimal3(Fraction(2, 7))) == "0.286"
        assert str(a_decimal3(Fraction(1, 2))) == "0.500"
        assert str(a_decimal3(Fraction(1))) == "1.000"
        assert str(a_decimal3(Fraction(1, 8))) == "0.125"
        assert str(a_decimal3(Fraction(5, 1000) + Fraction(1, 2000))) == "0.006"


class TestNecesidadesYConsentimiento:
    def test_sin_consentimiento_las_necesidades_no_cuentan(self, db: Session) -> None:
        db.execute(
            text("UPDATE candidato SET consentimiento_sensibles_en = NULL WHERE usuario_id = 3")
        )

        assert entrada_de_candidato(db, 3).necesidad_ids == ()

    def test_con_consentimiento_se_leen_en_orden(self, db: Session) -> None:
        assert entrada_de_candidato(db, 3).necesidad_ids == (1, 3)
