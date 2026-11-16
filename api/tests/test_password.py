from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.modelos import TokenRecuperacion
from tests.conftest import CONTRASENA_PRUEBA, codigo_enviado, iniciar_sesion

SOLICITAR = "/api/v1/auth/password/solicitar"
VERIFICAR = "/api/v1/auth/password/verificar"
RESTABLECER = "/api/v1/auth/password/restablecer"
CAMBIAR = "/api/v1/auth/password"
CORREO = "mariana.lopez@correo.mx"
MENSAJE_SOLICITUD = "Si el correo está registrado, te enviamos un código de 6 dígitos."


def _pedir_codigo(cliente: TestClient, correos: list, correo: str = CORREO) -> str:
    assert cliente.post(SOLICITAR, json={"correo": correo}).status_code == 202
    return codigo_enviado(correos)


def _salta_el_reenvio(db: Session) -> None:
    """Hace como si el último código se hubiera pedido hace más de 60 s."""
    db.execute(text("UPDATE token_recuperacion SET creado_en = creado_en - interval '2 minutes'"))


class TestSolicitar:
    def test_responde_202_y_manda_el_codigo_por_correo(
        self, cliente: TestClient, correos: list
    ) -> None:
        respuesta = cliente.post(SOLICITAR, json={"correo": CORREO})

        assert respuesta.status_code == 202
        assert respuesta.json() == {"detail": MENSAJE_SOLICITUD}
        assert len(correos) == 1
        destinatario, asunto, texto = correos[0]
        assert destinatario == CORREO
        assert "código" in asunto.lower()
        assert len(codigo_enviado(correos)) == 6
        assert "15 minutos" in texto

    def test_guarda_el_codigo_con_hash_y_vigencia_de_15_minutos(
        self, cliente: TestClient, correos: list, db: Session
    ) -> None:
        codigo = _pedir_codigo(cliente, correos)

        token = db.scalar(select(TokenRecuperacion))
        assert codigo not in token.codigo_hash
        assert token.intentos == 0
        assert token.usado_en is None
        vigencia = token.expira_en - token.creado_en
        assert timedelta(minutes=14, seconds=50) < vigencia <= timedelta(minutes=15, seconds=1)

    def test_responde_lo_mismo_si_la_cuenta_no_existe_y_no_manda_correo(
        self, cliente: TestClient, correos: list
    ) -> None:
        respuesta = cliente.post(SOLICITAR, json={"correo": "nadie@correo.mx"})

        assert respuesta.status_code == 202
        assert respuesta.json() == {"detail": MENSAJE_SOLICITUD}
        assert correos == []

    def test_reenvio_antes_de_60_segundos_da_429_con_retry_after(self, cliente: TestClient) -> None:
        cliente.post(SOLICITAR, json={"correo": CORREO})

        respuesta = cliente.post(SOLICITAR, json={"correo": CORREO})

        assert respuesta.status_code == 429
        assert respuesta.json()["codigo"] == "reenvio_prematuro"
        assert 55 <= int(respuesta.headers["Retry-After"]) <= 60

    def test_el_reenvio_tambien_se_limita_si_la_cuenta_no_existe(self, cliente: TestClient) -> None:
        cliente.post(SOLICITAR, json={"correo": "nadie@correo.mx"})

        assert cliente.post(SOLICITAR, json={"correo": "nadie@correo.mx"}).status_code == 429

    def test_pasados_60_segundos_se_puede_pedir_otro_y_el_anterior_deja_de_servir(
        self, cliente: TestClient, correos: list, db: Session
    ) -> None:
        primero = _pedir_codigo(cliente, correos)
        _salta_el_reenvio(db)
        segundo = _pedir_codigo(cliente, correos)

        if primero != segundo:
            antiguo = cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": primero})
            assert antiguo.status_code == 400
        assert (
            cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": segundo}).status_code == 200
        )

    def test_correo_con_formato_invalido_da_422(self, cliente: TestClient) -> None:
        respuesta = cliente.post(SOLICITAR, json={"correo": "no-es-correo"})

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {"correo": "Escribe un correo válido."}

    def test_una_cuenta_eliminada_se_trata_como_inexistente(
        self, cliente: TestClient, correos: list, db: Session
    ) -> None:
        db.execute(text("UPDATE usuario SET estado = 'eliminado' WHERE id = 4"))

        respuesta = cliente.post(SOLICITAR, json={"correo": "jorge.ramirez@correo.mx"})

        assert respuesta.status_code == 202
        assert correos == []


