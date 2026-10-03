# Diccionario de datos — IncluTec

Generado a partir de los `COMMENT ON` de `migraciones/V001__esquema_inicial.sql`. 39 tablas.

## Seguridad y comunicación

### `rol`

Roles de usuario de la plataforma.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador del rol. |
| `nombre` | VARCHAR(20) | No | UQ |  | Nombre del rol: candidato, reclutador o administrador. |
| `descripcion` | VARCHAR(150) | Sí |  |  | Descripción del alcance del rol. |

Restricciones CHECK: `ck_rol_nombre`

### `usuario`

Cuentas de acceso de candidatos, reclutadores y administradores.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del usuario. |
| `rol_id` | SMALLINT | No | FK → rol |  | Rol del usuario. |
| `correo` | VARCHAR(254) | No | UQ |  | Correo electrónico; se usa como nombre de usuario. |
| `contrasena_hash` | VARCHAR(255) | No |  |  | Hash bcrypt de la contraseña (cost ≥ 10). |
| `nombre` | VARCHAR(80) | No |  |  | Nombre(s) de la persona. |
| `apellidos` | VARCHAR(120) | No |  |  | Apellidos de la persona. |
| `telefono` | VARCHAR(10) | Sí |  |  | Teléfono a 10 dígitos. |
| `estado` | VARCHAR(12) | No |  | activo | Estado de la cuenta: activo, suspendido o eliminado (baja lógica). |
| `motivo_estado` | VARCHAR(255) | Sí |  |  | Motivo de la suspensión o baja. |
| `acepto_aviso_en` | TIMESTAMPTZ | No |  |  | Fecha en que aceptó el aviso de privacidad. |
| `ultimo_acceso_en` | TIMESTAMPTZ | Sí |  |  | Fecha del último inicio de sesión. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de registro. |
| `actualizado_en` | TIMESTAMPTZ | No |  | now() | Fecha de la última modificación. |

Restricciones CHECK: `ck_usuario_estado`, `ck_usuario_telefono`

### `token_recuperacion`

Códigos de 6 dígitos para recuperar la contraseña.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del código. |
| `usuario_id` | BIGINT | No | FK → usuario |  | Usuario que solicitó la recuperación. |
| `codigo_hash` | VARCHAR(255) | No |  |  | Hash del código enviado por correo. |
| `intentos` | SMALLINT | No |  | 0 | Intentos de validación realizados (máximo 5). |
| `expira_en` | TIMESTAMPTZ | No |  |  | Vencimiento del código (15 minutos después de emitirse). |
| `usado_en` | TIMESTAMPTZ | Sí |  |  | Fecha en que se usó el código; nulo si no se ha usado. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de emisión. |

Restricciones CHECK: `ck_token_intentos`

### `dispositivo`

Dispositivos móviles registrados para recibir notificaciones push.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del dispositivo. |
| `usuario_id` | BIGINT | No | FK → usuario |  | Usuario dueño del dispositivo. |
| `expo_push_token` | VARCHAR(255) | No | UQ |  | Token de Expo Push Notifications. |
| `plataforma` | VARCHAR(10) | No |  |  | Sistema operativo: android o ios. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de registro del dispositivo. |

Restricciones CHECK: `ck_dispositivo_plataforma`

### `bitacora`

Registro de auditoría de las acciones administrativas y cambios de estado.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del registro. |
| `usuario_id` | BIGINT | Sí | FK → usuario |  | Usuario que realizó la acción. |
| `accion` | VARCHAR(20) | No |  |  | Tipo de acción realizada. |
| `entidad` | VARCHAR(40) | No |  |  | Tabla afectada. |
| `entidad_id` | BIGINT | Sí |  |  | Identificador del registro afectado. |
| `valor_anterior` | JSONB | Sí |  |  | Valores previos al cambio (sin datos sensibles). |
| `valor_nuevo` | JSONB | Sí |  |  | Valores posteriores al cambio (sin datos sensibles). |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha y hora de la acción. |

Restricciones CHECK: `ck_bitacora_accion`

