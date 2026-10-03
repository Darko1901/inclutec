# Requerimientos de IncluTec

Fuente: `Requerimientos_IncluTec_Combinado.xlsx` (entrega de análisis). Los RF se numeran por interfaz.

## Requerimientos funcionales

### MOV-00 · Splash

Módulo: Móvil / Compartida · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Mostrar splash con logo | Mostrar la pantalla inicial con el logotipo de IncluTec y un texto alternativo legible por lector de pantalla; duración máxima de 3 s. | Alta |
| RF-02 | Verificar sesión persistente | Validar el token almacenado contra GET /auth/me; si responde 200, redirigir a la pantalla principal del rol (CAN-01 o REC-02); si responde 401, redirigir a MOV-01. | Alta |

### MOV-01 · Inicio de sesión (móvil)

Módulo: Móvil / Compartida · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Captura de credenciales | Capturar correo (formato RFC 5322) y contraseña (≥ 8 caracteres); el botón «Iniciar sesión» se habilita solo si ambos campos son válidos. Opción para mostrar u ocultar la contraseña. | Alta |
| RF-02 | Autenticación contra API | Enviar las credenciales a POST /auth/login; al recibir 200, almacenar el JWT en expo-secure-store. | Alta |
| RF-03 | Manejo de errores | Mostrar un mensaje específico ante 401 («Correo o contraseña incorrectos»), 423 («Cuenta suspendida») o 5xx («Servicio no disponible»), sin exponer detalles técnicos y anunciándolo al lector de pantalla. | Alta |
| RF-04 | Redirección por rol | Leer el rol del JWT y navegar a CAN-01 (candidato) o REC-02 (reclutador). Si el rol es «administrador», informar que debe usar el panel web y cerrar la sesión. | Alta |
| RF-05 | Accesos secundarios | Mostrar enlaces a MOV-02 (crear cuenta) y MOV-03 (recuperar contraseña). | Media |

### MOV-02 · Registro de cuenta

Módulo: Móvil / Compartida · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; catálogos de sector y tamaño de empresa

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Selección de tipo de cuenta | Permitir elegir entre «Busco empleo» (candidato) y «Represento a una empresa» (reclutador) antes de mostrar el formulario correspondiente. | Alta |
| RF-02 | Registro de candidato | Capturar nombre(s), apellidos, correo, teléfono (10 dígitos), municipio/estado y contraseña; enviar a POST /auth/registro/candidato. | Alta |
| RF-03 | Registro de reclutador y empresa | Capturar datos del reclutador (nombre, puesto, correo, teléfono, contraseña) y de la empresa (razón social, nombre comercial, RFC de 12 o 13 caracteres, sector, tamaño, municipio/estado); enviar a POST /auth/registro/reclutador. La empresa se crea en estado «pendiente de validación». | Alta |
| RF-04 | Política de contraseña | Validar contraseña de 8 a 64 caracteres con al menos una letra y un número, y confirmar que ambas capturas coincidan. | Alta |
| RF-05 | Aviso de privacidad y consentimiento | Mostrar el aviso de privacidad y exigir su aceptación. Para candidatos, solicitar además el consentimiento expreso para el tratamiento de datos sobre necesidades de ajuste (dato personal sensible, LFPDPPP); sin él, la cuenta se crea pero esa sección queda deshabilitada. | Alta |
| RF-06 | Unicidad de correo | Si el API responde 409, indicar que el correo ya está registrado y ofrecer ir a MOV-01 o MOV-03. | Media |
| RF-07 | Inicio tras registro | Al recibir 201, iniciar sesión automáticamente y dirigir al candidato a CAN-03 (completar perfil) y al reclutador a REC-01 (perfil de la organización). | Media |

### MOV-03 · Recuperar contraseña

Módulo: Móvil / Compartida · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; servicio de correo (SMTP)

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Solicitud de código | Capturar el correo y enviarlo a POST /auth/password/solicitar; mostrar siempre el mismo mensaje de confirmación, exista o no la cuenta. | Alta |
| RF-02 | Validación de código | Capturar el código de 6 dígitos recibido por correo; el código vence a los 15 minutos y admite máximo 5 intentos. | Alta |
| RF-03 | Nueva contraseña | Capturar y confirmar la nueva contraseña (misma política que MOV-02) y enviarla a POST /auth/password/restablecer; al recibir 200, regresar a MOV-01 con mensaje de éxito. | Alta |
| RF-04 | Reenvío de código | Permitir reenviar el código una vez transcurridos 60 s desde el envío anterior. | Baja |

### MOV-04 · Notificaciones

