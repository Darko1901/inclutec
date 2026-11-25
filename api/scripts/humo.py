"""Prueba de humo del API real: recorre los flujos principales con las cuentas de S002.

Hace peticiones HTTP de verdad (con httpx) contra un API levantado y falla (código de salida 1) si
alguna respuesta no es la esperada. Las cuentas y los números son los de db/semillas/S002.

Escribe en la base de datos (postulaciones, un horario, una empresa validada, un reporte
resuelto), así que se corre sobre una base recién creada y una sola vez:

    docker compose down -v && docker compose up -d db      # desde la raíz del repositorio
    uvicorn app.main:app --port 8000                       # desde api/
    python scripts/humo.py                                 # desde api/, en otra terminal

Variables: INCLUTEC_API_URL (por omisión http://localhost:8000/api/v1).
"""

import os
import sys
from datetime import UTC, datetime, timedelta

import httpx

URL = os.environ.get("INCLUTEC_API_URL", "http://localhost:8000/api/v1").rstrip("/")
CONTRASENA = "Inclutec2026"

fallas: list[str] = []
comprobaciones = 0


def verificar(descripcion: str, condicion: bool, detalle: object = "") -> bool:
    """Registra una comprobación; las que fallan no detienen el recorrido."""
    global comprobaciones
    comprobaciones += 1
    if condicion:
        print(f"  ✓ {descripcion}")
    else:
        print(f"  ✗ {descripcion}  →  {detalle}")
        fallas.append(descripcion)
    return condicion


def paso(titulo: str) -> None:
    print(f"\n{titulo}")


class Cliente:
    """Un usuario con su token."""

    def __init__(self, http: httpx.Client, correo: str) -> None:
        self.http = http
        self.correo = correo
        self.token: str | None = None
        self.id: int | None = None

    def iniciar_sesion(self) -> httpx.Response:
        r = self.http.post("/auth/login", json={"correo": self.correo, "contrasena": CONTRASENA})
        if r.status_code == 200:
            self.token = r.json()["access_token"]
            self.id = r.json()["usuario"]["id"]
        return r

    def pedir(self, metodo: str, ruta: str, **kwargs) -> httpx.Response:
        encabezados = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        return self.http.request(metodo, ruta, headers=encabezados, **kwargs)


def codigo(r: httpx.Response) -> str | None:
    try:
        return r.json().get("codigo")
    except ValueError:
        return None