### `notificacion`

Notificaciones dentro de la aplicación; también se envían por push y correo según las preferencias.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la notificación. |
| `usuario_id` | BIGINT | No | FK → usuario |  | Destinatario. |
| `tipo` | VARCHAR(30) | No |  |  | Tipo de evento que la originó. |
| `titulo` | VARCHAR(120) | No |  |  | Título breve. |
| `mensaje` | VARCHAR(300) | No |  |  | Texto de la notificación (sin datos sensibles). |
| `referencia_tipo` | VARCHAR(20) | Sí |  |  | Tipo de recurso relacionado (postulacion, entrevista, empresa, reporte). |
| `referencia_id` | BIGINT | Sí |  |  | Identificador del recurso relacionado, para navegar a él. |
| `leida` | BOOLEAN | No |  | false | Indica si el usuario ya la leyó. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de creación. |

Restricciones CHECK: `ck_notificacion_tipo`

### `preferencia_notificacion`

Preferencias de canal (push y correo) por tipo de notificación.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `usuario_id` | BIGINT | No | PK, FK → usuario |  | Usuario. |
| `tipo` | VARCHAR(30) | No | PK |  | Tipo de notificación. |
| `push` | BOOLEAN | No |  | true | Recibir por notificación push. |
| `correo` | BOOLEAN | No |  | true | Recibir por correo electrónico. |

## Catálogos

### `entidad_federativa`

Catálogo de entidades federativas (clave INEGI).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT | No | PK |  | Clave INEGI de la entidad. |
| `nombre` | VARCHAR(40) | No | UQ |  | Nombre de la entidad. |

### `municipio`

Catálogo de municipios (clave INEGI).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | INTEGER (identidad) | No | PK |  | Identificador del municipio. |
| `entidad_federativa_id` | SMALLINT | No | FK → entidad_federativa |  | Entidad federativa a la que pertenece. |
| `clave` | VARCHAR(3) | No |  |  | Clave INEGI del municipio dentro de la entidad. |
| `nombre` | VARCHAR(80) | No |  |  | Nombre del municipio. |

Únicas: `UNIQUE (entidad_federativa_id, clave)`

### `modalidad`

Catálogo de modalidades de trabajo (presencial, remoto, híbrido).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador de la modalidad. |
| `nombre` | VARCHAR(20) | No | UQ |  | Nombre de la modalidad. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `jornada`

Catálogo de jornadas laborales (tiempo completo, medio tiempo, por horas, etc.).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador de la jornada. |
| `nombre` | VARCHAR(40) | No | UQ |  | Nombre de la jornada. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `tipo_contrato`

Catálogo de tipos de contrato (indefinido, temporal, por proyecto, prácticas).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador del tipo de contrato. |
| `nombre` | VARCHAR(40) | No | UQ |  | Nombre del tipo de contrato. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `nivel_educativo`

Catálogo de niveles educativos ordenados de menor a mayor.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador del nivel. |
| `nombre` | VARCHAR(40) | No | UQ |  | Nombre del nivel (primaria, secundaria, bachillerato, técnico, licenciatura, posgrado). |
| `orden` | SMALLINT | No | UQ |  | Posición jerárquica; permite comparar si se cumple la formación mínima. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `sector`

Catálogo de sectores económicos de las empresas.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador del sector. |
| `nombre` | VARCHAR(80) | No | UQ |  | Nombre del sector. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `tamano_empresa`

Catálogo de tamaños de empresa.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador del tamaño. |
| `nombre` | VARCHAR(30) | No | UQ |  | Nombre del tamaño (micro, pequeña, mediana, grande). |
| `rango` | VARCHAR(40) | No |  |  | Rango de número de trabajadores. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `categoria`

Categorías o áreas laborales de las vacantes y de las habilidades.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador de la categoría. |
| `nombre` | VARCHAR(80) | No | UQ |  | Nombre de la categoría (p. ej. Tecnologías de la información). |
| `descripcion` | VARCHAR(255) | Sí |  |  | Descripción de la categoría. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `habilidad`

