# API REST de IncluTec (FastAPI)

Único componente que se conecta a la base de datos. Implementa el contrato de [`docs/api/contrato.md`](../docs/api/contrato.md) (versión 1.2): las rutas, los campos, los estados y los códigos de error se copian de ahí, y si algo no alcanza se cambia primero el contrato.

**Estado:** pasos 1 y 2 de [la guía de la etapa 3](../docs/api/README.md). Ya responden 39 endpoints: autenticación y cuenta (los 9), catálogos, el perfil y el CV del candidato (18) y las empresas (directorio, mi organización, logotipo y constancia). Faltan la ficha `GET /empresas/{id}` y `GET /empresas/me/vacantes`, que necesitan el resumen de vacante y el motor de compatibilidad del paso 3, y el resto de los grupos (pasos 3 a 5).

## Qué trae la base

| Archivo | Qué hace |
|---|---|
| `app/main.py` | Crea la app, monta las rutas bajo `/api/v1` y la documentación en `/docs`. |
| `app/config.py` | Configuración por variables de entorno y `.env`. |
| `app/db.py` | Motor y sesión de SQLAlchemy: una sesión por petición, `commit` al terminar bien y `rollback` si falla. |
| `app/modelos/tablas.py` | Las 39 tablas mapeadas. **Se generan, no se editan** (ver «Regenerar los modelos»). |
| `app/errores.py` | Manejador global: todos los errores salen como `{detail, codigo, campos}`, incluidos los 422 de FastAPI, 404, 405 y los fallos no previstos (500 `error_interno`). `campos` va `null` salvo en validación. |
| `app/seguridad.py` | bcrypt (cost 12 por omisión, mínimo 10) y JWT HS256 de 8 horas con `{"sub", "rol", "exp"}`. |
| `app/dependencias.py` | `usuario_actual` (401 `no_autenticado`, 423 `cuenta_suspendida`) y `exigir_roles(...)` (403 `sin_permiso`). |
| `app/esquemas/` | Cuerpos y respuestas. Las fechas-hora salen en UTC con `Z`; `Pagina[T]` es `{items, total, page, size}`. |
| `app/routers/` | Un archivo por grupo del contrato (`auth`, `catalogos`, `candidatos`, `empresas`) y `archivos` para descargar fotos, logotipos y constancias. |
| `app/servicios/` | Reglas que comparten varios endpoints: archivos, correo, recuperación de contraseña, completitud, perfil y CV, y límite de intentos de login. |
| `app/validaciones*.py` | Validación a mano de los cuerpos, con los mismos mensajes que el mock de la app móvil. |

## Instalación

Requisitos: Python 3.12 o superior y PostgreSQL 16 con la base ya creada (ver [`db/README.md`](../db/README.md)).

```bash
cd api
python -m venv .venv
.venv/Scripts/activate          # en Linux o macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # y ajusta DATABASE_URL y JWT_SECRET
```

En Windows, si no tienes Python 3.12, `pip install uv` y luego `uv venv --python 3.12 .venv` lo descargan sin instalar nada en el sistema.

### Base de datos

Con Docker, desde la raíz del repositorio: `docker compose up -d db`. Si el puerto 5432 ya lo usa otro servidor, publica otro puerto y cambia `DATABASE_URL`. En Windows, si el contenedor se detiene al arrancar, es porque Git convirtió `db/scripts/docker-init.sh` a saltos de línea de Windows; el `.gitattributes` de la raíz lo evita. Sin Docker: `db/scripts/crear_bd.sh`.

## Archivos y correo