Módulo: Móvil / Compartida · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; Expo Push Notifications

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Registro del dispositivo | Al iniciar sesión, solicitar permiso de notificaciones y registrar el token con POST /dispositivos. | Alta |
| RF-02 | Listado de notificaciones | Listar las notificaciones del usuario vía GET /notificaciones (paginado de 20, más recientes primero) con título, mensaje, fecha y estado leída/no leída. | Alta |
| RF-03 | Indicador de no leídas | Mostrar en la barra de navegación un contador de notificaciones no leídas, anunciado por el lector de pantalla (p. ej. «Notificaciones, 3 sin leer»). | Media |
| RF-04 | Marcar como leída | Marcar una notificación como leída al abrirla (PATCH /notificaciones/{id}/leida) y permitir marcar todas (PATCH /notificaciones/leidas). | Media |
| RF-05 | Navegación al origen | Al tocar una notificación, abrir la pantalla relacionada (CAN-06, REC-05, REC-06 o REC-01) con el identificador correspondiente. | Media |
| RF-06 | Preferencias de canal | Permitir activar o desactivar el aviso por push y por correo para cada tipo de evento vía PUT /notificaciones/preferencias. | Baja |

### CAN-01 · Vacantes (inicio del candidato)

Módulo: Móvil / Candidato · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; motor de compatibilidad

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Vacantes recomendadas | Mostrar por defecto las vacantes publicadas ordenadas por compatibilidad descendente vía GET /vacantes/recomendadas (paginado de 20 con desplazamiento infinito). | Alta |
| RF-02 | Búsqueda por texto | Buscar por puesto, empresa o palabra clave (mínimo 3 caracteres) vía GET /vacantes?q=. | Alta |
| RF-03 | Filtros | Filtrar por modalidad, categoría, municipio/estado, jornada, salario mínimo, compatibilidad mínima y ajustes o condiciones de accesibilidad específicas (p. ej. «intérprete de LSM», «acceso con rampa»). | Alta |
| RF-04 | Filtro «cubre mis necesidades» | Opción para mostrar solo las vacantes que cubren todas las necesidades de ajuste registradas por el candidato. | Alta |
| RF-05 | Tarjeta de vacante | Cada tarjeta muestra puesto, empresa (con distintivo de empresa validada), modalidad, ubicación, porcentaje de compatibilidad e íconos de accesibilidad acompañados de texto. | Media |
| RF-06 | Estado vacío y perfil incompleto | Si no hay resultados, sugerir quitar filtros. Si el perfil está incompleto, mostrar un aviso con acceso a CAN-03 y CAN-04 explicando que las recomendaciones mejoran al completarlo. | Media |

### CAN-02 · Detalle de vacante

Módulo: Móvil / Candidato · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; motor de compatibilidad; CAN-03/CAN-04

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Información de la vacante | Obtener GET /vacantes/{id} y mostrar puesto, empresa, descripción, categoría, jornada, tipo de contrato, salario (si la empresa lo publica), ubicación y fecha de publicación. | Alta |
| RF-02 | Requisitos | Mostrar habilidades obligatorias y deseables, formación mínima y años de experiencia solicitados. | Alta |
| RF-03 | Accesibilidad y ajustes | Mostrar la modalidad, las condiciones de accesibilidad con las que ya cuenta el lugar de trabajo y los ajustes razonables que la empresa puede ofrecer bajo solicitud. | Alta |
| RF-04 | Desglose de compatibilidad | Obtener GET /vacantes/{id}/compatibilidad y mostrar el porcentaje con su detalle: habilidades que cumple y que le faltan, necesidades de ajuste cubiertas y no cubiertas, modalidad y formación. | Alta |
| RF-05 | Postularse | Enviar POST /postulaciones con {vacante_id, mensaje (opcional, ≤ 500 caracteres), compartir_ajustes}; confirmar antes de enviar. Si el API responde 409, indicar que ya existe una postulación a esa vacante. | Alta |
| RF-06 | Requisito de perfil mínimo | Deshabilitar «Postularme» y explicar el motivo si el perfil no tiene nombre, municipio, al menos una habilidad y al menos una formación académica. | Media |
| RF-07 | Consentimiento de ajustes | Antes de postularse, preguntar si desea compartir sus necesidades de ajuste con la empresa; por defecto se toma su preferencia de CAN-03. | Alta |
| RF-08 | Reportar vacante | Permitir reportar la vacante (POST /reportes) eligiendo un motivo del catálogo y una descripción opcional (≤ 500 caracteres). | Media |
| RF-09 | Ver empresa | Enlazar a la ficha de la empresa en CAN-07. | Baja |

### CAN-03 · Mi perfil