Catálogo de habilidades que registran los candidatos y requieren las vacantes.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | INTEGER (identidad) | No | PK |  | Identificador de la habilidad. |
| `categoria_id` | SMALLINT | No | FK → categoria |  | Categoría a la que pertenece la habilidad. |
| `nombre` | VARCHAR(80) | No | UQ |  | Nombre de la habilidad. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

### `ajuste`

Catálogo único de ajustes razonables y condiciones de accesibilidad; lo usan tanto las necesidades del candidato como las condiciones de la vacante.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador del ajuste. |
| `categoria` | VARCHAR(25) | No |  |  | Categoría: movilidad, visual, auditiva, comunicacion, cognitiva_psicosocial o general. |
| `nombre` | VARCHAR(100) | No | UQ |  | Nombre del ajuste (p. ej. Intérprete de Lengua de Señas Mexicana). |
| `descripcion` | VARCHAR(255) | No |  |  | Descripción en lenguaje claro. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos registros. |

Restricciones CHECK: `ck_ajuste_categoria`

### `motivo_reporte`

Catálogo de motivos para reportar vacantes, empresas o candidatos.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | SMALLINT (identidad) | No | PK |  | Identificador del motivo. |
| `nombre` | VARCHAR(100) | No | UQ |  | Nombre del motivo (p. ej. Discriminación, Vacante engañosa). |
| `aplica_a` | VARCHAR(10) | No |  |  | Tipo de elemento al que aplica el motivo. |
| `activo` | BOOLEAN | No |  | true | Indica si se ofrece en nuevos reportes. |

Restricciones CHECK: `ck_motivo_aplica`

## Candidato

### `candidato`

Perfil del candidato (extensión 1:1 de usuario con rol candidato).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `usuario_id` | BIGINT | No | PK, FK → usuario |  | Usuario al que pertenece el perfil. |
| `municipio_id` | INTEGER | Sí | FK → municipio |  | Municipio de residencia. |
| `jornada_id` | SMALLINT | Sí | FK → jornada |  | Jornada deseada. |
| `resumen` | VARCHAR(500) | Sí |  |  | Resumen profesional (máximo 500 caracteres). |
| `foto_url` | VARCHAR(500) | Sí |  |  | URL de la fotografía (opcional). |
| `disponible_reubicacion` | BOOLEAN | No |  | false | Indica si está dispuesto a cambiar de residencia. |
| `consentimiento_sensibles_en` | TIMESTAMPTZ | Sí |  |  | Fecha del consentimiento expreso para tratar necesidades de ajuste; nulo si no lo otorgó. |
| `compartir_ajustes` | VARCHAR(10) | No |  | preguntar | Preferencia para compartir necesidades de ajuste: preguntar, siempre o nunca. |
| `nota_ajustes` | VARCHAR(300) | Sí |  |  | Nota libre sobre sus necesidades de ajuste (máximo 300 caracteres). |
| `completitud` | SMALLINT | No |  | 0 | Porcentaje de completitud del perfil (0 a 100). |
| `actualizado_en` | TIMESTAMPTZ | No |  | now() | Fecha de la última modificación del perfil. |

Restricciones CHECK: `ck_candidato_compartir`, `ck_candidato_completitud`

### `candidato_modalidad`

Modalidades de trabajo que prefiere el candidato (N:M).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `candidato_id` | BIGINT | No | PK, FK → candidato |  | Candidato. |
| `modalidad_id` | SMALLINT | No | PK, FK → modalidad |  | Modalidad preferida. |

### `candidato_categoria`

Categorías laborales de interés del candidato (N:M).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `candidato_id` | BIGINT | No | PK, FK → candidato |  | Candidato. |
| `categoria_id` | SMALLINT | No | PK, FK → categoria |  | Categoría de interés. |

### `experiencia`

