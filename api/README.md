# API REST de IncluTec (FastAPI)

Único componente que se conecta a la base de datos. Implementa el contrato de [`docs/api/contrato.md`](../docs/api/contrato.md) (versión 1.2): las rutas, los campos, los estados y los códigos de error se copian de ahí, y si algo no alcanza se cambia primero el contrato.

**Estado:** pasos 1 a 5 de [la guía de la etapa 3](../docs/api/README.md). Responden los 101 endpoints del contrato (más la descarga de archivos): autenticación y cuenta, catálogos, perfil y CV del candidato, empresas, vacantes con el motor de compatibilidad, postulaciones, horarios y entrevistas, notificaciones, reportes y todo el panel de administración (estadísticas con exportación a PDF y XLSX, usuarios, empresas, vacantes, reportes, categorías, habilidades y catálogos). Rutas, parámetros, cuerpos y respuestas se compararon contra `docs/api/openapi.yaml`.

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
| `app/routers/` | Un archivo por grupo del contrato (`auth`, `catalogos`, `candidatos`, `empresas`, `vacantes`, …, `admin_*` para el panel) y `archivos` para descargar fotos, logotipos y constancias. |
| `app/servicios/` | Reglas que comparten varios endpoints: archivos, correo, recuperación de contraseña, completitud, perfil y CV, límite de intentos de login, reportes, bitácora y la gestión del panel. |
| `app/servicios/estadisticas.py` | Indicadores y gráficas del panel, solo agregados; `exportar_estadisticas.py` arma el PDF (fpdf2) y el XLSX (openpyxl). |
| `app/servicios/compatibilidad.py` | Motor de compatibilidad (H, A, M y F) con fracciones exactas; guarda y recalcula la tabla `compatibilidad`. |
| `app/servicios/notificaciones.py` | Crea el aviso en la app y programa el push (Expo) y el correo según las preferencias; los manda en otro hilo y solo después del commit. |
| `app/servicios/recordatorios.py` | Recordatorio 24 horas antes de cada entrevista; lo corre un ciclo que arranca con el API. |
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
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` hace que el API escuche en la red local y no solo en tu computadora; sin él, el teléfono no lo alcanza. La documentación interactiva queda en <http://localhost:8000/docs> (desde otro equipo de la misma red, `http://<IP de tu computadora>:8000/docs`). Con el API corriendo, la app y el panel dejan de usar el mock:

- Móvil (`mobile/.env`): `EXPO_PUBLIC_USE_MOCK=false` y `EXPO_PUBLIC_API_URL` vacía: la app usa la IP de la computadora desde la que Expo la sirvió, con el puerto 8000, y la sigue aunque el módem te la cambie. Pon una URL solo si el API corre en otra máquina o usas `expo start --tunnel`. Después de cambiar el `.env`, arranca con `npx expo start -c` para que Expo no use los valores viejos.
- Web (`web/.env`): `INCLUTEC_API_MOCK=false` y `INCLUTEC_API_URL=http://localhost:8000/api/v1`.

Si el teléfono no llega al API (la app dice que el servicio no está disponible):

- El teléfono y la computadora deben estar en la misma red Wi-Fi; las redes de invitados suelen aislar a los equipos entre sí.
- En Windows, la primera vez que corre Python aparece el aviso del firewall: permite el acceso. Si la red está marcada como «Pública», el aviso debe incluir redes públicas, o cambia la red a «Privada» en Configuración › Red e Internet › Wi-Fi.
- Abre `http://<IP de tu computadora>:8000/docs` en el navegador del teléfono: si carga, el problema está en la URL de `mobile/.env`.
- Si dejaste `EXPO_PUBLIC_API_URL` vacía, un cambio de IP no afecta a la app. Si pusiste una URL fija, revísala con `ipconfig` cuando cambies de red o el módem te reasigne la IP.

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

- **La transacción termina antes de responder.** `Db` se declara con `scope="function"`: el commit (o el rollback) ocurre antes de mandar la respuesta. Con el valor por omisión de FastAPI la base se confirmaba *después* de enviarla, y un cliente que escribía y leía de inmediato podía ver datos viejos (por ejemplo, entrar con una cuenta recién eliminada). `tests/test_transaccion.py` lo comprueba con la dependencia real.
- **Entradas extremas.** Los ids de filtro y la página están acotados (422), y `tests/test_seguridad.py` recorre todas las rutas con cada rol, ids enormes, cuerpos basura y parámetros de consulta raros para asegurar que nada responda 500; también comprueba que toda ruta protegida pida sesión y que la lista de rutas públicas sea exacta.