- **Archivos:** fotos, logotipos y constancias se guardan en `ARCHIVOS_DIR` (`api/uploads` por omisión, fuera de Git). El tipo se valida por el contenido del archivo y el tamaño en el servidor: JPG o PNG de hasta 2 MB, PDF de hasta 5 MB. Fotos y logotipos se sirven en `/archivos/fotos/...` y `/archivos/logos/...`; la constancia en `/archivos/documentos/empresa-N.pdf` solo la descarga el reclutador de esa empresa y el administrador (con el token en `Authorization`).
- **Correo:** el código de recuperación sale por SMTP en segundo plano. En desarrollo, con [Mailpit](https://mailpit.axllent.org) (`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`) se ve en <http://localhost:8025>. Si no hay servidor de correo, el API sigue funcionando y solo registra el aviso.

## Correr el API

```bash
uvicorn app.main:app --reload --port 8000
```

La documentación interactiva queda en <http://localhost:8000/docs>. Con ella corriendo, la app y el panel dejan de usar el mock:

- Móvil: `EXPO_PUBLIC_USE_MOCK=false` y `EXPO_PUBLIC_API_URL=http://<IP de tu computadora>:8000/api/v1`.
- Web: `INCLUTEC_API_MOCK=false` y `INCLUTEC_API_URL=http://localhost:8000/api/v1`.

## Pruebas y estilo

```bash
pytest          # crea la BD de pruebas desde db/, y deshace cada prueba al terminar
ruff check .
ruff format --check .
```

`pytest` usa `TEST_DATABASE_URL`. Necesita un servidor PostgreSQL 16 donde ese usuario pueda crear bases de datos; **borra y recrea** la base que ese URL nombre (`inclutec_pruebas` por omisión), nunca la de desarrollo.

## Regenerar los modelos

Cuando cambie el esquema (una migración nueva en `db/migraciones/`), se vuelve a generar `app/modelos/tablas.py` desde una base ya creada, sin relaciones; las consultas hacen los JOIN explícitos:

```bash
PYTHONUTF8=1 sqlacodegen --generator declarative --options nojoined,nocomments \
  "postgresql+psycopg://inclutec:inclutec_dev@localhost:5432/inclutec" --outfile /ruta/tablas_raw.py
```

Después se quitan las líneas `relationship(...)` y su import, y se conserva el encabezado del archivo. Nada del API crea ni modifica tablas: no hay `create_all` ni Alembic.

## Decisiones

- **Compatibilidad pendiente.** Los cambios del perfil, el CV y las necesidades llaman a `recalcular_compatibilidad` (`app/servicios/candidato.py`), que por ahora no hace nada: el motor llega en el paso 3.
- **Ids fuera de rango.** Un id mayor que el de la columna (por ejemplo, `99999` contra un `SMALLINT`) se responde como si no existiera (404 o 422), nunca como un 500 de la base de datos.
- **Códigos de recuperación de correos inexistentes.** Para que `solicitar`, `verificar` y `restablecer` respondan igual exista o no la cuenta, un correo desconocido lleva un registro en memoria que nunca acepta ningún código.
- **`rfc_duplicado` en `PUT /empresas/me`** marca el campo `rfc`; en el registro marca `empresa.rfc`, como en el mock.
- **Baja de cuenta.** Las postulaciones en curso pasan a `retirada` con su renglón de historial y, si había entrevista agendada, se cancela y el horario queda libre. Los avisos a la empresa se agregan en el paso 4.

- **Intentos de login en memoria.** La base no tiene tabla para contar intentos fallidos. El bloqueo de 15 minutos tras 5 fallos con el mismo correo vive en la memoria del proceso (`app/servicios/limite_intentos.py`); un reinicio lo borra. Se mantiene por correo, como dice el contrato.
- **`campos: null` en todos los errores.** El contrato dice que `campos` «solo aparece en errores de validación», pero el esquema `Error` de `openapi.yaml` lo declara nullable y sus ejemplos traen `campos: null`, y la guía pide `null` en lugar de omitir. Se envía siempre.
- **Contraseña incorrecta antes que cuenta suspendida.** Una cuenta suspendida con contraseña mala recibe 401, no 423, para no revelar el estado de cuentas ajenas.
- **Comparación bcrypt aun sin correo.** Cuando el correo no existe se compara contra un hash falso, para que el tiempo de respuesta no delate qué correos están registrados.
- **Modelos sin relaciones.** El generador creaba herencia entre `usuario`, `candidato` y `reclutador` y relaciones ambiguas; se prefirieron modelos planos y consultas con JOIN.