Experiencia laboral del candidato.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la experiencia. |
| `candidato_id` | BIGINT | No | FK → candidato |  | Candidato al que pertenece. |
| `puesto` | VARCHAR(100) | No |  |  | Puesto desempeñado. |
| `empresa` | VARCHAR(120) | No |  |  | Nombre de la empresa (texto libre). |
| `fecha_inicio` | DATE | No |  |  | Fecha de inicio. |
| `fecha_fin` | DATE | Sí |  |  | Fecha de término; nula si es el empleo actual. |
| `actual` | BOOLEAN | No |  | false | Indica si es su empleo actual. |
| `descripcion` | VARCHAR(500) | Sí |  |  | Descripción de funciones (máximo 500 caracteres). |

Restricciones CHECK: `ck_experiencia_actual`, `ck_experiencia_fechas`

### `formacion`

Formación académica del candidato.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la formación. |
| `candidato_id` | BIGINT | No | FK → candidato |  | Candidato al que pertenece. |
| `nivel_educativo_id` | SMALLINT | No | FK → nivel_educativo |  | Nivel educativo. |
| `institucion` | VARCHAR(150) | No |  |  | Institución educativa. |
| `carrera` | VARCHAR(150) | Sí |  |  | Carrera o programa (si aplica). |
| `estado` | VARCHAR(10) | No |  |  | Estado: concluida, en_curso o trunca. |
| `fecha_inicio` | DATE | Sí |  |  | Fecha de inicio. |
| `fecha_fin` | DATE | Sí |  |  | Fecha de término. |

Restricciones CHECK: `ck_formacion_estado`, `ck_formacion_fechas`

### `candidato_habilidad`

Habilidades del candidato con su nivel (N:M; máximo 30 por candidato, validado en el API).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `candidato_id` | BIGINT | No | PK, FK → candidato |  | Candidato. |
| `habilidad_id` | INTEGER | No | PK, FK → habilidad |  | Habilidad. |
| `nivel` | VARCHAR(12) | No |  |  | Nivel de dominio: basico, intermedio o avanzado. |

Restricciones CHECK: `ck_candidato_habilidad_nivel`

### `candidato_necesidad`

Necesidades de ajuste del candidato (N:M). Dato sensible: requiere consentimiento expreso.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `candidato_id` | BIGINT | No | PK, FK → candidato |  | Candidato. |
| `ajuste_id` | SMALLINT | No | PK, FK → ajuste |  | Ajuste que necesita. |

## Empresa y vacantes

### `empresa`

Organizaciones que publican vacantes; requieren validación del administrador.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la empresa. |
| `razon_social` | VARCHAR(200) | No |  |  | Razón social registrada ante el SAT. |
| `nombre_comercial` | VARCHAR(150) | No |  |  | Nombre comercial visible para los candidatos. |
| `rfc` | VARCHAR(13) | No | UQ |  | RFC de 12 (persona moral) o 13 (persona física) caracteres; único. |
| `sector_id` | SMALLINT | No | FK → sector |  | Sector económico. |
| `tamano_empresa_id` | SMALLINT | No | FK → tamano_empresa |  | Tamaño de la empresa. |
| `municipio_id` | INTEGER | No | FK → municipio |  | Municipio del domicilio principal. |
| `direccion` | VARCHAR(255) | Sí |  |  | Domicilio principal. |
| `descripcion` | VARCHAR(1000) | Sí |  |  | Descripción de la organización (máximo 1000 caracteres). |
| `sitio_web` | VARCHAR(255) | Sí |  |  | Sitio web. |
| `logo_url` | VARCHAR(500) | Sí |  |  | URL del logotipo. |
| `practicas_inclusion` | VARCHAR(1000) | Sí |  |  | Compromisos y prácticas de inclusión declarados. |
| `documento_url` | VARCHAR(500) | Sí |  |  | URL de la constancia de situación fiscal (PDF) para validación. |
| `estado` | VARCHAR(12) | No |  | pendiente | Estado: pendiente, validada, rechazada o suspendida. |
| `motivo_estado` | VARCHAR(255) | Sí |  |  | Motivo del rechazo o de la suspensión. |
| `validada_por` | BIGINT | Sí | FK → usuario |  | Administrador que validó o rechazó la empresa. |
| `validada_en` | TIMESTAMPTZ | Sí |  |  | Fecha de la validación o el rechazo. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de registro. |
| `actualizado_en` | TIMESTAMPTZ | No |  | now() | Fecha de la última modificación. |