Módulo: Móvil / Candidato · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; catálogo de ajustes y condiciones de accesibilidad

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Datos personales | Consultar y editar nombre, apellidos, teléfono, municipio/estado, foto (opcional, JPG/PNG ≤ 2 MB) y resumen profesional (≤ 500 caracteres) vía GET/PUT /candidatos/me. | Alta |
| RF-02 | Preferencias laborales | Registrar modalidades de interés (presencial, remoto, híbrido), categorías de interés, jornada deseada y disponibilidad para reubicarse. | Alta |
| RF-03 | Necesidades de ajuste | Seleccionar del catálogo, agrupado por categoría (movilidad, visual, auditiva, comunicación, cognitiva/psicosocial, general), los ajustes que necesita, más una nota libre opcional (≤ 300 caracteres), vía PUT /candidatos/me/necesidades. No se solicita ni almacena diagnóstico ni tipo de discapacidad. | Alta |
| RF-04 | Visibilidad de ajustes | Interruptor «Compartir mis necesidades de ajuste con las empresas a las que me postule» (por defecto: preguntar en cada postulación). | Alta |
| RF-05 | Completitud del perfil | Mostrar el porcentaje de completitud del perfil y la lista de secciones pendientes. | Media |
| RF-06 | Seguridad de la cuenta | Permitir cambiar la contraseña (PUT /auth/password) y cerrar sesión (POST /auth/logout y borrado del token local). | Alta |
| RF-07 | Eliminar cuenta | Permitir la cancelación de la cuenta y de los datos personales (derecho ARCO) vía DELETE /candidatos/me, con doble confirmación. | Media |

### CAN-04 · Mi CV

Módulo: Móvil / Candidato · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; catálogos de habilidades y niveles educativos

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Organización en pestañas | Presentar tres pestañas: Experiencia, Formación y Habilidades, navegables con lector de pantalla y teclado externo. | Media |
| RF-02 | Experiencia laboral | Listar, crear, editar y eliminar experiencias (puesto, empresa, fecha de inicio, fecha de fin o «actual», descripción ≤ 500 caracteres) vía /candidatos/me/experiencias; validar que la fecha de fin sea posterior a la de inicio. | Alta |
| RF-03 | Formación académica | Listar, crear, editar y eliminar formaciones (nivel educativo del catálogo, institución, carrera, estado: concluida / en curso / trunca, fechas) vía /candidatos/me/formaciones. | Alta |
| RF-04 | Habilidades | Agregar habilidades con autocompletado contra GET /catalogos/habilidades?q=, con nivel (básico, intermedio, avanzado); máximo 30 y sin duplicados, vía /candidatos/me/habilidades. | Alta |
| RF-05 | Recalcular compatibilidad | Al guardar cambios en el CV, el API recalcula la compatibilidad del candidato con las vacantes publicadas. | Media |
| RF-06 | Vista previa | Mostrar el CV tal como lo verá una empresa, respetando la configuración de visibilidad de ajustes. | Baja |

### CAN-05 · Mis postulaciones

Módulo: Móvil / Candidato · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Listado de postulaciones | Listar las postulaciones del candidato vía GET /postulaciones/me con puesto, empresa, fecha y estado (postulada, en revisión, entrevista, aceptada, no seleccionada, retirada). | Alta |
| RF-02 | Filtro por estado | Filtrar por estado y separar las postulaciones activas de las finalizadas. | Media |
| RF-03 | Estado accesible | Mostrar cada estado con texto e ícono, no solo con color. | Alta |
| RF-04 | Actualización | Actualizar el listado al deslizar hacia abajo y al volver a la pantalla. | Media |
| RF-05 | Navegación al detalle | Al seleccionar una postulación, navegar a CAN-06 con su identificador. | Media |

### CAN-06 · Detalle de postulación y entrevista

Módulo: Móvil / Candidato · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; REC-06 (horarios de entrevista); servicio de correo

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Historial de la postulación | Obtener GET /postulaciones/{id} y mostrar la línea de tiempo de estados con fecha y el mensaje que el reclutador haya dejado en cada cambio. | Alta |
| RF-02 | Horarios disponibles | Si el estado es «entrevista», mostrar los horarios libres de la vacante vía GET /horarios-entrevista?vacante_id={id}&disponible=true. | Alta |
| RF-03 | Agendar entrevista | Permitir elegir un horario y confirmarlo con POST /postulaciones/{id}/entrevista {horario_id}. Si el API responde 409 (horario ya tomado), refrescar la lista y avisar. | Alta |
| RF-04 | Datos de la entrevista | Una vez agendada, mostrar fecha, hora, duración y la liga de Google Meet o Microsoft Teams, con opción para abrirla o copiarla. | Alta |
| RF-05 | Cancelar entrevista | Permitir cancelar la entrevista con al menos 24 h de anticipación (DELETE /entrevistas/{id}); el horario vuelve a quedar disponible y se notifica al reclutador. | Media |
| RF-06 | Retirar postulación | Permitir retirar la postulación mientras no esté finalizada (PATCH /postulaciones/{id}/retirar), con confirmación. | Media |

### CAN-07 · Empresas

Módulo: Móvil / Candidato · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Directorio de empresas | Listar las empresas validadas vía GET /empresas con búsqueda por nombre y filtro por sector. | Alta |
| RF-02 | Ficha de empresa | Mostrar nombre comercial, logotipo, sector, tamaño, ubicación, descripción y compromisos o prácticas de inclusión declarados. | Alta |
| RF-03 | Vacantes de la empresa | Listar las vacantes publicadas por la empresa con acceso a CAN-02. | Media |
| RF-04 | Reportar empresa | Permitir reportar la empresa (POST /reportes) con motivo y descripción. | Media |

### REC-01 · Perfil de la organización

