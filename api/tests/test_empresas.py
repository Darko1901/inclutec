from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from tests.conftest import iniciar_sesion

EMPRESAS = "/api/v1/empresas"
ME = f"{EMPRESAS}/me"
LAURA = "rh@tecnoqro.mx"  # TecnoQro, validada
DANIEL = "contacto@estudiotrazo.mx"  # Estudio Trazo, pendiente
MARIANA = "mariana.lopez@correo.mx"

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PDF = b"%PDF-1.4\n" + b"\x00" * 64

DATOS = {
    "nombre_comercial": "TecnoQro",
    "sector_id": 4,
    "tamano_empresa_id": 3,
    "municipio_id": 3,
    "direccion": "Av. Constituyentes 100, Querétaro",
    "descripcion": "Empresa de desarrollo de software y soporte técnico.",
    "sitio_web": "https://tecnoqro.mx",
    "practicas_inclusion": (
        "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica."
    ),
}


def _como(cliente: TestClient, correo: str) -> dict[str, str]:
    return iniciar_sesion(cliente, correo)


class TestDirectorio:
    def test_requiere_sesion(self, cliente: TestClient) -> None:
        assert cliente.get(EMPRESAS).status_code == 401

    def test_lista_solo_las_validadas_ordenadas_por_nombre(self, cliente: TestClient) -> None:
        respuesta = cliente.get(EMPRESAS, headers=_como(cliente, MARIANA))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert set(cuerpo) == {"items", "total", "page", "size"}
        assert (cuerpo["page"], cuerpo["size"]) == (1, 20)
        nombres = [e["nombre_comercial"] for e in cuerpo["items"]]
        assert nombres == sorted(nombres, key=str.casefold)
        # Estudio Trazo está pendiente y no aparece.
        assert "Estudio Trazo" not in nombres
        assert {"TecnoQro", "LogiBajío", "ConCentro"} <= set(nombres)
        assert cuerpo["total"] == len(nombres)

    def test_cada_empresa_trae_los_campos_del_contrato(self, cliente: TestClient) -> None:
        items = cliente.get(
            EMPRESAS, params={"q": "tecnoqro"}, headers=_como(cliente, MARIANA)
        ).json()["items"]

        assert items == [
            {
                "id": 1,
                "nombre_comercial": "TecnoQro",
                "logo_url": None,
                "sector": {"id": 4, "nombre": "Tecnologías de la información"},
                "tamano_empresa": {"id": 3, "nombre": "Mediana", "rango": "51 a 250 trabajadores"},
                "municipio": {
                    "id": 3,
                    "nombre": "Querétaro",
                    "entidad": {"id": 22, "nombre": "Querétaro"},
                },
                "vacantes_publicadas": items[0]["vacantes_publicadas"],
            }
        ]
        assert items[0]["vacantes_publicadas"] >= 1

    def test_las_vacantes_publicadas_no_cuentan_borradores(
        self, cliente: TestClient, db: Session
    ) -> None:
        encabezado = _como(cliente, MARIANA)
        antes = cliente.get(EMPRESAS, params={"q": "tecnoqro"}, headers=encabezado).json()["items"][
            0
        ]
        db.execute(text("UPDATE vacante SET estado = 'borrador' WHERE empresa_id = 1"))

        despues = cliente.get(EMPRESAS, params={"q": "tecnoqro"}, headers=encabezado).json()[
            "items"
        ][0]

        assert antes["vacantes_publicadas"] >= 1
        assert despues["vacantes_publicadas"] == 0

    def test_busca_sin_importar_acentos_ni_mayusculas(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)

        for consulta in ("logibajio", "LOGIBAJÍO", "bajío"):
            items = cliente.get(EMPRESAS, params={"q": consulta}, headers=encabezado).json()[
                "items"
            ]
            assert [e["nombre_comercial"] for e in items] == ["LogiBajío"]

    def test_los_comodines_de_like_se_toman_literal(self, cliente: TestClient) -> None:
        items = cliente.get(EMPRESAS, params={"q": "%"}, headers=_como(cliente, MARIANA)).json()[
            "items"
        ]

        assert items == []

    def test_filtra_por_sector(self, cliente: TestClient) -> None:
        items = cliente.get(
            EMPRESAS, params={"sector_id": 4}, headers=_como(cliente, MARIANA)
        ).json()["items"]

        assert items
        assert {e["sector"]["id"] for e in items} == {4}

    def test_pagina(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, MARIANA)
        primera = cliente.get(EMPRESAS, params={"size": 1}, headers=encabezado).json()
        segunda = cliente.get(EMPRESAS, params={"size": 1, "page": 2}, headers=encabezado).json()

        assert len(primera["items"]) == len(segunda["items"]) == 1
        assert primera["items"][0]["id"] != segunda["items"][0]["id"]
        assert primera["total"] == segunda["total"] >= 3
        assert (segunda["page"], segunda["size"]) == (2, 1)

    def test_valida_page_y_size(self, cliente: TestClient) -> None:
        respuesta = cliente.get(
            EMPRESAS, params={"page": 0, "size": 101}, headers=_como(cliente, MARIANA)
        )

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "page": "La página empieza en 1.",
            "size": "El tamaño de página va de 1 a 100.",
        }

    def test_tambien_la_ven_el_reclutador_y_el_administrador(self, cliente: TestClient) -> None:
        assert cliente.get(EMPRESAS, headers=_como(cliente, LAURA)).status_code == 200
        assert cliente.get(EMPRESAS, headers=_como(cliente, "admin@inclutec.mx")).status_code == 200