Restricciones CHECK: `ck_empresa_estado`, `ck_empresa_rfc`

### `reclutador`

Perfil del reclutador (extensión 1:1 de usuario con rol reclutador) y su empresa.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `usuario_id` | BIGINT | No | PK, FK → usuario |  | Usuario al que pertenece el perfil. |
| `empresa_id` | BIGINT | No | FK → empresa |  | Empresa que representa. |
| `puesto` | VARCHAR(100) | No |  |  | Puesto del reclutador dentro de la empresa. |

### `vacante`

Vacantes publicadas por las empresas, con requisitos, modalidad y accesibilidad.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la vacante. |
| `empresa_id` | BIGINT | No | FK → empresa |  | Empresa que ofrece la vacante. |
| `reclutador_id` | BIGINT | No | FK → reclutador |  | Reclutador responsable. |
| `categoria_id` | SMALLINT | No | FK → categoria |  | Categoría o área laboral. |
| `modalidad_id` | SMALLINT | No | FK → modalidad |  | Modalidad de trabajo. |
| `jornada_id` | SMALLINT | No | FK → jornada |  | Jornada laboral. |
| `tipo_contrato_id` | SMALLINT | No | FK → tipo_contrato |  | Tipo de contrato. |
| `nivel_educativo_id` | SMALLINT | Sí | FK → nivel_educativo |  | Formación mínima requerida; nula si no se exige. |
| `municipio_id` | INTEGER | No | FK → municipio |  | Municipio del lugar de trabajo. |
| `titulo` | VARCHAR(120) | No |  |  | Título del puesto. |
| `descripcion` | VARCHAR(2000) | No |  |  | Descripción del puesto (máximo 2000 caracteres). |
| `plazas` | SMALLINT | No |  | 1 | Número de plazas disponibles. |
| `direccion` | VARCHAR(255) | Sí |  |  | Dirección del lugar de trabajo; obligatoria para modalidad presencial o híbrida (validado en el API). |
| `salario_min` | NUMERIC(10,2) | Sí |  |  | Salario mensual mínimo (MXN). |
| `salario_max` | NUMERIC(10,2) | Sí |  |  | Salario mensual máximo (MXN). |
| `mostrar_salario` | BOOLEAN | No |  | false | Indica si el salario se muestra a los candidatos. |
| `experiencia_anios` | SMALLINT | No |  | 0 | Años de experiencia solicitados. |
| `sin_condiciones_accesibilidad` | BOOLEAN | No |  | false | Declaración explícita de que el lugar no cuenta con condiciones de accesibilidad. |
| `notas_accesibilidad` | VARCHAR(500) | Sí |  |  | Notas adicionales sobre accesibilidad (máximo 500 caracteres). |
| `estado` | VARCHAR(12) | No |  | borrador | Estado: borrador, publicada, pausada, cerrada o suspendida. |
| `motivo_estado` | VARCHAR(255) | Sí |  |  | Motivo de la suspensión por el administrador. |
| `publicada_en` | TIMESTAMPTZ | Sí |  |  | Fecha de la primera publicación. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de creación. |
| `actualizado_en` | TIMESTAMPTZ | No |  | now() | Fecha de la última modificación. |

Restricciones CHECK: `ck_vacante_estado`, `ck_vacante_experiencia`, `ck_vacante_plazas`, `ck_vacante_salario`

### `vacante_habilidad`

Habilidades requeridas por la vacante (N:M), marcadas como obligatorias o deseables.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `vacante_id` | BIGINT | No | PK, FK → vacante |  | Vacante. |
| `habilidad_id` | INTEGER | No | PK, FK → habilidad |  | Habilidad requerida. |
| `obligatoria` | BOOLEAN | No |  | true | Verdadero si es obligatoria; falso si es deseable. |

### `vacante_ajuste`