Módulo: Móvil / Reclutador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; catálogos de sector y tamaño

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Datos de la organización | Consultar y editar nombre comercial, sector, tamaño, descripción (≤ 1000 caracteres), sitio web, ubicación, logotipo (JPG/PNG ≤ 2 MB) y prácticas de inclusión vía GET/PUT /empresas/me. | Alta |
| RF-02 | Estado de validación | Mostrar un aviso con el estado de la empresa (pendiente, validada, rechazada con motivo, suspendida) y lo que implica cada uno. | Alta |
| RF-03 | Documento de validación | Permitir subir la constancia de situación fiscal (PDF ≤ 5 MB) vía POST /empresas/me/documento para que el administrador valide la empresa. | Media |
| RF-04 | Datos fiscales protegidos | Una vez validada la empresa, la razón social y el RFC quedan en solo lectura; cualquier cambio se solicita al administrador. | Media |
| RF-05 | Seguridad de la cuenta | Permitir cambiar la contraseña y cerrar sesión. | Alta |

### REC-02 · Mis vacantes

Módulo: Móvil / Reclutador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Listado de vacantes | Listar las vacantes de la empresa vía GET /empresas/me/vacantes con título, estado (borrador, publicada, pausada, cerrada, suspendida), número de postulados y postulaciones nuevas. | Alta |
| RF-02 | Filtro por estado | Filtrar el listado por estado de la vacante. | Media |
| RF-03 | Cambio de estado | Permitir pausar, reanudar y cerrar una vacante vía PATCH /vacantes/{id}/estado, con confirmación. | Alta |
| RF-04 | Crear y duplicar | Botón para crear una vacante (REC-03) y opción para duplicar una existente como borrador (POST /vacantes/{id}/duplicar). | Media |
| RF-05 | Restricción por validación | Si la empresa no está validada, permitir crear borradores pero no publicar, e indicarlo en pantalla. | Alta |
| RF-06 | Navegación | Al seleccionar una vacante, ir a REC-04 (postulados); desde el menú de la tarjeta, ir a REC-03 (editar). | Media |

### REC-03 · Crear / editar vacante

Módulo: Móvil / Reclutador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; catálogos (categorías, habilidades, modalidades, jornadas, niveles educativos, ajustes)

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Datos generales | Capturar título, categoría, descripción (≤ 2000 caracteres), jornada, tipo de contrato, número de plazas, ubicación y rango salarial opcional con la opción «mostrar salario». | Alta |
| RF-02 | Requisitos | Seleccionar habilidades del catálogo marcadas como obligatorias o deseables (al menos una obligatoria), formación mínima y años de experiencia. | Alta |
| RF-03 | Modalidad de trabajo | Elegir la modalidad (presencial, remoto o híbrido); si es presencial o híbrida, la dirección es obligatoria. | Alta |
| RF-04 | Accesibilidad obligatoria | Declarar las condiciones de accesibilidad existentes y los ajustes razonables que la empresa puede ofrecer bajo solicitud, más notas (≤ 500 caracteres). La sección es obligatoria para publicar; si no hay condiciones, se debe declarar explícitamente. | Alta |
| RF-05 | Guardar o publicar | Guardar como borrador (POST/PUT /vacantes) o publicar (estado «publicada»). Publicar requiere que la empresa esté validada y que todos los campos obligatorios sean válidos. | Alta |
| RF-06 | Edición con postulados | Al modificar requisitos o accesibilidad de una vacante con postulaciones, advertir que la compatibilidad se recalculará y que se avisará a los postulados. | Media |

### REC-04 · Candidatos postulados

Módulo: Móvil / Reclutador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; motor de compatibilidad

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Listado por vacante | Listar los postulados de una vacante vía GET /vacantes/{id}/postulaciones, ordenados por compatibilidad laboral descendente. | Alta |
| RF-02 | Información por postulado | Mostrar nombre, porcentaje de compatibilidad laboral, estado, fecha de postulación y el indicador «ajustes por confirmar» cuando corresponda. | Alta |
| RF-03 | Compatibilidad sin sesgo | La compatibilidad mostrada al reclutador considera solo habilidades, formación y modalidad; las necesidades de ajuste nunca reducen la posición del candidato en la lista. | Alta |
| RF-04 | Filtros | Filtrar por estado de la postulación y por compatibilidad mínima. | Media |
| RF-05 | Navegación al detalle | Al seleccionar un postulado, navegar a REC-05 con el id de la postulación. | Media |

### REC-05 · Detalle del postulado