- **Avisos después del commit y en otro hilo.** `notificaciones.crear` deja la entrega pendiente en la sesión (`db.info["entregas"]`); `obtener_db` la despacha solo si la transacción se confirmó, así que un error no manda avisos falsos y el correo o el push lentos no retrasan la respuesta. Sin Mailpit o sin red, el fallo solo se registra.
- **Reservar un horario.** `SELECT … FOR UPDATE` sobre el horario más el índice único parcial de la base; hay una prueba con dos transacciones simultáneas y solo una gana. Quien pierde recibe `409 horario_ocupado`.
- **Peticiones repetidas a la vez (doble toque).** Todo lo que cambia el estado de una postulación o de su entrevista (cambiar estado, retirar, agendar, cancelar, registrar resultado, dar de baja) bloquea primero la fila de la postulación con `SELECT … FOR UPDATE`, así que la segunda petición espera y decide con el estado ya actualizado: un doble «Aceptar» deja un solo renglón de historial y un solo aviso, y la segunda recibe `409 transicion_invalida`. Siempre se bloquea la postulación antes que el horario, para no provocar abrazos mortales. Dos «Postularme» simultáneos responden `201` y `409 postulacion_duplicada` (antes el segundo chocaba con la llave única y daba 500), y registrar el mismo dispositivo dos veces usa `INSERT … ON CONFLICT`. `tests/test_concurrencia.py` lo prueba con transacciones reales.
- **Cancelar entrevistas.** Si cancela el candidato (o retira la postulación), el horario vuelve a `libre`; si cancela el reclutador, o la postulación pasa a `no_seleccionada`, queda `cancelado`. Un horario liberado que ya tuvo entrevistas canceladas no se borra con `DELETE /horarios-entrevista/{id}`: pasa a `cancelado` para conservar el historial.
- **Recordatorios.** Cada entrevista se recuerda una vez (`entrevista.recordatorio_en`); si se agendó con menos de 24 horas de anticipación no se recuerda. El ciclo corre cada `RECORDATORIOS_CADA_SEGUNDOS` (300; 0 lo apaga).
- **Hora de la agenda.** Los días de `GET /entrevistas/me` y sus filtros usan la hora de la Ciudad de México (UTC−6); todo lo demás va en UTC con `Z`. Una hora de inicio sin zona horaria se rechaza.
- **Ligas de entrevista.** Solo Google Meet y Microsoft Teams (`teams.microsoft.com`), como dice el contrato; la base acepta además `teams.live.com`.

- **Compatibilidad guardada y al día.** Se calcula y se guarda en la tabla `compatibilidad` cuando el candidato cambia su perfil, CV o necesidades y cuando una vacante se publica o cambia requisitos. Antes de listar, buscar o mostrar una ficha se calculan los pares que falten o hayan quedado más viejos que el perfil o la vacante, así que nunca se muestra un puntaje desactualizado. Solo tienen compatibilidad las vacantes que ya salieron de borrador.
- **Redondeo.** El motor usa fracciones exactas y redondea «mitad hacia arriba», igual que `round()` de PostgreSQL en `P002`; con coma flotante un 47.5 exacto podía bajar a 47.
- **`cubre_mis_necesidades`** es `componente_a = 1`: el candidato sin necesidades (o sin consentimiento) las cubre todas.
- **Aviso por cambio de requisitos.** Al editar una vacante con postulados activos y cambiar habilidades, formación, modalidad o ajustes, se crea una notificación `vacante_actualizada` para cada uno y se responde `postulados_notificados`. El push y el correo llegan en el paso 4.
- **Ids fuera de rango.** Un id mayor que el de la columna (por ejemplo, `99999` contra un `SMALLINT`) se responde como si no existiera (404 o 422), nunca como un 500 de la base de datos.
- **Códigos de recuperación de correos inexistentes.** Para que `solicitar`, `verificar` y `restablecer` respondan igual exista o no la cuenta, un correo desconocido lleva un registro en memoria que nunca acepta ningún código.
- **`rfc_duplicado` en `PUT /empresas/me`** marca el campo `rfc`; en el registro marca `empresa.rfc`, como en el mock.
- **Baja de cuenta.** Las postulaciones en curso pasan a `retirada` con su renglón de historial y, si había entrevista agendada, se cancela y el horario queda libre. Cuando la baja la hace el administrador (`PATCH /admin/usuarios/{id}/estado` con `eliminado`) pasa lo mismo con las postulaciones y se borran sus dispositivos, pero sus datos se conservan («nunca se borra físicamente»). Una cuenta eliminada ya no recibe push ni correo (el aviso queda en la base): por ejemplo, el de un reporte que hizo antes de irse.
- **Desglose de compatibilidad.** Sigue la visibilidad del detalle: una vacante publicada de una empresa validada, o una a la que ya se postuló. Antes bastaba con que no fuera borrador, y una vacante suspendida o cerrada dejaba ver sus requisitos. El mock de la app tenía el mismo hueco y se corrigió igual.
- **Clave de los JWT.** La de `.env.example` es pública (está en el repositorio): si `JWT_SECRET` tiene ese valor, el API no la usa; crea una clave aleatoria la primera vez, la guarda en `api/.jwt_secreto` (fuera de Git) y avisa al arrancar. Así nadie en la misma red puede fabricarse un token, y las sesiones sobreviven a los reinicios.