Condiciones de accesibilidad y ajustes razonables que declara la vacante (N:M).

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `vacante_id` | BIGINT | No | PK, FK → vacante |  | Vacante. |
| `ajuste_id` | SMALLINT | No | PK, FK → ajuste |  | Ajuste o condición. |
| `tipo` | VARCHAR(15) | No |  |  | existente (el lugar ya cuenta con ella) o bajo_solicitud (la empresa puede ofrecerla). |

Restricciones CHECK: `ck_vacante_ajuste_tipo`

### `compatibilidad`

Índice de compatibilidad precalculado por par candidato–vacante; se recalcula al cambiar el CV o la vacante.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `candidato_id` | BIGINT | No | PK, FK → candidato |  | Candidato. |
| `vacante_id` | BIGINT | No | PK, FK → vacante |  | Vacante. |
| `puntaje_candidato` | SMALLINT | No |  |  | Índice que ve el candidato: 0.40·H + 0.30·A + 0.15·M + 0.15·F (0 a 100). |
| `puntaje_reclutador` | SMALLINT | No |  |  | Índice que ve el reclutador, sin el componente A: (0.40·H + 0.15·M + 0.15·F) / 0.70 (0 a 100). |
| `componente_h` | NUMERIC(4,3) | No |  |  | Componente de habilidades (0 a 1). |
| `componente_a` | NUMERIC(4,3) | No |  |  | Componente de accesibilidad (0 a 1). |
| `componente_m` | NUMERIC(4,3) | No |  |  | Componente de modalidad (0 a 1). |
| `componente_f` | NUMERIC(4,3) | No |  |  | Componente de formación (0 a 1). |
| `calculado_en` | TIMESTAMPTZ | No |  | now() | Fecha del último cálculo. |

Restricciones CHECK: `ck_compat_componentes`, `ck_compat_puntajes`

## Proceso de vinculación

### `postulacion`

Postulaciones de candidatos a vacantes; una por par candidato–vacante.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la postulación. |
| `candidato_id` | BIGINT | No | FK → candidato |  | Candidato que se postula. |
| `vacante_id` | BIGINT | No | FK → vacante |  | Vacante a la que se postula. |
| `estado` | VARCHAR(16) | No |  | postulada | Estado: postulada, en_revision, entrevista, aceptada, no_seleccionada o retirada. |
| `mensaje` | VARCHAR(500) | Sí |  |  | Mensaje opcional del candidato (máximo 500 caracteres). |
| `comparte_ajustes` | BOOLEAN | No |  | false | Consentimiento para mostrar sus necesidades de ajuste a la empresa. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de postulación. |
| `actualizado_en` | TIMESTAMPTZ | No |  | now() | Fecha del último cambio de estado. |

Únicas: `UNIQUE (candidato_id, vacante_id)` · Restricciones CHECK: `ck_postulacion_estado`

### `historial_postulacion`

Historial de cambios de estado de cada postulación.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del registro. |
| `postulacion_id` | BIGINT | No | FK → postulacion |  | Postulación. |
| `usuario_id` | BIGINT | Sí | FK → usuario |  | Usuario que realizó el cambio. |
| `estado_anterior` | VARCHAR(16) | Sí |  |  | Estado previo; nulo en el registro inicial. |
| `estado_nuevo` | VARCHAR(16) | No |  |  | Estado resultante. |
| `mensaje` | VARCHAR(500) | Sí |  |  | Mensaje del reclutador visible para el candidato. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha del cambio. |

### `observacion`

Observaciones internas del reclutador sobre una postulación; no visibles para el candidato.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la observación. |
| `postulacion_id` | BIGINT | No | FK → postulacion |  | Postulación observada. |
| `autor_id` | BIGINT | No | FK → reclutador |  | Reclutador que la registró. |
| `texto` | VARCHAR(1000) | No |  |  | Contenido de la observación. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de registro. |

### `horario_entrevista`