Módulo: Móvil / Reclutador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; servicio de notificaciones

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | CV del candidato | Obtener GET /postulaciones/{id}/candidato y mostrar resumen, experiencia, formación, habilidades y mensaje de postulación. | Alta |
| RF-02 | Desglose de compatibilidad | Mostrar las habilidades obligatorias y deseables que cumple y las que no, la formación y la modalidad. | Alta |
| RF-03 | Necesidades de ajuste | Si el candidato dio su consentimiento, mostrar sus necesidades de ajuste indicando cuáles ya están cubiertas por la vacante y cuáles requieren confirmación de la empresa. | Alta |
| RF-04 | Cambio de estado | Cambiar el estado vía PATCH /postulaciones/{id}/estado solo con transiciones válidas (postulada → en revisión → entrevista → aceptada / no seleccionada), con mensaje opcional para el candidato; el cambio genera notificación. | Alta |
| RF-05 | Observaciones del proceso | Registrar y consultar observaciones internas con fecha y autor (POST/GET /postulaciones/{id}/observaciones); no son visibles para el candidato. | Alta |
| RF-06 | Datos de contacto | Mostrar el correo y el teléfono del candidato a partir del estado «entrevista». | Media |
| RF-07 | Reportar candidato | Permitir reportar el perfil (POST /reportes) con motivo y descripción. | Baja |

### REC-06 · Agenda de entrevistas

Módulo: Móvil / Reclutador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; servicio de correo

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Publicar horarios | Crear horarios de entrevista por vacante con fecha, hora de inicio, duración (30, 45 o 60 min) y liga genérica de Google Meet o Microsoft Teams vía POST /horarios-entrevista; validar que la fecha sea futura y que no se traslapen. | Alta |
| RF-02 | Agenda | Listar los horarios propios, libres y agendados, agrupados por día (GET /entrevistas/me), mostrando candidato y vacante en los ocupados. | Alta |
| RF-03 | Cancelar horario | Eliminar un horario libre o cancelar uno agendado (con motivo); si estaba agendado, notificar al candidato por app y correo. | Alta |
| RF-04 | Resultado de la entrevista | Marcar una entrevista como realizada o «no asistió» (PATCH /entrevistas/{id}). | Media |
| RF-05 | Recordatorio | El sistema envía un recordatorio 24 h antes de la entrevista a ambas partes. | Media |

### WEB-01 · Inicio de sesión (web)

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; Laravel como cliente del API

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Captura de credenciales | Capturar correo (RFC 5322) y contraseña (≥ 8 caracteres); deshabilitar el envío hasta que ambos sean válidos. | Alta |
| RF-02 | Autenticación contra API | Laravel envía las credenciales a POST /auth/login y guarda el JWT en la sesión del servidor; el token nunca se expone al navegador. | Alta |
| RF-03 | Restricción de rol | Permitir el acceso solo si el rol es «administrador»; en otro caso, mostrar 403 y cerrar la sesión. | Alta |
| RF-04 | Mensajes de error | Manejar 401, 403, 423 y 5xx con mensajes claros sin exponer detalles técnicos. | Media |
| RF-05 | Protección de rutas | Proteger todas las rutas del panel con middleware; si el API responde 401 (token vencido), redirigir a WEB-01. | Alta |

### WEB-02 · Dashboard y estadísticas

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; librería de gráficas

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Indicadores clave | Mostrar candidatos activos, empresas validadas, vacantes publicadas, postulaciones del periodo, contrataciones (postulaciones aceptadas) y tasa de colocación, vía GET /admin/estadisticas/resumen. | Alta |
| RF-02 | Pendientes de atención | Mostrar el número de empresas pendientes de validar y de reportes abiertos, con acceso directo a WEB-04 y WEB-08. | Alta |
| RF-03 | Gráficas de vinculación | Graficar postulaciones por estado, vacantes por modalidad y categoría, y la evolución mensual de postulaciones y contrataciones. | Alta |
| RF-04 | Brecha de accesibilidad | Comparar los ajustes más solicitados por candidatos contra los más ofrecidos en vacantes, y las habilidades más demandadas contra las más registradas. | Alta |
| RF-05 | Filtros de periodo | Filtrar todas las métricas por rango de fechas (por defecto, últimos 30 días). | Media |
| RF-06 | Exportación | Exportar el reporte estadístico en PDF y XLSX vía GET /admin/estadisticas/exportar?formato=. | Media |
| RF-07 | Datos agregados | Las estadísticas se presentan solo de forma agregada; no permiten identificar a un candidato ni sus necesidades de ajuste. | Alta |

### WEB-03 · Gestión de usuarios

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Listado paginado | Listar usuarios vía GET /admin/usuarios?page=&size=25 con nombre, correo, rol, empresa (si aplica), fecha de registro y estado. | Alta |
| RF-02 | Búsqueda y filtros | Buscar por nombre o correo y filtrar por rol y estado (activo, suspendido, eliminado). | Media |
| RF-03 | Alta de usuario | Crear usuarios de cualquier rol validando la unicidad del correo; la contraseña se guarda con hash bcrypt (cost ≥ 10). | Alta |
| RF-04 | Edición | Editar nombre, correo, teléfono y rol; el cambio de rol de un reclutador requiere desvincularlo de su empresa. | Media |
| RF-05 | Suspensión y baja lógica | Suspender, reactivar o dar de baja lógica un usuario (PATCH /admin/usuarios/{id}/estado) registrando el motivo; nunca se borra físicamente. | Alta |
| RF-06 | Consulta de detalle | Ver el detalle del usuario: datos generales, número de postulaciones o vacantes y reportes asociados. No se muestran las necesidades de ajuste del candidato. | Media |

