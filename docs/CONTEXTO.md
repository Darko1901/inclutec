# IncluTec — Guía del proyecto para desarrollo

Este documento es la referencia corta para cualquiera que programe en el repositorio. El detalle completo está en `docs/diseno/`.

## 1. Qué es

IncluTec es una plataforma web y móvil que vincula a **personas con discapacidad que buscan empleo** con **empresas que ofrecen vacantes**. La vinculación considera competencias, modalidad de trabajo, condiciones de accesibilidad y ajustes razonables. Es el proyecto de Estadía de ISC en la UPQ (septiembre–diciembre 2026).

## 2. Arquitectura y reglas que no se rompen

| Carpeta | Componente | Tecnología | Usuarios |
|---|---|---|---|
| `mobile/` | App móvil | React Native + Expo (TypeScript) | Candidato y reclutador (una sola app; la navegación cambia por rol) |
| `web/` | Panel de administración | Laravel (Blade) | Administrador |
| `api/` | API REST | FastAPI + SQLAlchemy | La consumen `mobile/` y `web/` |
| `db/` | Base de datos | PostgreSQL 16 (scripts SQL) | Solo la usa `api/` |

1. **Solo el API se conecta a la base de datos.** La app móvil y el panel web consumen el API por HTTPS con JSON y un token JWT en el encabezado `Authorization: Bearer`. Laravel **no** usa Eloquent contra PostgreSQL ni tiene conexión de BD propia para datos del negocio.
2. **El esquema vive solo en `db/`.** Cualquier cambio a la BD es un archivo nuevo `db/migraciones/V00N__descripcion.sql`; nunca se editan migraciones ya existentes. El API mapea las tablas con SQLAlchemy pero **no las crea ni las modifica** (nada de `create_all` ni Alembic).
3. Endpoints bajo `/api/v1`. Errores con códigos HTTP correctos y cuerpo `{"detail": "mensaje claro", "codigo": "...", "campos": {...}}`, según la sección 1 del contrato.
4. JWT HS256 con vigencia de 8 horas; contraseñas con bcrypt (cost ≥ 10).
5. No se planea despliegue: todo corre en local con datos de prueba.

## 3. Roles e interfaces

| Rol | Dónde | Interfaces |
|---|---|---|
| Usuario sin sesión | Móvil | MOV-00 Splash · MOV-01 Inicio de sesión · MOV-02 Registro · MOV-03 Recuperar contraseña |
| Candidato | Móvil | MOV-04 Notificaciones · CAN-01 Vacantes · CAN-02 Detalle de vacante · CAN-03 Mi perfil · CAN-04 Mi CV · CAN-05 Mis postulaciones · CAN-06 Detalle de postulación y entrevista · CAN-07 Empresas |
| Reclutador | Móvil | MOV-04 Notificaciones · REC-01 Organización · REC-02 Mis vacantes · REC-03 Crear/editar vacante · REC-04 Postulados · REC-05 Detalle del postulado · REC-06 Agenda de entrevistas |
| Administrador | Web | WEB-01 Inicio de sesión · WEB-02 Dashboard · WEB-03 Usuarios · WEB-04 Empresas y validación · WEB-05 Vacantes (moderación) · WEB-06 Categorías y habilidades · WEB-07 Catálogos · WEB-08 Reportes e incidencias |

Barra inferior del candidato: Vacantes, Postulaciones, Empresas, Notificaciones, Perfil. Del reclutador: Mis vacantes, Agenda, Notificaciones, Organización. Si un administrador inicia sesión en la app, se le indica que use el panel web y se cierra la sesión.

Qué hace cada pantalla: `docs/diseno/requerimientos.md` (RF por interfaz) y `docs/diseno/pantallas.md` (contenido, campos de BD y estados). Flujos y validaciones: `docs/diseno/casos_de_uso.md`.

## 4. Reglas del dominio