class TestVerificar:
    def test_codigo_correcto_responde_200_sin_consumirlo(
        self, cliente: TestClient, correos: list
    ) -> None:
        codigo = _pedir_codigo(cliente, correos)

        for _ in range(2):
            respuesta = cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": codigo})
            assert respuesta.status_code == 200
            assert respuesta.json() == {"detail": "Código correcto."}

    def test_codigo_incorrecto_dice_cuantos_intentos_quedan(
        self, cliente: TestClient, correos: list
    ) -> None:
        codigo = _pedir_codigo(cliente, correos)
        malo = "000000" if codigo != "000000" else "111111"

        respuesta = cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": malo})

        assert respuesta.status_code == 400
        assert respuesta.json()["codigo"] == "codigo_invalido"
        assert respuesta.json()["detail"] == "Código incorrecto. Te quedan 4 intentos."

    def test_cinco_fallos_agotan_el_codigo_y_ya_no_sirve_ni_el_correcto(
        self, cliente: TestClient, correos: list
    ) -> None:
        codigo = _pedir_codigo(cliente, correos)
        malo = "000000" if codigo != "000000" else "111111"
        mensajes = []
        for _ in range(5):
            r = cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": malo})
            mensajes.append((r.status_code, r.json()["detail"]))

        assert mensajes[3] == (400, "Código incorrecto. Te queda 1 intento.")
        assert mensajes[4] == (410, "Agotaste los intentos. Pide un código nuevo.")
        agotado = cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": codigo})
        assert agotado.status_code == 410
        assert agotado.json()["codigo"] == "codigo_vencido"

    def test_los_intentos_fallidos_se_conservan_entre_peticiones(
        self, cliente: TestClient, correos: list, db: Session
    ) -> None:
        codigo = _pedir_codigo(cliente, correos)
        malo = "000000" if codigo != "000000" else "111111"
        cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": malo})
        cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": malo})

        assert db.scalar(select(TokenRecuperacion.intentos)) == 2

    def test_codigo_vencido_da_410(self, cliente: TestClient, correos: list, db: Session) -> None:
        codigo = _pedir_codigo(cliente, correos)
        db.execute(
            text("UPDATE token_recuperacion SET expira_en = :ahora"),
            {"ahora": datetime.now(UTC) - timedelta(seconds=1)},
        )

        respuesta = cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": codigo})

        assert respuesta.status_code == 410
        assert respuesta.json() == {
            "detail": "El código venció. Pide uno nuevo.",
            "codigo": "codigo_vencido",
            "campos": None,
        }

    def test_sin_haber_pedido_codigo_da_410(self, cliente: TestClient) -> None:
        respuesta = cliente.post(VERIFICAR, json={"correo": CORREO, "codigo": "123456"})

        assert respuesta.status_code == 410

    def test_cuenta_inexistente_responde_igual_que_una_real(self, cliente: TestClient) -> None:
        cliente.post(SOLICITAR, json={"correo": "nadie@correo.mx"})

        respuestas = [
            cliente.post(VERIFICAR, json={"correo": "nadie@correo.mx", "codigo": "123456"})
            for _ in range(5)
        ]

        assert [r.status_code for r in respuestas] == [400, 400, 400, 400, 410]
        assert respuestas[0].json()["detail"] == "Código incorrecto. Te quedan 4 intentos."

    def test_valida_el_formato(self, cliente: TestClient) -> None:
        respuesta = cliente.post(VERIFICAR, json={"correo": "x", "codigo": "12"})

        assert respuesta.status_code == 422
        assert respuesta.json()["campos"] == {
            "correo": "Escribe un correo válido.",
            "codigo": "Escribe los 6 dígitos del código.",
        }