class TestMiOrganizacion:
    def test_solo_el_reclutador_entra(self, cliente: TestClient) -> None:
        assert cliente.get(ME).status_code == 401
        assert cliente.get(ME, headers=_como(cliente, MARIANA)).status_code == 403
        assert cliente.get(ME, headers=_como(cliente, "admin@inclutec.mx")).status_code == 403

    def test_tecnoqro_coincide_con_el_ejemplo_del_contrato(self, cliente: TestClient) -> None:
        empresa = cliente.get(ME, headers=_como(cliente, LAURA)).json()

        assert list(empresa) == [
            "id",
            "razon_social",
            "nombre_comercial",
            "rfc",
            "sector",
            "tamano_empresa",
            "municipio",
            "direccion",
            "descripcion",
            "sitio_web",
            "logo_url",
            "practicas_inclusion",
            "documento_url",
            "estado",
            "motivo_estado",
            "validada_en",
            "puesto",
            "datos_fiscales_editables",
        ]
        assert empresa["razon_social"] == "Tecnologías Querétaro S.A. de C.V."
        assert empresa["rfc"] == "TQU150312AB1"
        assert empresa["estado"] == "validada"
        assert empresa["motivo_estado"] is None
        assert empresa["puesto"] == "Coordinadora de Recursos Humanos"
        assert empresa["datos_fiscales_editables"] is False
        assert empresa["validada_en"].endswith("Z")
        assert empresa["municipio"]["entidad"] == {"id": 22, "nombre": "Querétaro"}

    def test_una_empresa_pendiente_permite_editar_los_datos_fiscales(
        self, cliente: TestClient
    ) -> None:
        empresa = cliente.get(ME, headers=_como(cliente, DANIEL)).json()

        assert empresa["estado"] == "pendiente"
        assert empresa["datos_fiscales_editables"] is True
        assert empresa["validada_en"] is None

    def test_actualiza_y_devuelve_la_empresa(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        datos = {
            **DATOS,
            "nombre_comercial": "TecnoQro Soluciones",
            "direccion": "  ",
            "descripcion": None,
            "sitio_web": "https://nuevo.tecnoqro.mx",
        }

        respuesta = cliente.put(ME, headers=encabezado, json=datos)

        assert respuesta.status_code == 200
        empresa = respuesta.json()
        assert empresa["nombre_comercial"] == "TecnoQro Soluciones"
        assert empresa["direccion"] is None
        assert empresa["descripcion"] is None
        assert empresa["sitio_web"] == "https://nuevo.tecnoqro.mx"
        assert cliente.get(ME, headers=encabezado).json() == empresa
        # La sesión también refleja el nombre nuevo.
        assert cliente.get("/api/v1/auth/me", headers=encabezado).json()["empresa"] == {
            "id": 1,
            "nombre_comercial": "TecnoQro Soluciones",
            "estado": "validada",
        }

    def test_cambia_el_puesto_del_reclutador(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)

        empresa = cliente.put(
            ME, headers=encabezado, json={**DATOS, "puesto": " Gerente de Talento "}
        ).json()

        assert empresa["puesto"] == "Gerente de Talento"
        assert cliente.get(ME, headers=encabezado).json()["puesto"] == "Gerente de Talento"

    def test_sin_puesto_en_el_cuerpo_lo_conserva(self, cliente: TestClient) -> None:
        empresa = cliente.put(ME, headers=_como(cliente, LAURA), json=DATOS).json()

        assert empresa["puesto"] == "Coordinadora de Recursos Humanos"

    def test_puesto_vacio_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.put(ME, headers=_como(cliente, LAURA), json={**DATOS, "puesto": " "})

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {"puesto": "Escribe tu puesto."}

    def test_una_empresa_validada_no_cambia_razon_social_ni_rfc(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)

        for extra in ({"razon_social": "Otra S.A."}, {"rfc": "OTR150312AB1"}):
            respuesta = cliente.put(ME, headers=encabezado, json={**DATOS, **extra})

            assert respuesta.status_code == 403
            assert respuesta.json()["codigo"] == "datos_fiscales_bloqueados"

    def test_mandar_los_mismos_datos_fiscales_no_es_un_cambio(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            ME,
            headers=_como(cliente, LAURA),
            json={
                **DATOS,
                "razon_social": "Tecnologías Querétaro S.A. de C.V.",
                "rfc": "TQU150312AB1",
            },
        )

        assert respuesta.status_code == 200

    def test_una_empresa_pendiente_si_cambia_razon_social_y_rfc(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            ME,
            headers=_como(cliente, DANIEL),
            json={
                **DATOS,
                "nombre_comercial": "Estudio Trazo",
                "razon_social": "Estudio Trazo Creativo S.A.S.",
                "rfc": "ETC210111XY9",
            },
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["razon_social"] == "Estudio Trazo Creativo S.A.S."
        assert respuesta.json()["rfc"] == "ETC210111XY9"

    def test_rfc_de_otra_empresa_da_409(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            ME, headers=_como(cliente, DANIEL), json={**DATOS, "rfc": "TQU150312AB1"}
        )

        assert respuesta.status_code == 409
        assert respuesta.json()["codigo"] == "rfc_duplicado"
        assert respuesta.json()["campos"] == {"rfc": "Otra empresa ya registró ese RFC."}

    def test_valida_cada_campo(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            ME,
            headers=_como(cliente, DANIEL),
            json={
                "nombre_comercial": " ",
                "sector_id": 999,
                "tamano_empresa_id": 999,
                "municipio_id": 999,
                "direccion": "x" * 256,
                "descripcion": "x" * 1001,
                "sitio_web": "tuempresa",
                "practicas_inclusion": "x" * 1001,
                "razon_social": "",
                "rfc": "abc",
            },
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {
            "nombre_comercial",
            "sector_id",
            "tamano_empresa_id",
            "municipio_id",
            "direccion",
            "descripcion",
            "sitio_web",
            "practicas_inclusion",
            "razon_social",
            "rfc",
        }
        assert respuesta.json()["campos"]["sitio_web"] == (
            "Escribe la dirección completa, por ejemplo https://tuempresa.mx."
        )

    def test_un_error_no_cambia_nada(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)

        cliente.put(
            ME, headers=encabezado, json={**DATOS, "nombre_comercial": "Nuevo", "sector_id": 999}
        )

        assert cliente.get(ME, headers=encabezado).json()["nombre_comercial"] == "TecnoQro"


class TestLogo:
    def test_sube_el_logo_y_lo_sirve(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)

        respuesta = cliente.post(
            f"{ME}/logo", headers=encabezado, files={"archivo": ("l.png", PNG)}
        )

        assert respuesta.status_code == 200
        assert respuesta.json() == {"url": "/archivos/logos/empresa-1.png"}
        assert cliente.get("/archivos/logos/empresa-1.png").content == PNG
        assert (
            cliente.get(ME, headers=encabezado).json()["logo_url"]
            == "/archivos/logos/empresa-1.png"
        )
        # También aparece en el directorio.
        directorio = cliente.get(EMPRESAS, params={"q": "tecnoqro"}, headers=encabezado).json()
        assert directorio["items"][0]["logo_url"] == "/archivos/logos/empresa-1.png"

    def test_el_logo_nuevo_reemplaza_al_anterior(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        cliente.post(f"{ME}/logo", headers=encabezado, files={"archivo": ("l.png", PNG)})

        cliente.post(f"{ME}/logo", headers=encabezado, files={"archivo": ("l.jpg", JPG)})

        assert cliente.get("/archivos/logos/empresa-1.png").status_code == 404
        assert cliente.get("/archivos/logos/empresa-1.jpg").status_code == 200

    def test_rechaza_lo_que_no_es_jpg_o_png_o_pesa_mas_de_2_mb(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)

        pdf = cliente.post(f"{ME}/logo", headers=encabezado, files={"archivo": ("l.png", PDF)})
        grande = cliente.post(
            f"{ME}/logo",
            headers=encabezado,
            files={"archivo": ("l.png", PNG + b"\0" * (2 * 1024 * 1024))},
        )

        assert pdf.status_code == grande.status_code == 422
        assert pdf.json()["codigo"] == grande.json()["codigo"] == "archivo_invalido"
        assert pdf.json()["detail"] == "El logotipo debe ser JPG o PNG."
        assert grande.json()["detail"] == "El logotipo pesa más de 2 MB. Elige uno más ligero."

    def test_quitar_el_logo_lo_deja_en_null_y_borra_el_archivo(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, LAURA)
        cliente.post(f"{ME}/logo", headers=encabezado, files={"archivo": ("l.png", PNG)})

        respuesta = cliente.delete(f"{ME}/logo", headers=encabezado)

        assert respuesta.status_code == 204
        assert cliente.get(ME, headers=encabezado).json()["logo_url"] is None
        assert cliente.get("/archivos/logos/empresa-1.png").status_code == 404

    def test_quitar_el_logo_sin_tener_uno_tambien_da_204(self, cliente: TestClient) -> None:
        assert cliente.delete(f"{ME}/logo", headers=_como(cliente, LAURA)).status_code == 204

    def test_solo_el_reclutador_puede(self, cliente: TestClient) -> None:
        assert cliente.delete(f"{ME}/logo").status_code == 401
        assert cliente.delete(f"{ME}/logo", headers=_como(cliente, MARIANA)).status_code == 403
        sube = cliente.post(
            f"{ME}/logo", headers=_como(cliente, MARIANA), files={"archivo": ("l.png", PNG)}
        )
        assert sube.status_code == 403


class TestConstancia:
    def test_una_empresa_pendiente_sube_su_constancia(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, DANIEL)

        respuesta = cliente.post(
            f"{ME}/documento", headers=encabezado, files={"archivo": ("c.pdf", PDF)}
        )

        assert respuesta.status_code == 200
        assert respuesta.json() == {"url": "/archivos/documentos/empresa-4.pdf"}
        empresa = cliente.get(ME, headers=encabezado).json()
        assert empresa["documento_url"] == "/archivos/documentos/empresa-4.pdf"
        assert empresa["estado"] == "pendiente"

    def test_una_empresa_rechazada_vuelve_a_pendiente(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(
            text("UPDATE empresa SET estado = 'rechazada', motivo_estado = 'Ilegible' WHERE id = 4")
        )
        encabezado = _como(cliente, DANIEL)

        cliente.post(f"{ME}/documento", headers=encabezado, files={"archivo": ("c.pdf", PDF)})

        empresa = cliente.get(ME, headers=encabezado).json()
        assert empresa["estado"] == "pendiente"
        assert empresa["motivo_estado"] is None

    def test_validada_o_suspendida_responde_409(self, cliente: TestClient, db: Session) -> None:
        encabezado = _como(cliente, LAURA)
        validada = cliente.post(
            f"{ME}/documento", headers=encabezado, files={"archivo": ("c.pdf", PDF)}
        )
        db.execute(text("UPDATE empresa SET estado = 'suspendida' WHERE id = 1"))
        suspendida = cliente.post(
            f"{ME}/documento", headers=encabezado, files={"archivo": ("c.pdf", PDF)}
        )

        assert validada.status_code == suspendida.status_code == 409
        assert validada.json()["codigo"] == suspendida.json()["codigo"] == "estado_invalido"
        assert "validada" in validada.json()["detail"]
        assert "suspendida" in suspendida.json()["detail"]

    def test_rechaza_lo_que_no_es_pdf_o_pesa_mas_de_5_mb(self, cliente: TestClient) -> None:
        encabezado = _como(cliente, DANIEL)

        imagen = cliente.post(
            f"{ME}/documento", headers=encabezado, files={"archivo": ("c.pdf", PNG)}
        )
        grande = cliente.post(
            f"{ME}/documento",
            headers=encabezado,
            files={"archivo": ("c.pdf", PDF + b"\0" * (5 * 1024 * 1024))},
        )

        assert imagen.status_code == grande.status_code == 422
        assert imagen.json()["detail"] == "La constancia debe ser un archivo PDF."
        assert grande.json()["detail"] == "La constancia pesa más de 5 MB. Elige un PDF más ligero."

    def test_la_constancia_no_es_publica(self, cliente: TestClient) -> None:
        cliente.post(
            f"{ME}/documento", headers=_como(cliente, DANIEL), files={"archivo": ("c.pdf", PDF)}
        )

        assert cliente.get("/archivos/documentos/empresa-4.pdf").status_code == 401
        assert cliente.get("/archivos/otras/empresa-4.pdf").status_code == 404

    def test_la_descargan_el_reclutador_dueno_y_el_administrador(self, cliente: TestClient) -> None:
        cliente.post(
            f"{ME}/documento", headers=_como(cliente, DANIEL), files={"archivo": ("c.pdf", PDF)}
        )

        dueno = cliente.get("/archivos/documentos/empresa-4.pdf", headers=_como(cliente, DANIEL))
        admin = cliente.get(
            "/archivos/documentos/empresa-4.pdf", headers=_como(cliente, "admin@inclutec.mx")
        )

        assert dueno.status_code == admin.status_code == 200
        assert dueno.content == PDF
        assert dueno.headers["content-type"] == "application/pdf"

    def test_otro_reclutador_y_los_candidatos_no_la_descargan(self, cliente: TestClient) -> None:
        cliente.post(
            f"{ME}/documento", headers=_como(cliente, DANIEL), files={"archivo": ("c.pdf", PDF)}
        )

        ajena = cliente.get("/archivos/documentos/empresa-4.pdf", headers=_como(cliente, LAURA))
        candidata = cliente.get(
            "/archivos/documentos/empresa-4.pdf", headers=_como(cliente, MARIANA)
        )

        # Una constancia ajena no se distingue de una que no existe.
        assert ajena.status_code == 404
        assert candidata.status_code == 403


class TestCatalogosDesactivados:
    """Lo desactivado deja de ofrecerse en registros nuevos, pero lo ya guardado no cambia."""

    def test_volver_a_guardar_la_organizacion_con_su_sector_desactivado(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE sector SET activo = false WHERE id = 4"))
        db.execute(text("UPDATE tamano_empresa SET activo = false WHERE id = 3"))

        respuesta = cliente.put(f"{EMPRESAS}/me", headers=_como(cliente, LAURA), json=DATOS)

        assert respuesta.status_code == 200, respuesta.json()

    def test_no_se_cambia_a_un_sector_desactivado(self, cliente: TestClient, db: Session) -> None:
        db.execute(text("UPDATE sector SET activo = false WHERE id = 5"))

        respuesta = cliente.put(
            f"{EMPRESAS}/me", headers=_como(cliente, LAURA), json=DATOS | {"sector_id": 5}
        )

        assert respuesta.status_code == 422
        assert "sector_id" in respuesta.json()["campos"]

    def test_el_administrador_edita_una_empresa_con_su_sector_desactivado(
        self, cliente: TestClient, db: Session
    ) -> None:
        db.execute(text("UPDATE sector SET activo = false WHERE id = 4"))
        admin = _como(cliente, "admin@inclutec.mx")
        empresa = cliente.get("/api/v1/admin/empresas/1", headers=admin).json()["empresa"]
        datos = {
            campo: empresa[campo]
            for campo in (
                "razon_social",
                "nombre_comercial",
                "rfc",
                "direccion",
                "sitio_web",
                "descripcion",
                "practicas_inclusion",
            )
        } | {"sector_id": 4, "tamano_empresa_id": 3, "municipio_id": 3}

        respuesta = cliente.put("/api/v1/admin/empresas/1", headers=admin, json=datos)

        assert respuesta.status_code == 200, respuesta.json()