- **Necesidades de ajuste, nunca diagnósticos.** El candidato no registra su tipo de discapacidad; registra necesidades del catálogo `ajuste` (por ejemplo, "Acceso con rampa", "Intérprete de LSM"). Es un dato personal sensible (LFPDPPP): requiere consentimiento expreso (`candidato.consentimiento_sensibles_en`) y el candidato decide si lo comparte con cada empresa (`candidato.compartir_ajustes`: `preguntar`, `siempre`, `nunca`).
- **Accesibilidad de la vacante.** Cada vacante declara ajustes con `vacante_ajuste.tipo`: `existente` ("El lugar cuenta con") o `bajo_solicitud` ("Podemos ofrecer bajo solicitud").
- **Compatibilidad** (0–100, entero):
  - H = (2·obligatorias cumplidas + deseables cumplidas) / (2·obligatorias + deseables)
  - A = necesidades del candidato cubiertas por la vacante / necesidades registradas (1 si no registró ninguna)
  - M = 1 si la modalidad de la vacante está entre las preferidas, 0.5 si la vacante es híbrida y no coincide, 0 en otro caso
  - F = 1 si cumple la formación mínima, 0.5 si la está cursando, 0 en otro caso
  - Para el candidato: `round(100·(0.40H + 0.30A + 0.15M + 0.15F))`
  - Para el reclutador: `round(100·(0.40H + 0.15M + 0.15F)/0.70)` (sin A, para no penalizar a quien tiene más necesidades)
  - Ejemplo de referencia: Mariana con la vacante "Técnico de soporte de TI" da **88 %** y **83 %**. `db/pruebas/P002__compatibilidad.sql` lo calcula en SQL.
- **Estados** (texto en pantalla → valor en BD):
  - Postulación: Postulada `postulada` → En revisión `en_revision` → Entrevista `entrevista` → Aceptada `aceptada` / No seleccionada `no_seleccionada`; el candidato puede retirarla (`retirada`) mientras no sea aceptada ni no seleccionada. Cada cambio se registra en `historial_postulacion`.
  - Empresa: `pendiente` → `validada` / `rechazada`; una validada puede pasar a `suspendida`. Solo una empresa validada publica vacantes (sin validar, solo crea borradores); al suspenderla, sus vacantes publicadas pasan a `suspendida`.
  - Vacante: `borrador`, `publicada`, `pausada`, `cerrada`, `suspendida` (la suspende el administrador).
  - Entrevista: `agendada`, `realizada`, `no_asistio`, `cancelada`. Horario: `libre`, `agendado`, `cancelado`.
  - Reporte: `abierto`, `en_revision`, `resuelto`, `descartado`. Usuario: `activo`, `suspendido`, `eliminado` (baja lógica).
- **Entrevistas.** El reclutador publica horarios (30, 45 o 60 min) con una liga genérica de Google Meet o Microsoft Teams; el candidato en estado `entrevista` reserva uno. Un horario solo puede tener una entrevista vigente.
- **Notificaciones.** Se generan en la app (tabla `notificacion`), por push (Expo) y por correo, según las preferencias del usuario; recordatorio 24 h antes de cada entrevista.

## 5. Fase actual: frontend con datos simulados

Hasta el sprint 4 el API no existe, pero su contrato sí. La app móvil y el panel web se programan contra una **capa de servicios** con dos implementaciones intercambiables:

- **Mock:** responde con los mismos datos de `db/semillas/S002__datos_prueba.sql` (Mariana, TecnoQro, la vacante de soporte, 88 % / 83 %), con una latencia corta simulada y los mismos códigos de error que dará el API.
- **HTTP:** llama al API real.

Se elige con una variable de entorno (`EXPO_PUBLIC_USE_MOCK` en móvil, `INCLUTEC_API_MOCK` en web). Las pantallas **nunca** importan datos de prueba directamente; siempre pasan por la capa de servicios. Las rutas, la forma del JSON y los errores siguen exactamente `docs/api/contrato.md` (y `docs/api/openapi.yaml`, de donde se generan los tipos). Los datos simulados son los ejemplos del contrato, que coinciden con `db/semillas/S002__datos_prueba.sql`.