class TestRestablecer:
    def test_cambia_la_contrasena_y_consume_el_codigo(
        self, cliente: TestClient, correos: list
    ) -> None:
        codigo = _pedir_codigo(cliente, correos)

        respuesta = cliente.post(
            RESTABLECER, json={"correo": CORREO, "codigo": codigo, "contrasena": "NuevaClave2026"}
        )

        assert respuesta.status_code == 200
        assert respuesta.json() == {
            "detail": "Tu contraseña se actualizó. Ya puedes iniciar sesión."
        }
        login = "/api/v1/auth/login"
        assert (
            cliente.post(login, json={"correo": CORREO, "contrasena": "NuevaClave2026"}).status_code
            == 200
        )
        assert (
            cliente.post(
                login, json={"correo": CORREO, "contrasena": CONTRASENA_PRUEBA}
            ).status_code
            == 401
        )
        # El código ya está usado.
        reuso = cliente.post(
            RESTABLECER, json={"correo": CORREO, "codigo": codigo, "contrasena": "OtraClave2026"}
        )
        assert reuso.status_code == 410

    def test_codigo_incorrecto_no_cambia_nada(self, cliente: TestClient, correos: list) -> None:
        codigo = _pedir_codigo(cliente, correos)
        malo = "000000" if codigo != "000000" else "111111"

        respuesta = cliente.post(
            RESTABLECER, json={"correo": CORREO, "codigo": malo, "contrasena": "NuevaClave2026"}
        )

        assert respuesta.status_code == 400
        login = {"correo": CORREO, "contrasena": CONTRASENA_PRUEBA}
        assert cliente.post("/api/v1/auth/login", json=login).status_code == 200

    def test_contrasena_debil_da_422(self, cliente: TestClient, correos: list) -> None:
        codigo = _pedir_codigo(cliente, correos)

        respuesta = cliente.post(
            RESTABLECER, json={"correo": CORREO, "codigo": codigo, "contrasena": "corta"}
        )

        assert respuesta.status_code == 422
        assert "contrasena" in respuesta.json()["campos"]

    def test_levanta_el_bloqueo_de_login(self, cliente: TestClient, correos: list) -> None:
        login = "/api/v1/auth/login"
        for _ in range(5):
            cliente.post(login, json={"correo": CORREO, "contrasena": "Equivocada1"})
        assert (
            cliente.post(login, json={"correo": CORREO, "contrasena": "Equivocada1"}).status_code
            == 429
        )
        codigo = _pedir_codigo(cliente, correos)

        cliente.post(
            RESTABLECER, json={"correo": CORREO, "codigo": codigo, "contrasena": "NuevaClave2026"}
        )

        assert (
            cliente.post(login, json={"correo": CORREO, "contrasena": "NuevaClave2026"}).status_code
            == 200
        )


class TestCambiarContrasena:
    def test_cambia_con_la_contrasena_actual(self, cliente: TestClient) -> None:
        encabezado = iniciar_sesion(cliente, CORREO)

        respuesta = cliente.put(
            CAMBIAR,
            headers=encabezado,
            json={"contrasena_actual": CONTRASENA_PRUEBA, "contrasena_nueva": "NuevaClave2026"},
        )

        assert respuesta.status_code == 204
        login = "/api/v1/auth/login"
        assert (
            cliente.post(login, json={"correo": CORREO, "contrasena": "NuevaClave2026"}).status_code
            == 200
        )

    def test_contrasena_actual_incorrecta_da_400(self, cliente: TestClient) -> None:
        encabezado = iniciar_sesion(cliente, CORREO)

        respuesta = cliente.put(
            CAMBIAR,
            headers=encabezado,
            json={"contrasena_actual": "Equivocada1", "contrasena_nueva": "NuevaClave2026"},
        )

        assert respuesta.status_code == 400
        assert respuesta.json()["codigo"] == "contrasena_incorrecta"

    def test_valida_los_campos(self, cliente: TestClient) -> None:
        encabezado = iniciar_sesion(cliente, CORREO)

        respuesta = cliente.put(
            CAMBIAR, headers=encabezado, json={"contrasena_actual": "", "contrasena_nueva": "1"}
        )

        assert respuesta.status_code == 422
        assert set(respuesta.json()["campos"]) == {"contrasena_actual", "contrasena_nueva"}

    def test_sin_sesion_da_401(self, cliente: TestClient) -> None:
        respuesta = cliente.put(
            CAMBIAR,
            json={"contrasena_actual": CONTRASENA_PRUEBA, "contrasena_nueva": "NuevaClave2026"},
        )

        assert respuesta.status_code == 401