### WEB-04 · Empresas y validación

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; servicio de correo

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Listado de empresas | Listar empresas vía GET /admin/empresas con razón social, RFC, sector, reclutadores, vacantes activas y estado (pendiente, validada, rechazada, suspendida). | Alta |
| RF-02 | Cola de validación | Mostrar primero las empresas pendientes, ordenadas por antigüedad de la solicitud. | Alta |
| RF-03 | Revisión y validación | Mostrar los datos fiscales y el documento cargado; permitir validar o rechazar con motivo obligatorio (PATCH /admin/empresas/{id}/validacion) y notificar al reclutador. | Alta |
| RF-04 | Validación de RFC | Verificar que el RFC tenga formato válido y no esté registrado por otra empresa. | Alta |
| RF-05 | CRUD de empresas | Crear, editar y dar de baja lógica empresas; permitir corregir razón social y RFC de empresas validadas. | Media |
| RF-06 | Suspensión | Suspender una empresa con motivo; sus vacantes publicadas pasan a «suspendida» y se notifica a los postulados. | Alta |

### WEB-05 · Vacantes (moderación)

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Listado global | Listar todas las vacantes vía GET /admin/vacantes con título, empresa, estado, fecha de publicación, postulados y número de reportes. | Alta |
| RF-02 | Filtros | Filtrar por empresa, estado, categoría, modalidad y «con reportes». | Media |
| RF-03 | Detalle | Consultar el detalle completo de la vacante, incluida la sección de accesibilidad. | Media |
| RF-04 | Suspender y reactivar | Suspender una vacante con motivo (PATCH /admin/vacantes/{id}/estado), notificando al reclutador y a los postulados; permitir reactivarla. | Alta |

### WEB-06 · Categorías y habilidades

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Categorías de vacante | Listar, crear, editar y desactivar categorías (áreas laborales) con nombre único y descripción. | Alta |
| RF-02 | Habilidades | Listar, crear, editar y desactivar habilidades con nombre único y categoría asociada. | Alta |
| RF-03 | Protección de integridad | No permitir eliminar una categoría o habilidad en uso; solo desactivarla, para que deje de ofrecerse en nuevos registros. | Alta |
| RF-04 | Búsqueda | Buscar habilidades por nombre y mostrar cuántos candidatos y vacantes las usan. | Baja |

### WEB-07 · Catálogos

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Ajustes y condiciones de accesibilidad | Administrar el catálogo de ajustes razonables y condiciones de accesibilidad con nombre, descripción en lenguaje claro y categoría (movilidad, visual, auditiva, comunicación, cognitiva/psicosocial, general). | Alta |
| RF-02 | Catálogos generales | Administrar modalidades de trabajo, jornadas, tipos de contrato, niveles educativos, sectores y tamaños de empresa. | Alta |
| RF-03 | Motivos de reporte | Administrar los motivos disponibles para reportar vacantes, empresas o candidatos. | Media |
| RF-04 | Integridad | Validar nombres únicos por catálogo y aplicar desactivación en lugar de borrado cuando el registro esté en uso. | Alta |

### WEB-08 · Reportes e incidencias

Módulo: Web / Administrador · Dependencias: API REST (FastAPI), Base de datos PostgreSQL; servicio de notificaciones

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Bandeja de reportes | Listar reportes vía GET /admin/reportes con tipo (vacante, empresa, candidato), motivo, fecha, quién reporta y estado (abierto, en revisión, resuelto, descartado). | Alta |
| RF-02 | Filtros | Filtrar por estado, tipo y motivo; ordenar por antigüedad. | Media |
| RF-03 | Detalle del reporte | Mostrar el reporte junto con el elemento reportado y los reportes previos contra el mismo elemento. | Alta |
| RF-04 | Seguimiento de la incidencia | Cambiar el estado del reporte registrando una resolución obligatoria al cerrarlo (PATCH /admin/reportes/{id}); cada cambio queda en el historial. | Alta |
| RF-05 | Acciones derivadas | Desde el reporte, suspender la vacante, la empresa o el usuario reportado sin salir de la pantalla. | Alta |
| RF-06 | Aviso a quien reporta | Notificar a quien reportó cuando su reporte se resuelve o se descarta, sin revelar detalles de la sanción. | Media |

### API · FastAPI (objetivos del API)

Módulo: Backend · Dependencias: Base de datos PostgreSQL; SMTP; Expo Push

