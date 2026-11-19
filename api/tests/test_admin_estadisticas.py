import datetime
import io

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.servicios.horarios import ZONA
from tests.conftest import iniciar_sesion

RESUMEN = "/api/v1/admin/estadisticas/resumen"
EXPORTAR = "/api/v1/admin/estadisticas/exportar"


@pytest.fixture
def admin(cliente: TestClient) -> dict[str, str]:
    return iniciar_sesion(cliente, "admin@inclutec.mx")


def _hoy() -> datetime.date:
    return datetime.datetime.now(ZONA).date()


def _aceptar(db: Session, postulacion_id: int, cuando: str = "now()") -> None:
    db.execute(text(f"UPDATE postulacion SET estado = 'aceptada' WHERE id = {postulacion_id}"))
    db.execute(
        text(
            "INSERT INTO historial_postulacion (postulacion_id, estado_anterior, estado_nuevo, creado_en)"
            f" VALUES ({postulacion_id}, 'entrevista', 'aceptada', {cuando})"
        )
    )


def _candidatos_con_necesidad(db: Session, cuantos: int, ajuste_id: int) -> None:
    """Crea candidatos activos que consienten y registran una necesidad de ajuste."""
    for n in range(cuantos):
        usuario_id = db.scalar(
            text(
                "INSERT INTO usuario (rol_id, correo, contrasena_hash, nombre, apellidos, acepto_aviso_en)"
                " VALUES ((SELECT id FROM rol WHERE nombre = 'candidato'), :correo, 'x', 'Persona', 'Prueba', now())"
                " RETURNING id"
            ),
            {"correo": f"estadistica{ajuste_id}_{n}@correo.mx"},
        )
        db.execute(
            text(
                "INSERT INTO candidato (usuario_id, consentimiento_sensibles_en) VALUES (:id, now())"
            ),
            {"id": usuario_id},
        )
        db.execute(
            text("INSERT INTO candidato_necesidad (candidato_id, ajuste_id) VALUES (:id, :ajuste)"),
            {"id": usuario_id, "ajuste": ajuste_id},
        )