## 6. Accesibilidad (obligatoria, se evalúa)

- WCAG 2.1 nivel AA. Contraste 4.5:1 en texto normal y 3:1 en texto grande e íconos.
- React Native: todo elemento interactivo lleva `accessibilityLabel`, `accessibilityRole` y, cuando aplique, `accessibilityState` o `accessibilityHint`. Funciona con TalkBack y VoiceOver.
- Laravel: HTML semántico, `<label>` asociado a cada campo, ARIA solo cuando haga falta, navegación completa con teclado y foco visible.
- Áreas táctiles de 48 × 48 dp como mínimo. El texto respeta el tamaño de fuente del sistema (no desactivar `allowFontScaling`).
- Nunca comunicar algo solo con color: los estados llevan texto e ícono.
- Etiqueta visible en cada campo y mensaje de error debajo que explique cómo corregirlo; los errores se anuncian al lector de pantalla.
- Lenguaje claro en español de México ("Postularme", no "Enviar solicitud de aplicación").
- Paleta: primario `#1E40AF`, secundario `#0F766E`, éxito `#15803D`, advertencia `#B45309`, error `#B91C1C`, texto `#111827`, texto secundario `#6B7280`, fondos `#FFFFFF` y `#F3F4F6`.

## 7. Convenciones

- **Nombres del dominio en español y sin acentos**, iguales a la BD: `vacante`, `postulacion`, `horario_entrevista`, `compartir_ajustes`. En TypeScript y PHP se usa camelCase para variables y PascalCase para tipos (`Vacante`, `estadoPostulacion`); los campos del JSON van en snake_case, igual que la BD.
- Textos de interfaz en español de México. Comentarios en español, breves y solo donde aporten.
- Formato y estilo: Prettier + ESLint (móvil), Laravel Pint (web), Ruff (API).
- Secretos y configuración en `.env` (nunca se suben); cada componente incluye un `.env.example`.

## 8. Git

- Rama `main` estable. Cada tarea en su rama: `pNN-descripcion-corta` (por ejemplo, `p01-base-app-movil`). Se integra a `main` por pull request.
- Commits en español con Conventional Commits y el componente como alcance: `feat(mobile): navegación por rol`, `fix(db): índice de vacantes`, `docs: guía de instalación`.
- El autor de cada commit es la persona del equipo que hace el trabajo. Los mensajes de commit, las descripciones de PR, los comentarios del código y la documentación no llevan firmas, coautorías ni líneas de atribución de herramientas.

## 9. Datos de prueba

| Cuenta | Rol | Contraseña |
|---|---|---|
| admin@inclutec.mx | Administrador | Inclutec2026 |
| rh@tecnoqro.mx | Reclutadora (Laura Hernández Ruiz, TecnoQro) | Inclutec2026 |
| mariana.lopez@correo.mx | Candidata (perfil completo, 88 % con la vacante) | Inclutec2026 |
| jorge.ramirez@correo.mx | Candidato (sin necesidades de ajuste registradas) | Inclutec2026 |

## 10. Documentación de diseño

| Archivo | Contenido |
|---|---|
| `docs/api/contrato.md` | Contrato del API: 100 endpoints, reglas de negocio, errores y objetos (y `openapi.yaml`) |
| `docs/diseno/requerimientos.md` | 156 requerimientos funcionales por interfaz y 43 no funcionales |
| `docs/diseno/pantallas.md` | Contenido de cada pantalla, campos de BD, catálogos, estados y datos de ejemplo |
| `docs/diseno/casos_de_uso.md` | 27 casos de uso con flujos, flujos alternos y diagrama de secuencia |
| `docs/diseno/componentes.mmd` | Diagrama de componentes (Mermaid) |
| `db/modelo/diccionario.md` | Diccionario de datos de las 39 tablas |
| `db/modelo/inclutec.dbml` | Modelo completo para dbdiagram.io |