| RF | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Autenticación y cuentas | Exponer POST /auth/login, GET /auth/me, POST /auth/logout, registro de candidato y reclutador, recuperación y cambio de contraseña. Emitir JWT firmado HS256 con expiración configurable (por defecto 8 h). | Alta |
| RF-02 | Autorización por rol y propiedad | Proteger cada endpoint por rol (candidato, reclutador, administrador) y por propiedad: un reclutador solo accede a vacantes y postulaciones de su empresa, y un candidato solo a sus propios datos. | Alta |
| RF-03 | Perfil y CV del candidato | Exponer /candidatos/me con sus subrecursos de experiencias, formaciones, habilidades, preferencias y necesidades de ajuste. | Alta |
| RF-04 | Empresas y validación | Exponer /empresas (directorio público de validadas), /empresas/me y /admin/empresas, con el flujo de validación pendiente → validada / rechazada y la suspensión. | Alta |
| RF-05 | Vacantes y búsqueda | Exponer el CRUD de vacantes con estados (borrador, publicada, pausada, cerrada, suspendida) y la búsqueda con filtros combinables y paginación. | Alta |
| RF-06 | Motor de compatibilidad | Calcular para el candidato C = 0.40·H + 0.30·A + 0.15·M + 0.15·F, donde H = (2·obligatorias cumplidas + deseables cumplidas) / (2·obligatorias + deseables); A = necesidades cubiertas / necesidades registradas (1 si no registró); M = 1 si la modalidad coincide con su preferencia, 0.5 si la vacante es híbrida, 0 en otro caso; F = 1 si cumple la formación mínima, 0.5 si la cursa, 0 si no. Para el reclutador se usa solo (0.40·H + 0.15·M + 0.15·F) / 0.70, sin el componente A. | Alta |
| RF-07 | Postulaciones y transiciones | Exponer /postulaciones; validar transiciones de estado permitidas, impedir postulaciones duplicadas y registrar cada cambio en el historial con fecha, usuario y mensaje. | Alta |
| RF-08 | Entrevistas | Exponer /horarios-entrevista y /entrevistas; agendar un horario dentro de una transacción con bloqueo, para que dos candidatos no puedan tomar el mismo (409 si ya está ocupado). | Alta |
| RF-09 | Notificaciones | Generar notificaciones en la app para cada evento (cambio de estado, entrevista agendada, cancelada o próxima, empresa validada o rechazada, nuevo postulado, reporte resuelto) y enviarlas por push (Expo) y correo (SMTP) en segundo plano según las preferencias del usuario. | Alta |
| RF-10 | Reportes e incidencias | Exponer POST /reportes para usuarios autenticados y /admin/reportes para su seguimiento, con historial de estados y acciones de suspensión. | Alta |
| RF-11 | Catálogos | Exponer GET /catalogos/{tipo} para las apps y el CRUD /admin/catalogos/{tipo}, /admin/categorias y /admin/habilidades para el administrador. | Alta |
| RF-12 | Estadísticas y exportación | Exponer /admin/estadisticas con indicadores agregados y filtros de fecha, y la exportación a PDF y XLSX. | Alta |
| RF-13 | Contratos consistentes | Todas las respuestas en JSON; errores con códigos HTTP estándar y cuerpo {"detail": "..."}; listados paginados con {items, total, page, size}. | Media |

## Requerimientos no funcionales

### Accesibilidad (todas las interfaces móviles y web)

Aplica a: MOV-*, CAN-*, REC-*, WEB-*

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Estándar de accesibilidad | Las interfaces cumplen las pautas WCAG 2.1 nivel AA. | Alta |
| Lectores de pantalla | Todos los elementos interactivos tienen etiqueta, rol y estado accesibles (accessibilityLabel/Role/State en React Native; HTML semántico y ARIA en Laravel) y funcionan con TalkBack, VoiceOver y NVDA. | Alta |
| Contraste | Contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande y componentes de interfaz. | Alta |
| Texto escalable | La interfaz respeta el tamaño de fuente del sistema y admite hasta 200 % de ampliación sin pérdida de contenido ni funcionalidad. | Alta |
| Áreas táctiles | Los componentes táctiles tienen un área mínima de 48 × 48 dp en Android y 44 × 44 pt en iOS. | Alta |
| Información no dependiente del color | Estados, errores y porcentajes se comunican con texto o ícono además del color. | Alta |
| Navegación por teclado | El panel web puede operarse completamente con teclado y la app admite teclado externo y control por interruptores (Switch Access / Control por botón), con foco visible y orden lógico. | Alta |
| Lenguaje claro | Textos en lenguaje claro y sin tecnicismos; los errores de formulario indican qué campo falla y cómo corregirlo. | Media |
| Movimiento reducido | Se respeta la preferencia de «reducir movimiento» del sistema y no hay contenido parpadeante. | Baja |

### Inicio de sesión, registro y recuperación

Aplica a: MOV-01, MOV-02, MOV-03, WEB-01

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Seguridad — contraseñas | Las contraseñas se almacenan únicamente como hash bcrypt (cost ≥ 10); nunca en texto plano ni en registros. | Alta |
| Seguridad — tokens | JWT firmado HS256 con expiración de 8 h; transporte HTTPS obligatorio; almacenamiento en expo-secure-store (móvil) y en la sesión del servidor Laravel (web). | Alta |
| Protección contra fuerza bruta | Bloqueo temporal de 15 minutos tras 5 intentos fallidos consecutivos por cuenta o por IP. | Alta |
| Mensajes neutros | Los mensajes de error no revelan si un correo existe en el sistema. | Media |
| Desempeño | El inicio de sesión responde en ≤ 1.5 s en el percentil 95. | Media |