Horarios de entrevista publicados por el reclutador para una vacante.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del horario. |
| `vacante_id` | BIGINT | No | FK → vacante |  | Vacante a la que corresponde. |
| `reclutador_id` | BIGINT | No | FK → reclutador |  | Reclutador que conduce la entrevista. |
| `inicio` | TIMESTAMPTZ | No |  |  | Fecha y hora de inicio. |
| `duracion_min` | SMALLINT | No |  |  | Duración en minutos: 30, 45 o 60. |
| `liga` | VARCHAR(500) | No |  |  | Liga genérica de Google Meet o Microsoft Teams. |
| `estado` | VARCHAR(10) | No |  | libre | Estado: libre, agendado o cancelado. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha de publicación del horario. |

Restricciones CHECK: `ck_horario_duracion`, `ck_horario_estado`, `ck_horario_liga`

### `entrevista`

Entrevistas agendadas por los candidatos sobre un horario publicado.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador de la entrevista. |
| `horario_id` | BIGINT | No | FK → horario_entrevista |  | Horario reservado; solo una entrevista vigente por horario. |
| `postulacion_id` | BIGINT | No | FK → postulacion |  | Postulación a la que corresponde. |
| `estado` | VARCHAR(12) | No |  | agendada | Estado: agendada, realizada, no_asistio o cancelada. |
| `motivo_cancelacion` | VARCHAR(255) | Sí |  |  | Motivo de la cancelación. |
| `cancelada_por` | BIGINT | Sí | FK → usuario |  | Usuario que canceló la entrevista. |
| `recordatorio_en` | TIMESTAMPTZ | Sí |  |  | Fecha en que se envió el recordatorio de 24 h. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha en que se agendó. |

Restricciones CHECK: `ck_entrevista_estado`

## Reportes e incidencias

### `reporte`

Reportes (denuncias) de usuarios sobre una vacante, una empresa o un candidato; se gestionan como incidencias.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del reporte (folio). |
| `reportante_id` | BIGINT | No | FK → usuario |  | Usuario que reporta. |
| `motivo_reporte_id` | SMALLINT | No | FK → motivo_reporte |  | Motivo del reporte. |
| `vacante_id` | BIGINT | Sí | FK → vacante |  | Vacante reportada (si aplica). |
| `empresa_id` | BIGINT | Sí | FK → empresa |  | Empresa reportada (si aplica). |
| `candidato_id` | BIGINT | Sí | FK → candidato |  | Candidato reportado (si aplica). |
| `descripcion` | VARCHAR(500) | Sí |  |  | Descripción del reportante (máximo 500 caracteres). |
| `estado` | VARCHAR(12) | No |  | abierto | Estado: abierto, en_revision, resuelto o descartado. |
| `resolucion` | VARCHAR(1000) | Sí |  |  | Resolución del administrador; obligatoria al cerrar. |
| `accion` | VARCHAR(12) | Sí |  |  | Acción tomada: ninguna o suspension. |
| `atendido_por` | BIGINT | Sí | FK → usuario |  | Administrador que atendió el reporte. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha del reporte. |
| `cerrado_en` | TIMESTAMPTZ | Sí |  |  | Fecha de cierre. |

Restricciones CHECK: `ck_reporte_accion`, `ck_reporte_cierre`, `ck_reporte_estado`, `ck_reporte_objeto`

### `historial_reporte`

Seguimiento de cambios de estado de cada reporte.

| Campo | Tipo | Nulo | Llave | Defecto | Descripción |
|---|---|---|---|---|---|
| `id` | BIGINT (identidad) | No | PK |  | Identificador del registro. |
| `reporte_id` | BIGINT | No | FK → reporte |  | Reporte. |
| `usuario_id` | BIGINT | Sí | FK → usuario |  | Administrador que realizó el cambio. |
| `estado_anterior` | VARCHAR(12) | Sí |  |  | Estado previo. |
| `estado_nuevo` | VARCHAR(12) | No |  |  | Estado resultante. |
| `comentario` | VARCHAR(500) | Sí |  |  | Comentario del cambio. |
| `creado_en` | TIMESTAMPTZ | No |  | now() | Fecha del cambio. |