class TestResumen:
    def test_por_omision_los_ultimos_30_dias(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.get(RESUMEN, headers=admin)

        assert respuesta.status_code == 200
        e = respuesta.json()
        hoy = _hoy()
        assert e["periodo"] == {
            "desde": (hoy - datetime.timedelta(days=30)).isoformat(),
            "hasta": hoy.isoformat(),
        }
        assert list(e) == ["periodo", "indicadores", "pendientes", "graficas"]
        assert e["indicadores"] == {
            "candidatos_activos": 2,
            "empresas_validadas": 3,
            "vacantes_publicadas": 6,
            "postulaciones": 2,
            "contrataciones": 0,
            "tasa_colocacion": 0.0,
        }
        assert e["pendientes"] == {"empresas_por_validar": 1, "reportes_abiertos": 1}
        assert list(e["graficas"]) == [
            "postulaciones_por_estado",
            "vacantes_por_modalidad",
            "vacantes_por_categoria",
            "evolucion_mensual",
            "brecha_ajustes",
            "brecha_habilidades",
        ]

    def test_graficas(self, cliente: TestClient, admin: dict) -> None:
        g = cliente.get(RESUMEN, headers=admin).json()["graficas"]

        # En el orden de los estados, sin los que no tienen postulaciones.
        assert g["postulaciones_por_estado"] == [
            {"etiqueta": "postulada", "total": 1},
            {"etiqueta": "entrevista", "total": 1},
        ]
        # De mayor a menor y, a empate, por nombre.
        assert g["vacantes_por_modalidad"] == [
            {"etiqueta": "Híbrido", "total": 2},
            {"etiqueta": "Presencial", "total": 2},
            {"etiqueta": "Remoto", "total": 2},
        ]
        assert g["vacantes_por_categoria"][0] == {
            "etiqueta": "Tecnologías de la información",
            "total": 3,
        }
        assert sum(c["total"] for c in g["vacantes_por_categoria"]) == 6
        assert g["brecha_ajustes"][:3] == [
            {"etiqueta": "Acceso con rampa", "solicitados": 1, "ofrecidos": 2},
            {"etiqueta": "Baño accesible", "solicitados": 1, "ofrecidos": 2},
            {"etiqueta": "Horario flexible", "solicitados": 0, "ofrecidos": 3},
        ]
        assert len(g["brecha_ajustes"]) == 8
        assert g["brecha_habilidades"][0] == {
            "etiqueta": "Excel",
            "demandadas": 4,
            "registradas": 2,
        }
        assert len(g["brecha_habilidades"]) == 8

    def test_un_renglon_por_mes_del_periodo(self, cliente: TestClient, admin: dict) -> None:
        meses = cliente.get(
            RESUMEN, params={"desde": "2025-11-15", "hasta": "2026-02-01"}, headers=admin
        ).json()["graficas"]["evolucion_mensual"]

        assert [m["mes"] for m in meses] == ["2025-11", "2025-12", "2026-01", "2026-02"]
        assert all(m["postulaciones"] == m["contrataciones"] == 0 for m in meses)

    def test_fuera_del_periodo_no_cuenta(self, cliente: TestClient, admin: dict) -> None:
        e = cliente.get(
            RESUMEN, params={"desde": "2020-01-01", "hasta": "2020-12-31"}, headers=admin
        ).json()

        assert (e["indicadores"]["postulaciones"], e["indicadores"]["tasa_colocacion"]) == (0, 0.0)
        assert e["graficas"]["postulaciones_por_estado"] == []
        # El estado actual no depende del periodo.
        assert e["indicadores"]["vacantes_publicadas"] == 6

    def test_contrataciones_y_tasa_de_colocacion(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        _aceptar(db, 1)

        e = cliente.get(RESUMEN, headers=admin).json()

        assert e["indicadores"]["contrataciones"] == 1
        postulantes = db.scalar(text("SELECT count(DISTINCT candidato_id) FROM postulacion"))
        esperada = round(100 / postulantes, 1)
        assert e["indicadores"]["tasa_colocacion"] == esperada
        mes = _hoy().strftime("%Y-%m")
        assert next(m for m in e["graficas"]["evolucion_mensual"] if m["mes"] == mes) == {
            "mes": mes,
            "postulaciones": 2,
            "contrataciones": 1,
        }

    def test_una_aceptacion_fuera_del_periodo_no_es_contratacion(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        _aceptar(db, 1, "now() - interval '90 days'")

        assert cliente.get(RESUMEN, headers=admin).json()["indicadores"]["contrataciones"] == 0

    def test_los_candidatos_suspendidos_no_cuentan(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        db.execute(text("UPDATE usuario SET estado = 'suspendido' WHERE id = 3"))

        e = cliente.get(RESUMEN, headers=admin).json()

        assert e["indicadores"]["candidatos_activos"] == 1

    def test_las_necesidades_solo_con_consentimiento(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        db.execute(text("UPDATE candidato SET consentimiento_sensibles_en = NULL"))

        brecha = cliente.get(RESUMEN, headers=admin).json()["graficas"]["brecha_ajustes"]

        assert all(b["solicitados"] == 0 for b in brecha)

    def test_con_5_o_mas_candidatos_los_ajustes_poco_pedidos_van_a_otros(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        # 6 piden «Horario flexible» (id 12) y 2 «Trabajo remoto» (id 13); ya había 1 con rampa y baño.
        _candidatos_con_necesidad(db, 6, 12)
        _candidatos_con_necesidad(db, 2, 13)

        brecha = cliente.get(RESUMEN, headers=admin).json()["graficas"]["brecha_ajustes"]

        etiquetas = [b["etiqueta"] for b in brecha]
        assert brecha[0] == {"etiqueta": "Horario flexible", "solicitados": 6, "ofrecidos": 3}
        assert "Trabajo remoto" not in etiquetas
        assert "Acceso con rampa" not in etiquetas
        otros = brecha[-1]
        assert otros["etiqueta"] == "Otros"
        # Rampa (1) + baño (1) + trabajo remoto (2).
        assert otros["solicitados"] == 4
        assert all(b["solicitados"] in (0, 6) for b in brecha[:-1])

    @pytest.mark.parametrize(
        ("params", "campos"),
        [
            ({"desde": "2026-13-01"}, {"desde": "Escribe la fecha como AAAA-MM-DD."}),
            ({"hasta": "18/11/2026"}, {"hasta": "Escribe la fecha como AAAA-MM-DD."}),
            ({"desde": "2026-1-1"}, {"desde": "Escribe la fecha como AAAA-MM-DD."}),
            (
                {"desde": "2026-10-10", "hasta": "2026-10-01"},
                {"hasta": "La fecha final no puede ser anterior a la inicial."},
            ),
            ({"desde": "9999-01-01"}, {"desde": "La fecha inicial no puede ser posterior a hoy."}),
            (
                {"desde": "0001-01-01", "hasta": "9999-12-31"},
                {"desde": "Elige un periodo de máximo 10 años."},
            ),
        ],
    )
    def test_valida_el_periodo(
        self, cliente: TestClient, admin: dict, params: dict, campos: dict
    ) -> None:
        respuesta = cliente.get(RESUMEN, params=params, headers=admin)

        assert respuesta.status_code == 422
        assert respuesta.json()["codigo"] == "validacion"
        assert respuesta.json()["campos"] == campos

    def test_fechas_extremas_validas(self, cliente: TestClient, admin: dict) -> None:
        for params in ({"hasta": "0001-01-10"}, {"desde": "9999-12-01", "hasta": "9999-12-31"}):
            assert cliente.get(RESUMEN, params=params, headers=admin).status_code == 200

    def test_solo_el_administrador(self, cliente: TestClient) -> None:
        mariana = iniciar_sesion(cliente, "mariana.lopez@correo.mx")

        assert cliente.get(RESUMEN, headers=mariana).status_code == 403
        assert cliente.get(EXPORTAR, params={"formato": "pdf"}, headers=mariana).status_code == 403
        assert cliente.get(RESUMEN).status_code == 401


class TestExportar:
    def test_pdf(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.get(
            EXPORTAR,
            params={"formato": "pdf", "desde": "2026-01-01", "hasta": "2026-12-31"},
            headers=admin,
        )

        assert respuesta.status_code == 200
        assert respuesta.headers["content-type"] == "application/pdf"
        assert (
            respuesta.headers["content-disposition"]
            == 'attachment; filename="estadisticas_2026-01-01_2026-12-31.pdf"'
        )
        assert respuesta.content.startswith(b"%PDF-")

    def test_xlsx_con_las_cifras_del_resumen(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.get(EXPORTAR, params={"formato": "xlsx"}, headers=admin)

        assert respuesta.status_code == 200
        assert respuesta.headers["content-type"] == (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        assert respuesta.headers["content-disposition"].endswith('.xlsx"')
        libro = load_workbook(io.BytesIO(respuesta.content))
        assert libro.sheetnames == [
            "Indicadores",
            "Postulaciones por estado",
            "Vacantes por modalidad",
            "Vacantes por categoría",
            "Evolución mensual",
            "Brecha de ajustes",
            "Brecha de habilidades",
        ]
        indicadores = [tuple(f) for f in libro["Indicadores"].iter_rows(values_only=True)]
        assert indicadores[0][0] == "Periodo"
        assert ("Vacantes publicadas", 6) in indicadores
        assert ("Reportes abiertos", 1) in indicadores
        estados = [tuple(f) for f in libro["Postulaciones por estado"].iter_rows(values_only=True)]
        assert estados == [("Estado", "Postulaciones"), ("Postulada", 1), ("Entrevista", 1)]

    def test_los_textos_no_se_vuelven_formulas(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        db.execute(text("UPDATE categoria SET nombre = '=HYPERLINK(\"x\")' WHERE id = 1"))

        respuesta = cliente.get(EXPORTAR, params={"formato": "xlsx"}, headers=admin)

        hoja = load_workbook(io.BytesIO(respuesta.content))["Vacantes por categoría"]
        celda = hoja["A2"]
        assert celda.value == '=HYPERLINK("x")'
        assert celda.data_type == "s"

    def test_pdf_con_textos_fuera_de_latin1(
        self, cliente: TestClient, admin: dict, db: Session
    ) -> None:
        db.execute(
            text(
                "UPDATE ajuste SET nombre = 'Horario — 100 % 🏠 ' || repeat('x', 70) WHERE id = 12"
            )
        )

        respuesta = cliente.get(EXPORTAR, params={"formato": "pdf"}, headers=admin)

        assert respuesta.status_code == 200

    def test_formato_obligatorio(self, cliente: TestClient, admin: dict) -> None:
        for params in ({}, {"formato": "csv"}):
            respuesta = cliente.get(EXPORTAR, params=params, headers=admin)
            assert respuesta.status_code == 422
            assert respuesta.json()["campos"] == {"formato": "Elige pdf o xlsx."}

    def test_valida_el_periodo(self, cliente: TestClient, admin: dict) -> None:
        respuesta = cliente.get(EXPORTAR, params={"formato": "pdf", "desde": "ayer"}, headers=admin)

        assert respuesta.json()["campos"] == {"desde": "Escribe la fecha como AAAA-MM-DD."}