def main() -> int:
    http = httpx.Client(base_url=URL, timeout=30)
    try:
        http.get("/catalogos/modalidades")
    except httpx.HTTPError as error:
        print(f"No se pudo conectar con el API en {URL}: {error}")
        return 2

    mariana = Cliente(http, "mariana.lopez@correo.mx")
    jorge = Cliente(http, "jorge.ramirez@correo.mx")
    laura = Cliente(http, "rh@tecnoqro.mx")
    roberto = Cliente(http, "rh@logibajio.mx")
    admin = Cliente(http, "admin@inclutec.mx")

    # ---- 1. Inicio de sesión
    paso("1. Inicio de sesión (los tres roles y una cuenta inexistente)")
    for cliente, rol in ((mariana, "candidato"), (laura, "reclutador"), (admin, "administrador")):
        r = cliente.iniciar_sesion()
        verificar(
            f"{cliente.correo} entra como {rol}",
            r.status_code == 200
            and r.json()["usuario"]["rol"] == rol
            and r.json()["token_type"] == "bearer",
            (r.status_code, r.text[:120]),
        )
    jorge.iniciar_sesion()
    roberto.iniciar_sesion()
    r = http.post("/auth/login", json={"correo": "nadie@correo.mx", "contrasena": CONTRASENA})
    verificar(
        "una cuenta inexistente responde 401 credenciales_invalidas",
        r.status_code == 401 and codigo(r) == "credenciales_invalidas",
        (r.status_code, r.text[:120]),
    )
    r = http.post("/auth/login", json={"correo": mariana.correo, "contrasena": "incorrecta1"})
    verificar(
        "una contraseña incorrecta responde 401 credenciales_invalidas",
        r.status_code == 401 and codigo(r) == "credenciales_invalidas",
        (r.status_code, r.text[:120]),
    )
    r = http.get("/auth/me")
    verificar(
        "sin token, /auth/me responde 401 no_autenticado",
        r.status_code == 401 and codigo(r) == "no_autenticado",
        (r.status_code, r.text[:120]),
    )
    if not (mariana.token and laura.token and admin.token and jorge.token and roberto.token):
        print("\nNo se pudo iniciar sesión con las cuentas de S002: ¿la base se cargó con S002?")
        return 1

    # Estado inicial: la base debe estar recién creada.
    previas = mariana.pedir("GET", "/postulaciones/me").json()
    if previas["total"] != 1:
        print(
            "\nLa base ya tiene datos de otra corrida: recréala (docker compose down -v) y repite."
        )
        return 2

    # ---- 2. Vacantes y compatibilidad
    paso("2. Mariana: recomendadas y detalle de la vacante 1 (88 %)")
    r = mariana.pedir("GET", "/vacantes/recomendadas")
    items = r.json().get("items", []) if r.status_code == 200 else []
    verificar(
        "GET /vacantes/recomendadas responde 200 con 6 vacantes publicadas",
        r.status_code == 200 and len(items) == 6,
        (r.status_code, len(items)),
    )
    primera = next((v for v in items if v["id"] == 1), None)
    verificar(
        "la vacante 1 llega con compatibilidad 88",
        bool(primera) and primera["compatibilidad"] == 88,
        primera and primera["compatibilidad"],
    )
    verificar(
        "las recomendadas vienen de mayor a menor compatibilidad",
        [v["compatibilidad"] for v in items]
        == sorted((v["compatibilidad"] for v in items), reverse=True),
    )
    verificar("ninguna recomendada es un borrador (7 y 8)", not {7, 8} & {v["id"] for v in items})
    r = mariana.pedir("GET", "/vacantes/1")
    d = r.json() if r.status_code == 200 else {}
    verificar("GET /vacantes/1 responde 200", r.status_code == 200, (r.status_code, r.text[:120]))
    verificar(
        "el detalle de la vacante 1 trae la postulación 1 de Mariana",
        d.get("postulacion_id") == 1,
        d.get("postulacion_id"),
    )
    verificar(
        "el detalle trae el salario de la vacante 1", bool(d.get("salario")), d.get("salario")
    )
    r = mariana.pedir("GET", "/vacantes/1/compatibilidad")
    d = r.json() if r.status_code == 200 else {}
    verificar(
        "el desglose de la vacante 1 da 88 con H=0.7, A=1, M=1, F=1",
        d.get("puntaje") == 88 and d.get("componentes") == {"h": 0.7, "a": 1.0, "m": 1.0, "f": 1.0},
        d.get("componentes"),
    )
    r = mariana.pedir("GET", "/vacantes/7")
    verificar("un borrador no se ve como candidato (404)", r.status_code == 404, r.status_code)
    r = laura.pedir("GET", "/vacantes/recomendadas")
    verificar(
        "una reclutadora no puede pedir recomendadas (403 sin_permiso)",
        r.status_code == 403 and codigo(r) == "sin_permiso",
        r.status_code,
    )

    # ---- 3. Postulaciones
    paso("3. Postular a otra vacante y repetir (409)")
    r = mariana.pedir(
        "POST",
        "/postulaciones",
        json={
            "vacante_id": 6,
            "mensaje": "Me interesa el puesto remoto.",
            "compartir_ajustes": False,
        },
    )
    pm = r.json() if r.status_code == 201 else {}
    verificar(
        "Mariana se postula a la vacante 6 (201, estado postulada)",
        r.status_code == 201 and pm.get("estado") == "postulada",
        (r.status_code, r.text[:160]),
    )
    verificar("la postulación guarda que no comparte ajustes", pm.get("comparte_ajustes") is False)
    r = mariana.pedir("POST", "/postulaciones", json={"vacante_id": 6, "compartir_ajustes": False})
    verificar(
        "postularse otra vez responde 409 postulacion_duplicada",
        r.status_code == 409 and codigo(r) == "postulacion_duplicada",
        (r.status_code, r.text[:120]),
    )
    r = mariana.pedir("POST", "/postulaciones", json={"vacante_id": 7, "compartir_ajustes": False})
    verificar(
        "postularse a un borrador responde 404 o 409 (no 201)",
        r.status_code in (404, 409),
        (r.status_code, r.text[:120]),
    )
    r = jorge.pedir("POST", "/postulaciones", json={"vacante_id": 6, "compartir_ajustes": False})
    pj = r.json() if r.status_code == 201 else {}
    verificar(
        "Jorge también se postula a la vacante 6",
        r.status_code == 201,
        (r.status_code, r.text[:160]),
    )

    # ---- 4. Reclutadora
    paso("4. Laura (TecnoQro): postulados ordenados, cambio de estado y horario")
    r = laura.pedir("GET", "/vacantes/1/postulaciones")
    items = r.json().get("items", []) if r.status_code == 200 else []
    verificar(
        "los postulados de la vacante 1 son 1 y el de Mariana tiene 83 %",
        len(items) == 1 and items[0]["compatibilidad"] == 83 and items[0]["candidato"]["id"] == 3,
        (r.status_code, items[:1]),
    )
    r = laura.pedir("GET", "/vacantes/6/postulaciones")
    items = r.json().get("items", []) if r.status_code == 200 else []
    puntajes = [p["compatibilidad"] for p in items]
    verificar(
        "los postulados de la vacante 6 son 2 y vienen de mayor a menor compatibilidad",
        len(items) == 2 and puntajes == sorted(puntajes, reverse=True),
        (r.status_code, puntajes),
    )

    # La postulación en revisión y en entrevista (mismo flujo para Mariana y Jorge).
    for nombre, post in (("Mariana", pm), ("Jorge", pj)):
        for estado in ("en_revision", "entrevista"):
            r = laura.pedir(
                "PATCH",
                f"/postulaciones/{post['id']}/estado",
                json={
                    "estado": estado,
                    "mensaje": "Pasamos a la siguiente etapa." if estado == "entrevista" else None,
                },
            )
            verificar(
                f"{nombre}: postulación {post['id']} pasa a {estado}",
                r.status_code == 200 and r.json()["estado"] == estado,
                (r.status_code, r.text[:160]),
            )
    r = laura.pedir("PATCH", f"/postulaciones/{pm['id']}/estado", json={"estado": "en_revision"})
    verificar(
        "regresar de «entrevista» a «en_revision» responde 409 transicion_invalida",
        r.status_code == 409 and codigo(r) == "transicion_invalida",
        (r.status_code, r.text[:120]),
    )

    # La semilla crea sus horarios a «ahora + 3 días»: a 10 días nunca se traslapan con ellos.
    inicio = (datetime.now(UTC) + timedelta(days=10)).replace(
        hour=16, minute=0, second=0, microsecond=0
    )
    horario = {
        "vacante_id": 6,
        "inicio": inicio.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duracion_min": 45,
        "liga": "https://meet.google.com/abc-defg-hij",
    }
    r = laura.pedir("POST", "/horarios-entrevista", json=horario)
    h = r.json() if r.status_code == 201 else {}
    verificar(
        "Laura publica un horario de 45 min (201, libre)",
        r.status_code == 201 and h.get("estado") == "libre" and h.get("duracion_min") == 45,
        (r.status_code, r.text[:160]),
    )
    r = laura.pedir("POST", "/horarios-entrevista", json=horario)
    verificar(
        "el mismo horario otra vez responde 409 horario_traslapado",
        r.status_code == 409 and codigo(r) == "horario_traslapado",
        (r.status_code, r.text[:120]),
    )
    r = laura.pedir("POST", "/horarios-entrevista", json={**horario, "liga": "https://zoom.us/j/1"})
    verificar(
        "una liga que no es de Meet o Teams responde 422", r.status_code == 422, r.status_code
    )
    r = laura.pedir("POST", "/horarios-entrevista", json={**horario, "vacante_id": 2})
    verificar(
        "publicar en una vacante de otra empresa responde 404 o 403",
        r.status_code in (403, 404),
        (r.status_code, r.text[:120]),
    )

    # ---- 5. Reserva
    paso("5. Mariana reserva el horario y Jorge recibe 409")
    r = mariana.pedir("GET", "/horarios-entrevista", params={"vacante_id": 6})
    libres = r.json() if r.status_code == 200 else []
    libres = libres.get("items", libres) if isinstance(libres, dict) else libres
    verificar(
        "Mariana ve el horario libre de la vacante 6",
        any(x.get("id") == h.get("id") for x in libres),
        (r.status_code, r.text[:160]),
    )
    r = http.get("/horarios-entrevista", headers={"Authorization": f"Bearer {mariana.token}"})
    verificar(
        "GET /horarios-entrevista sin vacante_id responde 422 validacion",
        r.status_code == 422 and codigo(r) == "validacion",
        (r.status_code, r.text[:120]),
    )
    r = mariana.pedir(
        "POST", f"/postulaciones/{pm['id']}/entrevista", json={"horario_id": h.get("id")}
    )
    verificar(
        "Mariana agenda la entrevista (201, agendada)",
        r.status_code == 201 and r.json().get("estado") == "agendada",
        (r.status_code, r.text[:160]),
    )
    r = jorge.pedir(
        "POST", f"/postulaciones/{pj['id']}/entrevista", json={"horario_id": h.get("id")}
    )
    verificar(
        "el segundo intento (Jorge, mismo horario) responde 409 horario_ocupado",
        r.status_code == 409 and codigo(r) == "horario_ocupado",
        (r.status_code, r.text[:120]),
    )
    r = mariana.pedir(
        "POST", f"/postulaciones/{pm['id']}/entrevista", json={"horario_id": h.get("id")}
    )
    verificar(
        "Mariana otra vez en la misma postulación responde 409",
        r.status_code == 409,
        (r.status_code, r.text[:120]),
    )
    r = laura.pedir("GET", "/entrevistas/me")
    agenda = r.json() if r.status_code == 200 else {}
    agenda = agenda.get("items", agenda) if isinstance(agenda, dict) else agenda
    verificar(
        "la agenda de Laura incluye la entrevista nueva y la de S002",
        r.status_code == 200 and len(agenda) >= 2,
        (r.status_code, len(agenda)),
    )

    # ---- 6. Propiedad y privacidad
    paso("6. Propiedad de los recursos y privacidad de las necesidades de ajuste")
    r = jorge.pedir("GET", "/postulaciones/1")
    verificar(
        "Jorge no puede ver la postulación 1 de Mariana (403 o 404)",
        r.status_code in (403, 404),
        (r.status_code, r.text[:120]),
    )
    r = roberto.pedir("GET", "/vacantes/1/postulaciones")
    verificar(
        "Roberto (LogiBajío) no ve los postulados de una vacante de TecnoQro (403 o 404)",
        r.status_code in (403, 404),
        (r.status_code, r.text[:120]),
    )
    r = roberto.pedir("GET", "/postulaciones/1/candidato")
    verificar(
        "Roberto no ve al postulado de TecnoQro (403 o 404)",
        r.status_code in (403, 404),
        (r.status_code, r.text[:120]),
    )
    r = roberto.pedir("PATCH", "/postulaciones/1/estado", json={"estado": "aceptada"})
    verificar(
        "Roberto no cambia el estado de una postulación de TecnoQro (403 o 404)",
        r.status_code in (403, 404),
        (r.status_code, r.text[:120]),
    )
    r = roberto.pedir("DELETE", f"/horarios-entrevista/{h.get('id')}")
    verificar(
        "Roberto no elimina un horario de TecnoQro (404 no_encontrado)",
        r.status_code == 404 and codigo(r) == "no_encontrado",
        (r.status_code, r.text[:120]),
    )
    r = roberto.pedir("PATCH", "/entrevistas/1", json={"estado": "realizada"})
    verificar(
        "Roberto no registra el resultado de una entrevista de TecnoQro (404 no_encontrado)",
        r.status_code == 404 and codigo(r) == "no_encontrado",
        (r.status_code, r.text[:120]),
    )
    r = roberto.pedir("PUT", "/vacantes/1", json={})
    verificar(
        "Roberto no edita una vacante de TecnoQro (403 o 404, nunca 200)",
        r.status_code in (403, 404, 422),
        (r.status_code, r.text[:120]),
    )
    r = laura.pedir("GET", "/postulaciones/me")
    verificar(
        "una reclutadora no puede usar /postulaciones/me (403)", r.status_code == 403, r.status_code
    )

    r = laura.pedir("GET", f"/postulaciones/{pm['id']}/candidato")
    verificar(
        "Mariana no compartió ajustes en la vacante 6: `necesidades` es null",
        r.status_code == 200 and r.json().get("necesidades") is None,
        (r.status_code, r.text[:200]),
    )
    verificar(
        "…y tampoco llega la nota de ajustes",
        not (r.json().get("nota_ajustes") if r.status_code == 200 else None),
    )
    r = laura.pedir("GET", "/postulaciones/1/candidato")
    verificar(
        "en la postulación 1 sí compartió: Laura ve sus necesidades",
        r.status_code == 200 and bool(r.json().get("necesidades")),
        (r.status_code, r.text[:200]),
    )
    r = admin.pedir("GET", "/admin/usuarios/3")
    verificar(
        "el administrador ve a Mariana sin necesidades de ajuste",
        r.status_code == 200 and "necesidades" not in r.text and "nota_ajustes" not in r.text,
        (r.status_code, r.text[:200]),
    )

    # ---- 7. Administrador
    paso("7. Administrador: estadísticas, validar a Estudio Trazo y resolver un reporte")
    r = admin.pedir("GET", "/admin/estadisticas/resumen")
    est = r.json() if r.status_code == 200 else {}
    ind = est.get("indicadores", {})
    verificar(
        "las estadísticas responden 200 con 1 empresa por validar y 1 reporte abierto",
        r.status_code == 200
        and est.get("pendientes") == {"empresas_por_validar": 1, "reportes_abiertos": 1},
        (r.status_code, est.get("pendientes")),
    )
    verificar(
        "indicadores: 2 candidatos activos, 3 empresas validadas y 6 vacantes publicadas",
        (
            ind.get("candidatos_activos"),
            ind.get("empresas_validadas"),
            ind.get("vacantes_publicadas"),
        )
        == (2, 3, 6),
        ind,
    )
    r = admin.pedir("GET", "/admin/estadisticas/exportar", params={"formato": "pdf"})
    verificar(
        "exportar a PDF devuelve un PDF",
        r.status_code == 200 and r.content[:4] == b"%PDF",
        (r.status_code, r.content[:20]),
    )
    r = admin.pedir("GET", "/admin/estadisticas/exportar", params={"formato": "xlsx"})
    verificar(
        "exportar a XLSX devuelve un libro de Excel",
        r.status_code == 200 and r.content[:2] == b"PK",
        (r.status_code, r.content[:20]),
    )
    r = admin.pedir("GET", "/admin/estadisticas/exportar")
    verificar(
        "exportar sin formato responde 422 validacion",
        r.status_code == 422 and codigo(r) == "validacion",
        (r.status_code, r.text[:120]),
    )
    r = laura.pedir("GET", "/admin/estadisticas/resumen")
    verificar(
        "una reclutadora no ve estadísticas (403 sin_permiso)",
        r.status_code == 403 and codigo(r) == "sin_permiso",
        r.status_code,
    )

    r = admin.pedir("GET", "/admin/empresas", params={"estado": "pendiente"})
    pendientes = r.json().get("items", []) if r.status_code == 200 else []
    trazo = next((e for e in pendientes if "Trazo" in str(e)), None)
    verificar(
        "Estudio Trazo aparece como empresa pendiente",
        trazo is not None,
        (r.status_code, pendientes[:1]),
    )
    if trazo:
        eid = trazo["id"]
        r = admin.pedir("PATCH", f"/admin/empresas/{eid}/validacion", json={"decision": "validada"})
        verificar(
            "el administrador valida a Estudio Trazo",
            r.status_code == 200 and r.json().get("estado") == "validada",
            (r.status_code, r.text[:160]),
        )
        r = admin.pedir("PATCH", f"/admin/empresas/{eid}/validacion", json={"decision": "validada"})
        verificar(
            "validarla otra vez responde 409 estado_invalido",
            r.status_code == 409 and codigo(r) == "estado_invalido",
            (r.status_code, r.text[:120]),
        )
        r = admin.pedir("GET", "/admin/estadisticas/resumen")
        verificar(
            "las estadísticas ya cuentan 4 empresas validadas y 0 por validar",
            r.json()["indicadores"]["empresas_validadas"] == 4
            and r.json()["pendientes"]["empresas_por_validar"] == 0,
            r.text[:200],
        )

    r = admin.pedir("GET", "/admin/reportes", params={"estado": "abierto"})
    abiertos = r.json().get("items", []) if r.status_code == 200 else []
    verificar(
        "hay 1 reporte abierto (el de la vacante 5)",
        len(abiertos) == 1,
        (r.status_code, abiertos[:1]),
    )
    r = admin.pedir("GET", "/admin/reportes", params={"vacante_id": 5})
    verificar(
        "el filtro vacante_id=5 devuelve ese reporte",
        r.status_code == 200 and r.json().get("total") == 1,
        (r.status_code, r.text[:160]),
    )
    r = admin.pedir("GET", "/admin/reportes", params={"vacante_id": 1})
    verificar(
        "el filtro vacante_id=1 no devuelve nada",
        r.status_code == 200 and r.json().get("total") == 0,
        (r.status_code, r.text[:160]),
    )
    if abiertos:
        rid = abiertos[0]["id"]
        r = admin.pedir(
            "PATCH", f"/admin/reportes/{rid}", json={"estado": "resuelto", "accion": "ninguna"}
        )
        verificar(
            "cerrar sin resolución responde 422",
            r.status_code == 422,
            (r.status_code, r.text[:120]),
        )
        r = admin.pedir("PATCH", f"/admin/reportes/{rid}", json={"estado": "en_revision"})
        verificar(
            "el reporte pasa a en_revision",
            r.status_code == 200 and r.json()["reporte"]["estado"] == "en_revision",
            (r.status_code, r.text[:160]),
        )
        r = admin.pedir(
            "PATCH",
            f"/admin/reportes/{rid}",
            json={
                "estado": "resuelto",
                "resolucion": "Se pidió a la empresa corregir el salario publicado.",
                "accion": "ninguna",
            },
        )
        verificar(
            "el administrador resuelve el reporte",
            r.status_code == 200
            and r.json()["reporte"]["estado"] == "resuelto"
            and r.json()["atendido_por"]["id"] == admin.id,
            (r.status_code, r.text[:160]),
        )
        r = admin.pedir(
            "PATCH", f"/admin/reportes/{rid}", json={"estado": "descartado", "resolucion": "x"}
        )
        verificar(
            "un reporte cerrado ya no cambia (409 transicion_invalida)",
            r.status_code == 409 and codigo(r) == "transicion_invalida",
            (r.status_code, r.text[:120]),
        )

    # ---- Resumen
    print(f"\n{comprobaciones - len(fallas)} de {comprobaciones} comprobaciones correctas.")
    if fallas:
        print("FALLARON:")
        for f in fallas:
            print(f"  - {f}")
        return 1
    print("Prueba de humo correcta.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