### Privacidad y datos sensibles

Aplica a: MOV-02, CAN-02, CAN-03, CAN-04, REC-05, WEB-03, API

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Cumplimiento legal | El tratamiento de datos personales cumple la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, con aviso de privacidad y consentimiento expreso para datos sensibles. | Alta |
| Minimización de datos | El sistema registra necesidades de ajuste y no diagnósticos, tipos de discapacidad ni documentos médicos. | Alta |
| Control del candidato | Las necesidades de ajuste solo son visibles para el candidato y para las empresas a cuyas vacantes se postuló con consentimiento; el administrador solo ve datos agregados. | Alta |
| Derechos ARCO | El candidato puede consultar, corregir y eliminar sus datos; la eliminación anonimiza sus postulaciones históricas en un plazo máximo de 30 días. | Alta |
| Registros sin datos sensibles | Los logs del servidor y los mensajes push no incluyen necesidades de ajuste ni datos de contacto. | Alta |

### Pantallas móviles (compartidas, candidato y reclutador)

Aplica a: MOV-*, CAN-*, REC-*

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Desempeño | Tiempo de respuesta de las pantallas ≤ 2 s en el percentil 95 sobre red 4G. | Alta |
| Compatibilidad | Ejecutable en Android 8+ e iOS 15+ con un solo código base (React Native + Expo). | Alta |
| Retroalimentación | Toda acción que tarde más de 300 ms muestra un indicador de carga anunciado al lector de pantalla. | Media |
| Tolerancia a fallas de red | La app conserva en caché el último listado de vacantes y postulaciones y avisa cuando no hay conexión; los formularios no pierden lo capturado. | Media |
| Orientación | Las pantallas funcionan en orientación vertical y horizontal. | Baja |

### Pantallas de administración web

Aplica a: WEB-03 a WEB-08

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Desempeño | Listados paginados de 25 registros con tiempo de respuesta ≤ 1 s. | Alta |
| Validación | Validación en cliente y servidor con mensajes específicos por campo. | Alta |
| Compatibilidad | Funciona en Chrome, Firefox y Edge en sus dos versiones más recientes, en resoluciones desde 1280 px de ancho. | Media |
| Auditoría | Toda creación, edición, validación, suspensión o cambio de estado queda registrado en bitácora con usuario, fecha y hora, valor anterior y valor nuevo. | Alta |
| Confirmación de acciones críticas | Suspender, rechazar o dar de baja requiere confirmación y motivo. | Media |

### Dashboard y estadísticas

Aplica a: WEB-02

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Desempeño | Generación de estadísticas de hasta 12 meses de datos en ≤ 5 s. | Alta |
| Exportación | La descarga en PDF o XLSX inicia en ≤ 3 s después de la solicitud. | Media |
| Gráficas accesibles | Cada gráfica tiene título, leyenda, valores disponibles como tabla alternativa y colores distinguibles para personas con daltonismo. | Alta |
| Anonimato | Los indicadores con menos de 5 registros se agrupan para evitar identificar a personas. | Media |

### Notificaciones (push, correo y en app)

Aplica a: MOV-04, CAN-06, REC-05, REC-06, WEB-04, WEB-08

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Tiempo de entrega | Las notificaciones push se envían en ≤ 1 min y los correos en ≤ 5 min tras el evento. | Media |
| Confiabilidad | Los envíos fallidos se reintentan hasta 3 veces; el fallo de un canal no bloquea la operación que lo generó. | Alta |
| Correos accesibles | Los correos incluyen versión en texto plano, estructura semántica y enlaces descriptivos. | Media |
| Contenido mínimo | Las notificaciones push no incluyen datos personales sensibles; el detalle se consulta dentro de la app. | Alta |

### API REST (FastAPI)

Aplica a: Backend FastAPI

| Requerimiento | Descripción | Prioridad |
|---|---|---|
| Disponibilidad | Disponibilidad ≥ 99 % mensual. | Alta |
| Desempeño | Percentil 95 de latencia ≤ 300 ms en endpoints de operación y ≤ 1 s en búsqueda con compatibilidad y en estadísticas. | Alta |
| Documentación | Especificación OpenAPI 3 autogenerada por FastAPI y accesible en /docs; rutas versionadas bajo /api/v1. | Alta |
| Seguridad | Todos los endpoints, excepto login, registro y recuperación de contraseña, requieren JWT válido; CORS restringido a los orígenes autorizados; validación de entrada con Pydantic. | Alta |
| Persistencia atómica | Las operaciones con varios cambios (agendar entrevista, cambio de estado con historial, suspensión en cascada) se ejecutan en transacciones de PostgreSQL. | Alta |
| Escalabilidad del cálculo | La compatibilidad se precalcula y se actualiza cuando cambia el CV del candidato o la vacante, sin recalcular en cada consulta. | Media |