- **Intentos de login en memoria.** La base no tiene tabla para contar intentos fallidos. El bloqueo de 15 minutos tras 5 fallos con el mismo correo vive en la memoria del proceso (`app/servicios/limite_intentos.py`); un reinicio lo borra. Se mantiene por correo, como dice el contrato.
- **`campos: null` en todos los errores.** El contrato dice que `campos` «solo aparece en errores de validación», pero el esquema `Error` de `openapi.yaml` lo declara nullable y sus ejemplos traen `campos: null`, y la guía pide `null` en lugar de omitir. Se envía siempre.
- **Contraseña incorrecta antes que cuenta suspendida.** Una cuenta suspendida con contraseña mala recibe 401, no 423, para no revelar el estado de cuentas ajenas.
- **Comparación bcrypt aun sin correo.** Cuando el correo no existe se compara contra un hash falso, para que el tiempo de respuesta no delate qué correos están registrados.
- **Modelos sin relaciones.** El generador creaba herencia entre `usuario`, `candidato` y `reclutador` y relaciones ambiguas; se prefirieron modelos planos y consultas con JOIN.

### Panel de administración

- **Bitácora.** Cada acción del administrador sobre usuarios, empresas, vacantes y reportes (crear, editar, validar, rechazar, suspender, reactivar, atender) deja un renglón en `bitacora` con el valor anterior y el nuevo.
- **Estados de usuario.** Se aplican las transiciones del contrato: `eliminado` es final (409 `transicion_invalida`), no se cambia al mismo estado y el administrador no se suspende a sí mismo (409 `estado_invalido`). El mock del panel permitía cualquier cambio; el contrato manda.
- **Cambio de rol** solo si la cuenta aún no tiene postulaciones, vacantes ni observaciones (409 `en_uso`); se borra el perfil del rol anterior y se crea el del nuevo.
- **Suspender una empresa** suspende sus vacantes publicadas y avisa a los postulados activos; al reactivarla, las vacantes siguen suspendidas hasta reactivarlas una por una (como el mock).
- **«En uso»** cuenta todas las filas que apuntan al elemento (vacantes, candidatos, empresas, reportes…), no solo las vacantes, así que `DELETE` responde 409 `en_uso` en lugar de violar una llave foránea. Lo desactivado deja de ofrecerse en los catálogos públicos; lo ya guardado no cambia.
- **Nombres duplicados** en categorías, habilidades y catálogos se comparan sin distinguir mayúsculas (409 `nombre_duplicado`); en niveles educativos tampoco se repite el `orden`.
- **Estadísticas.** Las fechas del periodo son días de la Ciudad de México; por omisión, los últimos 30 días hasta hoy. Un periodo de más de 10 años se rechaza (422), para que la evolución mensual no crezca sin límite. Candidatos, empresas, vacantes, pendientes y brechas son el estado actual.
- **Privacidad en `brecha_ajustes`.** Solo cuentan las necesidades de candidatos activos con consentimiento. Si 5 o más candidatos registraron necesidades, cada ajuste pedido por menos de 5 se suma en «Otros»; con menos (los datos de prueba) se muestran tal cual, como dice el contrato. El administrador nunca ve las necesidades de una persona.
- **Historial de un reporte.** `historial[].usuario` es el administrador que lo movió; el renglón de alta va con `usuario: null`, como en el ejemplo del contrato (quien reportó ya viene en `reporte.reportante`). El panel lo muestra como «Quien reportó».
- **Exportación.** Mismas tablas y orden que el mock del panel. En el XLSX los textos siempre se guardan como texto (un nombre que empiece con `=` no se vuelve fórmula); en el PDF, lo que no cabe en Latin-1 se aproxima y las etiquetas largas se recortan.

## Integración con la app y el panel (paso 6)

Se compararon los servicios simulados de la app (`mobile/src/api/mock`) y del panel (`web/app/Servicios/Api/ApiMock.php`) contra este API, llamada por llamada y con los mismos datos de S002, y se recorrieron las 50 pantallas del panel con `INCLUTEC_API_MOCK=false`. Las diferencias que quedan son de datos: los dos mocks traen registros de ejemplo que S002 no tiene (más candidatos, postulaciones, reportes, logotipos y habilidades). Lo que se corrigió:

- En el API: el renglón de alta del historial de un reporte (ver «Decisiones»).
- En el mock del panel: el mensaje de `contrasena_incorrecta` («La contraseña actual no coincide.», como el contrato) y el orden repetido de un nivel educativo, que la base rechaza por ser `UNIQUE`.
- En las pruebas del panel: las que simulan el API usaban `localhost:8000`; con el API corriendo, las peticiones no simuladas le llegaban de verdad y fallaban. Ahora usan `http://127.0.0.1:9`, donde nunca hay nada.

Falta probar en el teléfono lo que no se puede desde Node: subir foto, logotipo y constancia (el `FormData` de React Native) y las notificaciones push.
