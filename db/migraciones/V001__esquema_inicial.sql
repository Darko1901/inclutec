-- =====================================================================
-- IncluTec — Esquema de base de datos (PostgreSQL 16)
-- Plataforma web y móvil de vinculación laboral para personas con discapacidad
-- Convenciones: snake_case, nombres en español sin acentos, llaves primarias "id",
-- llaves foráneas "<tabla>_id", fechas en timestamptz (UTC), estados como VARCHAR + CHECK.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SEGURIDAD
-- ---------------------------------------------------------------------
CREATE TABLE rol (
    id          SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(20)  NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    CONSTRAINT ck_rol_nombre CHECK (nombre IN ('candidato', 'reclutador', 'administrador'))
);
COMMENT ON TABLE rol IS 'Roles de usuario de la plataforma.';
COMMENT ON COLUMN rol.id IS 'Identificador del rol.';
COMMENT ON COLUMN rol.nombre IS 'Nombre del rol: candidato, reclutador o administrador.';
COMMENT ON COLUMN rol.descripcion IS 'Descripción del alcance del rol.';

CREATE TABLE usuario (
    id               BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rol_id           SMALLINT     NOT NULL REFERENCES rol (id),
    correo           VARCHAR(254) NOT NULL UNIQUE,
    contrasena_hash  VARCHAR(255) NOT NULL,
    nombre           VARCHAR(80)  NOT NULL,
    apellidos        VARCHAR(120) NOT NULL,
    telefono         VARCHAR(10),
    estado           VARCHAR(12)  NOT NULL DEFAULT 'activo',
    motivo_estado    VARCHAR(255),
    acepto_aviso_en  TIMESTAMPTZ  NOT NULL,
    ultimo_acceso_en TIMESTAMPTZ,
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuario_estado CHECK (estado IN ('activo', 'suspendido', 'eliminado')),
    CONSTRAINT ck_usuario_telefono CHECK (telefono IS NULL OR telefono ~ '^[0-9]{10}$')
);
COMMENT ON TABLE usuario IS 'Cuentas de acceso de candidatos, reclutadores y administradores.';
COMMENT ON COLUMN usuario.id IS 'Identificador del usuario.';
COMMENT ON COLUMN usuario.rol_id IS 'Rol del usuario.';
COMMENT ON COLUMN usuario.correo IS 'Correo electrónico; se usa como nombre de usuario.';
COMMENT ON COLUMN usuario.contrasena_hash IS 'Hash bcrypt de la contraseña (cost ≥ 10).';
COMMENT ON COLUMN usuario.nombre IS 'Nombre(s) de la persona.';
COMMENT ON COLUMN usuario.apellidos IS 'Apellidos de la persona.';
COMMENT ON COLUMN usuario.telefono IS 'Teléfono a 10 dígitos.';
COMMENT ON COLUMN usuario.estado IS 'Estado de la cuenta: activo, suspendido o eliminado (baja lógica).';
COMMENT ON COLUMN usuario.motivo_estado IS 'Motivo de la suspensión o baja.';
COMMENT ON COLUMN usuario.acepto_aviso_en IS 'Fecha en que aceptó el aviso de privacidad.';
COMMENT ON COLUMN usuario.ultimo_acceso_en IS 'Fecha del último inicio de sesión.';
COMMENT ON COLUMN usuario.creado_en IS 'Fecha de registro.';
COMMENT ON COLUMN usuario.actualizado_en IS 'Fecha de la última modificación.';

CREATE TABLE token_recuperacion (
    id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id   BIGINT      NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    codigo_hash  VARCHAR(255) NOT NULL,
    intentos     SMALLINT    NOT NULL DEFAULT 0,
    expira_en    TIMESTAMPTZ NOT NULL,
    usado_en     TIMESTAMPTZ,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_token_intentos CHECK (intentos BETWEEN 0 AND 5)
);
COMMENT ON TABLE token_recuperacion IS 'Códigos de 6 dígitos para recuperar la contraseña.';
COMMENT ON COLUMN token_recuperacion.id IS 'Identificador del código.';
COMMENT ON COLUMN token_recuperacion.usuario_id IS 'Usuario que solicitó la recuperación.';
COMMENT ON COLUMN token_recuperacion.codigo_hash IS 'Hash del código enviado por correo.';
COMMENT ON COLUMN token_recuperacion.intentos IS 'Intentos de validación realizados (máximo 5).';
COMMENT ON COLUMN token_recuperacion.expira_en IS 'Vencimiento del código (15 minutos después de emitirse).';
COMMENT ON COLUMN token_recuperacion.usado_en IS 'Fecha en que se usó el código; nulo si no se ha usado.';
COMMENT ON COLUMN token_recuperacion.creado_en IS 'Fecha de emisión.';

CREATE TABLE dispositivo (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT       NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    expo_push_token VARCHAR(255) NOT NULL UNIQUE,
    plataforma      VARCHAR(10)  NOT NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_dispositivo_plataforma CHECK (plataforma IN ('android', 'ios'))
);
COMMENT ON TABLE dispositivo IS 'Dispositivos móviles registrados para recibir notificaciones push.';
COMMENT ON COLUMN dispositivo.id IS 'Identificador del dispositivo.';
COMMENT ON COLUMN dispositivo.usuario_id IS 'Usuario dueño del dispositivo.';
COMMENT ON COLUMN dispositivo.expo_push_token IS 'Token de Expo Push Notifications.';
COMMENT ON COLUMN dispositivo.plataforma IS 'Sistema operativo: android o ios.';
COMMENT ON COLUMN dispositivo.creado_en IS 'Fecha de registro del dispositivo.';

CREATE TABLE bitacora (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT      REFERENCES usuario (id) ON DELETE SET NULL,
    accion          VARCHAR(20) NOT NULL,
    entidad         VARCHAR(40) NOT NULL,
    entidad_id      BIGINT,
    valor_anterior  JSONB,
    valor_nuevo     JSONB,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_bitacora_accion CHECK (accion IN ('crear', 'editar', 'eliminar', 'validar', 'rechazar', 'suspender', 'reactivar', 'cambiar_estado'))
);
COMMENT ON TABLE bitacora IS 'Registro de auditoría de las acciones administrativas y cambios de estado.';
COMMENT ON COLUMN bitacora.id IS 'Identificador del registro.';
COMMENT ON COLUMN bitacora.usuario_id IS 'Usuario que realizó la acción.';
COMMENT ON COLUMN bitacora.accion IS 'Tipo de acción realizada.';
COMMENT ON COLUMN bitacora.entidad IS 'Tabla afectada.';
COMMENT ON COLUMN bitacora.entidad_id IS 'Identificador del registro afectado.';
COMMENT ON COLUMN bitacora.valor_anterior IS 'Valores previos al cambio (sin datos sensibles).';
COMMENT ON COLUMN bitacora.valor_nuevo IS 'Valores posteriores al cambio (sin datos sensibles).';
COMMENT ON COLUMN bitacora.creado_en IS 'Fecha y hora de la acción.';

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS
-- ---------------------------------------------------------------------
CREATE TABLE entidad_federativa (
    id     SMALLINT    PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE
);
COMMENT ON TABLE entidad_federativa IS 'Catálogo de entidades federativas (clave INEGI).';
COMMENT ON COLUMN entidad_federativa.id IS 'Clave INEGI de la entidad.';
COMMENT ON COLUMN entidad_federativa.nombre IS 'Nombre de la entidad.';

CREATE TABLE municipio (
    id                    INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entidad_federativa_id SMALLINT    NOT NULL REFERENCES entidad_federativa (id),
    clave                 VARCHAR(3)  NOT NULL,
    nombre                VARCHAR(80) NOT NULL,
    CONSTRAINT uq_municipio UNIQUE (entidad_federativa_id, clave)
);
COMMENT ON TABLE municipio IS 'Catálogo de municipios (clave INEGI).';
COMMENT ON COLUMN municipio.id IS 'Identificador del municipio.';
COMMENT ON COLUMN municipio.entidad_federativa_id IS 'Entidad federativa a la que pertenece.';
COMMENT ON COLUMN municipio.clave IS 'Clave INEGI del municipio dentro de la entidad.';
COMMENT ON COLUMN municipio.nombre IS 'Nombre del municipio.';

CREATE TABLE modalidad (
    id     SMALLINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    activo BOOLEAN     NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE modalidad IS 'Catálogo de modalidades de trabajo (presencial, remoto, híbrido).';
COMMENT ON COLUMN modalidad.id IS 'Identificador de la modalidad.';
COMMENT ON COLUMN modalidad.nombre IS 'Nombre de la modalidad.';
COMMENT ON COLUMN modalidad.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE jornada (
    id     SMALLINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    activo BOOLEAN     NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE jornada IS 'Catálogo de jornadas laborales (tiempo completo, medio tiempo, por horas, etc.).';
COMMENT ON COLUMN jornada.id IS 'Identificador de la jornada.';
COMMENT ON COLUMN jornada.nombre IS 'Nombre de la jornada.';
COMMENT ON COLUMN jornada.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE tipo_contrato (
    id     SMALLINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    activo BOOLEAN     NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE tipo_contrato IS 'Catálogo de tipos de contrato (indefinido, temporal, por proyecto, prácticas).';
COMMENT ON COLUMN tipo_contrato.id IS 'Identificador del tipo de contrato.';
COMMENT ON COLUMN tipo_contrato.nombre IS 'Nombre del tipo de contrato.';
COMMENT ON COLUMN tipo_contrato.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE nivel_educativo (
    id     SMALLINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    orden  SMALLINT    NOT NULL UNIQUE,
    activo BOOLEAN     NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE nivel_educativo IS 'Catálogo de niveles educativos ordenados de menor a mayor.';
COMMENT ON COLUMN nivel_educativo.id IS 'Identificador del nivel.';
COMMENT ON COLUMN nivel_educativo.nombre IS 'Nombre del nivel (primaria, secundaria, bachillerato, técnico, licenciatura, posgrado).';
COMMENT ON COLUMN nivel_educativo.orden IS 'Posición jerárquica; permite comparar si se cumple la formación mínima.';
COMMENT ON COLUMN nivel_educativo.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE sector (
    id     SMALLINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN     NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE sector IS 'Catálogo de sectores económicos de las empresas.';
COMMENT ON COLUMN sector.id IS 'Identificador del sector.';
COMMENT ON COLUMN sector.nombre IS 'Nombre del sector.';
COMMENT ON COLUMN sector.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE tamano_empresa (
    id     SMALLINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    rango  VARCHAR(40) NOT NULL,
    activo BOOLEAN     NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE tamano_empresa IS 'Catálogo de tamaños de empresa.';
COMMENT ON COLUMN tamano_empresa.id IS 'Identificador del tamaño.';
COMMENT ON COLUMN tamano_empresa.nombre IS 'Nombre del tamaño (micro, pequeña, mediana, grande).';
COMMENT ON COLUMN tamano_empresa.rango IS 'Rango de número de trabajadores.';
COMMENT ON COLUMN tamano_empresa.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE categoria (
    id          SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(80)  NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activo      BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE categoria IS 'Categorías o áreas laborales de las vacantes y de las habilidades.';
COMMENT ON COLUMN categoria.id IS 'Identificador de la categoría.';
COMMENT ON COLUMN categoria.nombre IS 'Nombre de la categoría (p. ej. Tecnologías de la información).';
COMMENT ON COLUMN categoria.descripcion IS 'Descripción de la categoría.';
COMMENT ON COLUMN categoria.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE habilidad (
    id           INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id SMALLINT    NOT NULL REFERENCES categoria (id),
    nombre       VARCHAR(80) NOT NULL UNIQUE,
    activo       BOOLEAN     NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE habilidad IS 'Catálogo de habilidades que registran los candidatos y requieren las vacantes.';
COMMENT ON COLUMN habilidad.id IS 'Identificador de la habilidad.';
COMMENT ON COLUMN habilidad.categoria_id IS 'Categoría a la que pertenece la habilidad.';
COMMENT ON COLUMN habilidad.nombre IS 'Nombre de la habilidad.';
COMMENT ON COLUMN habilidad.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE ajuste (
    id          SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria   VARCHAR(25)  NOT NULL,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ajuste_categoria CHECK (categoria IN ('movilidad', 'visual', 'auditiva', 'comunicacion', 'cognitiva_psicosocial', 'general'))
);
COMMENT ON TABLE ajuste IS 'Catálogo único de ajustes razonables y condiciones de accesibilidad; lo usan tanto las necesidades del candidato como las condiciones de la vacante.';
COMMENT ON COLUMN ajuste.id IS 'Identificador del ajuste.';
COMMENT ON COLUMN ajuste.categoria IS 'Categoría: movilidad, visual, auditiva, comunicacion, cognitiva_psicosocial o general.';
COMMENT ON COLUMN ajuste.nombre IS 'Nombre del ajuste (p. ej. Intérprete de Lengua de Señas Mexicana).';
COMMENT ON COLUMN ajuste.descripcion IS 'Descripción en lenguaje claro.';
COMMENT ON COLUMN ajuste.activo IS 'Indica si se ofrece en nuevos registros.';

CREATE TABLE motivo_reporte (
    id       SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre   VARCHAR(100) NOT NULL UNIQUE,
    aplica_a VARCHAR(10)  NOT NULL,
    activo   BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_motivo_aplica CHECK (aplica_a IN ('vacante', 'empresa', 'candidato', 'todos'))
);
COMMENT ON TABLE motivo_reporte IS 'Catálogo de motivos para reportar vacantes, empresas o candidatos.';
COMMENT ON COLUMN motivo_reporte.id IS 'Identificador del motivo.';
COMMENT ON COLUMN motivo_reporte.nombre IS 'Nombre del motivo (p. ej. Discriminación, Vacante engañosa).';
COMMENT ON COLUMN motivo_reporte.aplica_a IS 'Tipo de elemento al que aplica el motivo.';
COMMENT ON COLUMN motivo_reporte.activo IS 'Indica si se ofrece en nuevos reportes.';

-- ---------------------------------------------------------------------
-- 3. CANDIDATO
-- ---------------------------------------------------------------------
CREATE TABLE candidato (
    usuario_id                   BIGINT       PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
    municipio_id                 INTEGER      REFERENCES municipio (id),
    jornada_id                   SMALLINT     REFERENCES jornada (id),
    resumen                      VARCHAR(500),
    foto_url                     VARCHAR(500),
    disponible_reubicacion       BOOLEAN      NOT NULL DEFAULT FALSE,
    consentimiento_sensibles_en  TIMESTAMPTZ,
    compartir_ajustes            VARCHAR(10)  NOT NULL DEFAULT 'preguntar',
    nota_ajustes                 VARCHAR(300),
    completitud                  SMALLINT     NOT NULL DEFAULT 0,
    actualizado_en               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_candidato_compartir CHECK (compartir_ajustes IN ('preguntar', 'siempre', 'nunca')),
    CONSTRAINT ck_candidato_completitud CHECK (completitud BETWEEN 0 AND 100)
);
COMMENT ON TABLE candidato IS 'Perfil del candidato (extensión 1:1 de usuario con rol candidato).';
COMMENT ON COLUMN candidato.usuario_id IS 'Usuario al que pertenece el perfil.';
COMMENT ON COLUMN candidato.municipio_id IS 'Municipio de residencia.';
COMMENT ON COLUMN candidato.jornada_id IS 'Jornada deseada.';
COMMENT ON COLUMN candidato.resumen IS 'Resumen profesional (máximo 500 caracteres).';
COMMENT ON COLUMN candidato.foto_url IS 'URL de la fotografía (opcional).';
COMMENT ON COLUMN candidato.disponible_reubicacion IS 'Indica si está dispuesto a cambiar de residencia.';
COMMENT ON COLUMN candidato.consentimiento_sensibles_en IS 'Fecha del consentimiento expreso para tratar necesidades de ajuste; nulo si no lo otorgó.';
COMMENT ON COLUMN candidato.compartir_ajustes IS 'Preferencia para compartir necesidades de ajuste: preguntar, siempre o nunca.';
COMMENT ON COLUMN candidato.nota_ajustes IS 'Nota libre sobre sus necesidades de ajuste (máximo 300 caracteres).';
COMMENT ON COLUMN candidato.completitud IS 'Porcentaje de completitud del perfil (0 a 100).';
COMMENT ON COLUMN candidato.actualizado_en IS 'Fecha de la última modificación del perfil.';

CREATE TABLE candidato_modalidad (
    candidato_id BIGINT   NOT NULL REFERENCES candidato (usuario_id) ON DELETE CASCADE,
    modalidad_id SMALLINT NOT NULL REFERENCES modalidad (id),
    PRIMARY KEY (candidato_id, modalidad_id)
);
COMMENT ON TABLE candidato_modalidad IS 'Modalidades de trabajo que prefiere el candidato (N:M).';
COMMENT ON COLUMN candidato_modalidad.candidato_id IS 'Candidato.';
COMMENT ON COLUMN candidato_modalidad.modalidad_id IS 'Modalidad preferida.';

CREATE TABLE candidato_categoria (
    candidato_id BIGINT   NOT NULL REFERENCES candidato (usuario_id) ON DELETE CASCADE,
    categoria_id SMALLINT NOT NULL REFERENCES categoria (id),
    PRIMARY KEY (candidato_id, categoria_id)
);
COMMENT ON TABLE candidato_categoria IS 'Categorías laborales de interés del candidato (N:M).';
COMMENT ON COLUMN candidato_categoria.candidato_id IS 'Candidato.';
COMMENT ON COLUMN candidato_categoria.categoria_id IS 'Categoría de interés.';

CREATE TABLE experiencia (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidato_id BIGINT       NOT NULL REFERENCES candidato (usuario_id) ON DELETE CASCADE,
    puesto       VARCHAR(100) NOT NULL,
    empresa      VARCHAR(120) NOT NULL,
    fecha_inicio DATE         NOT NULL,
    fecha_fin    DATE,
    actual       BOOLEAN      NOT NULL DEFAULT FALSE,
    descripcion  VARCHAR(500),
    CONSTRAINT ck_experiencia_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT ck_experiencia_actual CHECK (NOT (actual AND fecha_fin IS NOT NULL))
);
COMMENT ON TABLE experiencia IS 'Experiencia laboral del candidato.';
COMMENT ON COLUMN experiencia.id IS 'Identificador de la experiencia.';
COMMENT ON COLUMN experiencia.candidato_id IS 'Candidato al que pertenece.';
COMMENT ON COLUMN experiencia.puesto IS 'Puesto desempeñado.';
COMMENT ON COLUMN experiencia.empresa IS 'Nombre de la empresa (texto libre).';
COMMENT ON COLUMN experiencia.fecha_inicio IS 'Fecha de inicio.';
COMMENT ON COLUMN experiencia.fecha_fin IS 'Fecha de término; nula si es el empleo actual.';
COMMENT ON COLUMN experiencia.actual IS 'Indica si es su empleo actual.';
COMMENT ON COLUMN experiencia.descripcion IS 'Descripción de funciones (máximo 500 caracteres).';

CREATE TABLE formacion (
    id                 BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidato_id       BIGINT       NOT NULL REFERENCES candidato (usuario_id) ON DELETE CASCADE,
    nivel_educativo_id SMALLINT     NOT NULL REFERENCES nivel_educativo (id),
    institucion        VARCHAR(150) NOT NULL,
    carrera            VARCHAR(150),
    estado             VARCHAR(10)  NOT NULL,
    fecha_inicio       DATE,
    fecha_fin          DATE,
    CONSTRAINT ck_formacion_estado CHECK (estado IN ('concluida', 'en_curso', 'trunca')),
    CONSTRAINT ck_formacion_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);
COMMENT ON TABLE formacion IS 'Formación académica del candidato.';
COMMENT ON COLUMN formacion.id IS 'Identificador de la formación.';
COMMENT ON COLUMN formacion.candidato_id IS 'Candidato al que pertenece.';
COMMENT ON COLUMN formacion.nivel_educativo_id IS 'Nivel educativo.';
COMMENT ON COLUMN formacion.institucion IS 'Institución educativa.';
COMMENT ON COLUMN formacion.carrera IS 'Carrera o programa (si aplica).';
COMMENT ON COLUMN formacion.estado IS 'Estado: concluida, en_curso o trunca.';
COMMENT ON COLUMN formacion.fecha_inicio IS 'Fecha de inicio.';
COMMENT ON COLUMN formacion.fecha_fin IS 'Fecha de término.';

CREATE TABLE candidato_habilidad (
    candidato_id BIGINT      NOT NULL REFERENCES candidato (usuario_id) ON DELETE CASCADE,
    habilidad_id INTEGER     NOT NULL REFERENCES habilidad (id),
    nivel        VARCHAR(12) NOT NULL,
    PRIMARY KEY (candidato_id, habilidad_id),
    CONSTRAINT ck_candidato_habilidad_nivel CHECK (nivel IN ('basico', 'intermedio', 'avanzado'))
);
COMMENT ON TABLE candidato_habilidad IS 'Habilidades del candidato con su nivel (N:M; máximo 30 por candidato, validado en el API).';
COMMENT ON COLUMN candidato_habilidad.candidato_id IS 'Candidato.';
COMMENT ON COLUMN candidato_habilidad.habilidad_id IS 'Habilidad.';
COMMENT ON COLUMN candidato_habilidad.nivel IS 'Nivel de dominio: basico, intermedio o avanzado.';

CREATE TABLE candidato_necesidad (
    candidato_id BIGINT   NOT NULL REFERENCES candidato (usuario_id) ON DELETE CASCADE,
    ajuste_id    SMALLINT NOT NULL REFERENCES ajuste (id),
    PRIMARY KEY (candidato_id, ajuste_id)
);
COMMENT ON TABLE candidato_necesidad IS 'Necesidades de ajuste del candidato (N:M). Dato sensible: requiere consentimiento expreso.';
COMMENT ON COLUMN candidato_necesidad.candidato_id IS 'Candidato.';
COMMENT ON COLUMN candidato_necesidad.ajuste_id IS 'Ajuste que necesita.';

-- ---------------------------------------------------------------------
-- 4. EMPRESA Y VACANTES
-- ---------------------------------------------------------------------
CREATE TABLE empresa (
    id                 BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razon_social       VARCHAR(200) NOT NULL,
    nombre_comercial   VARCHAR(150) NOT NULL,
    rfc                VARCHAR(13)  NOT NULL UNIQUE,
    sector_id          SMALLINT     NOT NULL REFERENCES sector (id),
    tamano_empresa_id  SMALLINT     NOT NULL REFERENCES tamano_empresa (id),
    municipio_id       INTEGER      NOT NULL REFERENCES municipio (id),
    direccion          VARCHAR(255),
    descripcion        VARCHAR(1000),
    sitio_web          VARCHAR(255),
    logo_url           VARCHAR(500),
    practicas_inclusion VARCHAR(1000),
    documento_url      VARCHAR(500),
    estado             VARCHAR(12)  NOT NULL DEFAULT 'pendiente',
    motivo_estado      VARCHAR(255),
    validada_por       BIGINT       REFERENCES usuario (id),
    validada_en        TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_empresa_estado CHECK (estado IN ('pendiente', 'validada', 'rechazada', 'suspendida')),
    CONSTRAINT ck_empresa_rfc CHECK (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$')
);
COMMENT ON TABLE empresa IS 'Organizaciones que publican vacantes; requieren validación del administrador.';
COMMENT ON COLUMN empresa.id IS 'Identificador de la empresa.';
COMMENT ON COLUMN empresa.razon_social IS 'Razón social registrada ante el SAT.';
COMMENT ON COLUMN empresa.nombre_comercial IS 'Nombre comercial visible para los candidatos.';
COMMENT ON COLUMN empresa.rfc IS 'RFC de 12 (persona moral) o 13 (persona física) caracteres; único.';
COMMENT ON COLUMN empresa.sector_id IS 'Sector económico.';
COMMENT ON COLUMN empresa.tamano_empresa_id IS 'Tamaño de la empresa.';
COMMENT ON COLUMN empresa.municipio_id IS 'Municipio del domicilio principal.';
COMMENT ON COLUMN empresa.direccion IS 'Domicilio principal.';
COMMENT ON COLUMN empresa.descripcion IS 'Descripción de la organización (máximo 1000 caracteres).';
COMMENT ON COLUMN empresa.sitio_web IS 'Sitio web.';
COMMENT ON COLUMN empresa.logo_url IS 'URL del logotipo.';
COMMENT ON COLUMN empresa.practicas_inclusion IS 'Compromisos y prácticas de inclusión declarados.';
COMMENT ON COLUMN empresa.documento_url IS 'URL de la constancia de situación fiscal (PDF) para validación.';
COMMENT ON COLUMN empresa.estado IS 'Estado: pendiente, validada, rechazada o suspendida.';
COMMENT ON COLUMN empresa.motivo_estado IS 'Motivo del rechazo o de la suspensión.';
COMMENT ON COLUMN empresa.validada_por IS 'Administrador que validó o rechazó la empresa.';
COMMENT ON COLUMN empresa.validada_en IS 'Fecha de la validación o el rechazo.';
COMMENT ON COLUMN empresa.creado_en IS 'Fecha de registro.';
COMMENT ON COLUMN empresa.actualizado_en IS 'Fecha de la última modificación.';

CREATE TABLE reclutador (
    usuario_id BIGINT       PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
    empresa_id BIGINT       NOT NULL REFERENCES empresa (id),
    puesto     VARCHAR(100) NOT NULL
);
COMMENT ON TABLE reclutador IS 'Perfil del reclutador (extensión 1:1 de usuario con rol reclutador) y su empresa.';
COMMENT ON COLUMN reclutador.usuario_id IS 'Usuario al que pertenece el perfil.';
COMMENT ON COLUMN reclutador.empresa_id IS 'Empresa que representa.';
COMMENT ON COLUMN reclutador.puesto IS 'Puesto del reclutador dentro de la empresa.';

CREATE TABLE vacante (
    id                     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id             BIGINT        NOT NULL REFERENCES empresa (id),
    reclutador_id          BIGINT        NOT NULL REFERENCES reclutador (usuario_id),
    categoria_id           SMALLINT      NOT NULL REFERENCES categoria (id),
    modalidad_id           SMALLINT      NOT NULL REFERENCES modalidad (id),
    jornada_id             SMALLINT      NOT NULL REFERENCES jornada (id),
    tipo_contrato_id       SMALLINT      NOT NULL REFERENCES tipo_contrato (id),
    nivel_educativo_id     SMALLINT      REFERENCES nivel_educativo (id),
    municipio_id           INTEGER       NOT NULL REFERENCES municipio (id),
    titulo                 VARCHAR(120)  NOT NULL,
    descripcion            VARCHAR(2000) NOT NULL,
    plazas                 SMALLINT      NOT NULL DEFAULT 1,
    direccion              VARCHAR(255),
    salario_min            NUMERIC(10,2),
    salario_max            NUMERIC(10,2),
    mostrar_salario        BOOLEAN       NOT NULL DEFAULT FALSE,
    experiencia_anios      SMALLINT      NOT NULL DEFAULT 0,
    sin_condiciones_accesibilidad BOOLEAN NOT NULL DEFAULT FALSE,
    notas_accesibilidad    VARCHAR(500),
    estado                 VARCHAR(12)   NOT NULL DEFAULT 'borrador',
    motivo_estado          VARCHAR(255),
    publicada_en           TIMESTAMPTZ,
    creado_en              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_vacante_estado CHECK (estado IN ('borrador', 'publicada', 'pausada', 'cerrada', 'suspendida')),
    CONSTRAINT ck_vacante_plazas CHECK (plazas >= 1),
    CONSTRAINT ck_vacante_salario CHECK (salario_min IS NULL OR salario_max IS NULL OR salario_max >= salario_min),
    CONSTRAINT ck_vacante_experiencia CHECK (experiencia_anios BETWEEN 0 AND 50)
);
COMMENT ON TABLE vacante IS 'Vacantes publicadas por las empresas, con requisitos, modalidad y accesibilidad.';
COMMENT ON COLUMN vacante.id IS 'Identificador de la vacante.';
COMMENT ON COLUMN vacante.empresa_id IS 'Empresa que ofrece la vacante.';
COMMENT ON COLUMN vacante.reclutador_id IS 'Reclutador responsable.';
COMMENT ON COLUMN vacante.categoria_id IS 'Categoría o área laboral.';
COMMENT ON COLUMN vacante.modalidad_id IS 'Modalidad de trabajo.';
COMMENT ON COLUMN vacante.jornada_id IS 'Jornada laboral.';
COMMENT ON COLUMN vacante.tipo_contrato_id IS 'Tipo de contrato.';
COMMENT ON COLUMN vacante.nivel_educativo_id IS 'Formación mínima requerida; nula si no se exige.';
COMMENT ON COLUMN vacante.municipio_id IS 'Municipio del lugar de trabajo.';
COMMENT ON COLUMN vacante.titulo IS 'Título del puesto.';
COMMENT ON COLUMN vacante.descripcion IS 'Descripción del puesto (máximo 2000 caracteres).';
COMMENT ON COLUMN vacante.plazas IS 'Número de plazas disponibles.';
COMMENT ON COLUMN vacante.direccion IS 'Dirección del lugar de trabajo; obligatoria para modalidad presencial o híbrida (validado en el API).';
COMMENT ON COLUMN vacante.salario_min IS 'Salario mensual mínimo (MXN).';
COMMENT ON COLUMN vacante.salario_max IS 'Salario mensual máximo (MXN).';
COMMENT ON COLUMN vacante.mostrar_salario IS 'Indica si el salario se muestra a los candidatos.';
COMMENT ON COLUMN vacante.experiencia_anios IS 'Años de experiencia solicitados.';
COMMENT ON COLUMN vacante.sin_condiciones_accesibilidad IS 'Declaración explícita de que el lugar no cuenta con condiciones de accesibilidad.';
COMMENT ON COLUMN vacante.notas_accesibilidad IS 'Notas adicionales sobre accesibilidad (máximo 500 caracteres).';
COMMENT ON COLUMN vacante.estado IS 'Estado: borrador, publicada, pausada, cerrada o suspendida.';
COMMENT ON COLUMN vacante.motivo_estado IS 'Motivo de la suspensión por el administrador.';
COMMENT ON COLUMN vacante.publicada_en IS 'Fecha de la primera publicación.';
COMMENT ON COLUMN vacante.creado_en IS 'Fecha de creación.';
COMMENT ON COLUMN vacante.actualizado_en IS 'Fecha de la última modificación.';

CREATE TABLE vacante_habilidad (
    vacante_id   BIGINT  NOT NULL REFERENCES vacante (id) ON DELETE CASCADE,
    habilidad_id INTEGER NOT NULL REFERENCES habilidad (id),
    obligatoria  BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (vacante_id, habilidad_id)
);
COMMENT ON TABLE vacante_habilidad IS 'Habilidades requeridas por la vacante (N:M), marcadas como obligatorias o deseables.';
COMMENT ON COLUMN vacante_habilidad.vacante_id IS 'Vacante.';
COMMENT ON COLUMN vacante_habilidad.habilidad_id IS 'Habilidad requerida.';
COMMENT ON COLUMN vacante_habilidad.obligatoria IS 'Verdadero si es obligatoria; falso si es deseable.';

CREATE TABLE vacante_ajuste (
    vacante_id BIGINT      NOT NULL REFERENCES vacante (id) ON DELETE CASCADE,
    ajuste_id  SMALLINT    NOT NULL REFERENCES ajuste (id),
    tipo       VARCHAR(15) NOT NULL,
    PRIMARY KEY (vacante_id, ajuste_id),
    CONSTRAINT ck_vacante_ajuste_tipo CHECK (tipo IN ('existente', 'bajo_solicitud'))
);
COMMENT ON TABLE vacante_ajuste IS 'Condiciones de accesibilidad y ajustes razonables que declara la vacante (N:M).';
COMMENT ON COLUMN vacante_ajuste.vacante_id IS 'Vacante.';
COMMENT ON COLUMN vacante_ajuste.ajuste_id IS 'Ajuste o condición.';
COMMENT ON COLUMN vacante_ajuste.tipo IS 'existente (el lugar ya cuenta con ella) o bajo_solicitud (la empresa puede ofrecerla).';

CREATE TABLE compatibilidad (
    candidato_id       BIGINT       NOT NULL REFERENCES candidato (usuario_id) ON DELETE CASCADE,
    vacante_id         BIGINT       NOT NULL REFERENCES vacante (id) ON DELETE CASCADE,
    puntaje_candidato  SMALLINT     NOT NULL,
    puntaje_reclutador SMALLINT     NOT NULL,
    componente_h       NUMERIC(4,3) NOT NULL,
    componente_a       NUMERIC(4,3) NOT NULL,
    componente_m       NUMERIC(4,3) NOT NULL,
    componente_f       NUMERIC(4,3) NOT NULL,
    calculado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (candidato_id, vacante_id),
    CONSTRAINT ck_compat_puntajes CHECK (puntaje_candidato BETWEEN 0 AND 100 AND puntaje_reclutador BETWEEN 0 AND 100),
    CONSTRAINT ck_compat_componentes CHECK (
        componente_h BETWEEN 0 AND 1 AND componente_a BETWEEN 0 AND 1 AND
        componente_m BETWEEN 0 AND 1 AND componente_f BETWEEN 0 AND 1)
);
COMMENT ON TABLE compatibilidad IS 'Índice de compatibilidad precalculado por par candidato–vacante; se recalcula al cambiar el CV o la vacante.';
COMMENT ON COLUMN compatibilidad.candidato_id IS 'Candidato.';
COMMENT ON COLUMN compatibilidad.vacante_id IS 'Vacante.';
COMMENT ON COLUMN compatibilidad.puntaje_candidato IS 'Índice que ve el candidato: 0.40·H + 0.30·A + 0.15·M + 0.15·F (0 a 100).';
COMMENT ON COLUMN compatibilidad.puntaje_reclutador IS 'Índice que ve el reclutador, sin el componente A: (0.40·H + 0.15·M + 0.15·F) / 0.70 (0 a 100).';
COMMENT ON COLUMN compatibilidad.componente_h IS 'Componente de habilidades (0 a 1).';
COMMENT ON COLUMN compatibilidad.componente_a IS 'Componente de accesibilidad (0 a 1).';
COMMENT ON COLUMN compatibilidad.componente_m IS 'Componente de modalidad (0 a 1).';
COMMENT ON COLUMN compatibilidad.componente_f IS 'Componente de formación (0 a 1).';
COMMENT ON COLUMN compatibilidad.calculado_en IS 'Fecha del último cálculo.';

-- ---------------------------------------------------------------------
-- 5. PROCESO DE VINCULACIÓN
-- ---------------------------------------------------------------------
CREATE TABLE postulacion (
    id                BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidato_id      BIGINT       NOT NULL REFERENCES candidato (usuario_id),
    vacante_id        BIGINT       NOT NULL REFERENCES vacante (id),
    estado            VARCHAR(16)  NOT NULL DEFAULT 'postulada',
    mensaje           VARCHAR(500),
    comparte_ajustes  BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_postulacion UNIQUE (candidato_id, vacante_id),
    CONSTRAINT ck_postulacion_estado CHECK (estado IN ('postulada', 'en_revision', 'entrevista', 'aceptada', 'no_seleccionada', 'retirada'))
);
COMMENT ON TABLE postulacion IS 'Postulaciones de candidatos a vacantes; una por par candidato–vacante.';
COMMENT ON COLUMN postulacion.id IS 'Identificador de la postulación.';
COMMENT ON COLUMN postulacion.candidato_id IS 'Candidato que se postula.';
COMMENT ON COLUMN postulacion.vacante_id IS 'Vacante a la que se postula.';
COMMENT ON COLUMN postulacion.estado IS 'Estado: postulada, en_revision, entrevista, aceptada, no_seleccionada o retirada.';
COMMENT ON COLUMN postulacion.mensaje IS 'Mensaje opcional del candidato (máximo 500 caracteres).';
COMMENT ON COLUMN postulacion.comparte_ajustes IS 'Consentimiento para mostrar sus necesidades de ajuste a la empresa.';
COMMENT ON COLUMN postulacion.creado_en IS 'Fecha de postulación.';
COMMENT ON COLUMN postulacion.actualizado_en IS 'Fecha del último cambio de estado.';

CREATE TABLE historial_postulacion (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    postulacion_id  BIGINT      NOT NULL REFERENCES postulacion (id) ON DELETE CASCADE,
    usuario_id      BIGINT      REFERENCES usuario (id) ON DELETE SET NULL,
    estado_anterior VARCHAR(16),
    estado_nuevo    VARCHAR(16) NOT NULL,
    mensaje         VARCHAR(500),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE historial_postulacion IS 'Historial de cambios de estado de cada postulación.';
COMMENT ON COLUMN historial_postulacion.id IS 'Identificador del registro.';
COMMENT ON COLUMN historial_postulacion.postulacion_id IS 'Postulación.';
COMMENT ON COLUMN historial_postulacion.usuario_id IS 'Usuario que realizó el cambio.';
COMMENT ON COLUMN historial_postulacion.estado_anterior IS 'Estado previo; nulo en el registro inicial.';
COMMENT ON COLUMN historial_postulacion.estado_nuevo IS 'Estado resultante.';
COMMENT ON COLUMN historial_postulacion.mensaje IS 'Mensaje del reclutador visible para el candidato.';
COMMENT ON COLUMN historial_postulacion.creado_en IS 'Fecha del cambio.';

CREATE TABLE observacion (
    id             BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    postulacion_id BIGINT        NOT NULL REFERENCES postulacion (id) ON DELETE CASCADE,
    autor_id       BIGINT        NOT NULL REFERENCES reclutador (usuario_id),
    texto          VARCHAR(1000) NOT NULL,
    creado_en      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE observacion IS 'Observaciones internas del reclutador sobre una postulación; no visibles para el candidato.';
COMMENT ON COLUMN observacion.id IS 'Identificador de la observación.';
COMMENT ON COLUMN observacion.postulacion_id IS 'Postulación observada.';
COMMENT ON COLUMN observacion.autor_id IS 'Reclutador que la registró.';
COMMENT ON COLUMN observacion.texto IS 'Contenido de la observación.';
COMMENT ON COLUMN observacion.creado_en IS 'Fecha de registro.';

CREATE TABLE horario_entrevista (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vacante_id    BIGINT       NOT NULL REFERENCES vacante (id) ON DELETE CASCADE,
    reclutador_id BIGINT       NOT NULL REFERENCES reclutador (usuario_id),
    inicio        TIMESTAMPTZ  NOT NULL,
    duracion_min  SMALLINT     NOT NULL,
    liga          VARCHAR(500) NOT NULL,
    estado        VARCHAR(10)  NOT NULL DEFAULT 'libre',
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_horario_duracion CHECK (duracion_min IN (30, 45, 60)),
    CONSTRAINT ck_horario_estado CHECK (estado IN ('libre', 'agendado', 'cancelado')),
    CONSTRAINT ck_horario_liga CHECK (liga ~ '^https://(meet\.google\.com|teams\.microsoft\.com|teams\.live\.com)/')
);
COMMENT ON TABLE horario_entrevista IS 'Horarios de entrevista publicados por el reclutador para una vacante.';
COMMENT ON COLUMN horario_entrevista.id IS 'Identificador del horario.';
COMMENT ON COLUMN horario_entrevista.vacante_id IS 'Vacante a la que corresponde.';
COMMENT ON COLUMN horario_entrevista.reclutador_id IS 'Reclutador que conduce la entrevista.';
COMMENT ON COLUMN horario_entrevista.inicio IS 'Fecha y hora de inicio.';
COMMENT ON COLUMN horario_entrevista.duracion_min IS 'Duración en minutos: 30, 45 o 60.';
COMMENT ON COLUMN horario_entrevista.liga IS 'Liga genérica de Google Meet o Microsoft Teams.';
COMMENT ON COLUMN horario_entrevista.estado IS 'Estado: libre, agendado o cancelado.';
COMMENT ON COLUMN horario_entrevista.creado_en IS 'Fecha de publicación del horario.';

CREATE TABLE entrevista (
    id                 BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    horario_id         BIGINT       NOT NULL REFERENCES horario_entrevista (id),
    postulacion_id     BIGINT       NOT NULL REFERENCES postulacion (id) ON DELETE CASCADE,
    estado             VARCHAR(12)  NOT NULL DEFAULT 'agendada',
    motivo_cancelacion VARCHAR(255),
    cancelada_por      BIGINT       REFERENCES usuario (id),
    recordatorio_en    TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_entrevista_estado CHECK (estado IN ('agendada', 'realizada', 'no_asistio', 'cancelada'))
);
COMMENT ON TABLE entrevista IS 'Entrevistas agendadas por los candidatos sobre un horario publicado.';
COMMENT ON COLUMN entrevista.id IS 'Identificador de la entrevista.';
COMMENT ON COLUMN entrevista.horario_id IS 'Horario reservado; solo una entrevista vigente por horario.';
COMMENT ON COLUMN entrevista.postulacion_id IS 'Postulación a la que corresponde.';
COMMENT ON COLUMN entrevista.estado IS 'Estado: agendada, realizada, no_asistio o cancelada.';
COMMENT ON COLUMN entrevista.motivo_cancelacion IS 'Motivo de la cancelación.';
COMMENT ON COLUMN entrevista.cancelada_por IS 'Usuario que canceló la entrevista.';
COMMENT ON COLUMN entrevista.recordatorio_en IS 'Fecha en que se envió el recordatorio de 24 h.';
COMMENT ON COLUMN entrevista.creado_en IS 'Fecha en que se agendó.';

-- Un horario solo puede tener una entrevista vigente (evita doble reservación)
CREATE UNIQUE INDEX uq_entrevista_horario_vigente ON entrevista (horario_id) WHERE estado <> 'cancelada';

-- ---------------------------------------------------------------------
-- 6. COMUNICACIÓN Y MODERACIÓN
-- ---------------------------------------------------------------------
CREATE TABLE notificacion (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT       NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    tipo            VARCHAR(30)  NOT NULL,
    titulo          VARCHAR(120) NOT NULL,
    mensaje         VARCHAR(300) NOT NULL,
    referencia_tipo VARCHAR(20),
    referencia_id   BIGINT,
    leida           BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_notificacion_tipo CHECK (tipo IN ('cambio_estado', 'nueva_postulacion', 'entrevista_agendada', 'entrevista_cancelada', 'recordatorio_entrevista', 'empresa_validada', 'empresa_rechazada', 'vacante_suspendida', 'reporte_resuelto'))
);
COMMENT ON TABLE notificacion IS 'Notificaciones dentro de la aplicación; también se envían por push y correo según las preferencias.';
COMMENT ON COLUMN notificacion.id IS 'Identificador de la notificación.';
COMMENT ON COLUMN notificacion.usuario_id IS 'Destinatario.';
COMMENT ON COLUMN notificacion.tipo IS 'Tipo de evento que la originó.';
COMMENT ON COLUMN notificacion.titulo IS 'Título breve.';
COMMENT ON COLUMN notificacion.mensaje IS 'Texto de la notificación (sin datos sensibles).';
COMMENT ON COLUMN notificacion.referencia_tipo IS 'Tipo de recurso relacionado (postulacion, entrevista, empresa, reporte).';
COMMENT ON COLUMN notificacion.referencia_id IS 'Identificador del recurso relacionado, para navegar a él.';
COMMENT ON COLUMN notificacion.leida IS 'Indica si el usuario ya la leyó.';
COMMENT ON COLUMN notificacion.creado_en IS 'Fecha de creación.';

CREATE TABLE preferencia_notificacion (
    usuario_id BIGINT      NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    tipo       VARCHAR(30) NOT NULL,
    push       BOOLEAN     NOT NULL DEFAULT TRUE,
    correo     BOOLEAN     NOT NULL DEFAULT TRUE,
    PRIMARY KEY (usuario_id, tipo)
);
COMMENT ON TABLE preferencia_notificacion IS 'Preferencias de canal (push y correo) por tipo de notificación.';
COMMENT ON COLUMN preferencia_notificacion.usuario_id IS 'Usuario.';
COMMENT ON COLUMN preferencia_notificacion.tipo IS 'Tipo de notificación.';
COMMENT ON COLUMN preferencia_notificacion.push IS 'Recibir por notificación push.';
COMMENT ON COLUMN preferencia_notificacion.correo IS 'Recibir por correo electrónico.';

CREATE TABLE reporte (
    id                     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reportante_id          BIGINT        NOT NULL REFERENCES usuario (id),
    motivo_reporte_id      SMALLINT      NOT NULL REFERENCES motivo_reporte (id),
    vacante_id             BIGINT        REFERENCES vacante (id),
    empresa_id             BIGINT        REFERENCES empresa (id),
    candidato_id           BIGINT        REFERENCES candidato (usuario_id),
    descripcion            VARCHAR(500),
    estado                 VARCHAR(12)   NOT NULL DEFAULT 'abierto',
    resolucion             VARCHAR(1000),
    accion                 VARCHAR(12),
    atendido_por           BIGINT        REFERENCES usuario (id),
    creado_en              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    cerrado_en             TIMESTAMPTZ,
    CONSTRAINT ck_reporte_objeto CHECK (num_nonnulls(vacante_id, empresa_id, candidato_id) = 1),
    CONSTRAINT ck_reporte_estado CHECK (estado IN ('abierto', 'en_revision', 'resuelto', 'descartado')),
    CONSTRAINT ck_reporte_accion CHECK (accion IS NULL OR accion IN ('ninguna', 'suspension')),
    CONSTRAINT ck_reporte_cierre CHECK (estado NOT IN ('resuelto', 'descartado') OR (resolucion IS NOT NULL AND cerrado_en IS NOT NULL))
);
COMMENT ON TABLE reporte IS 'Reportes (denuncias) de usuarios sobre una vacante, una empresa o un candidato; se gestionan como incidencias.';
COMMENT ON COLUMN reporte.id IS 'Identificador del reporte (folio).';
COMMENT ON COLUMN reporte.reportante_id IS 'Usuario que reporta.';
COMMENT ON COLUMN reporte.motivo_reporte_id IS 'Motivo del reporte.';
COMMENT ON COLUMN reporte.vacante_id IS 'Vacante reportada (si aplica).';
COMMENT ON COLUMN reporte.empresa_id IS 'Empresa reportada (si aplica).';
COMMENT ON COLUMN reporte.candidato_id IS 'Candidato reportado (si aplica).';
COMMENT ON COLUMN reporte.descripcion IS 'Descripción del reportante (máximo 500 caracteres).';
COMMENT ON COLUMN reporte.estado IS 'Estado: abierto, en_revision, resuelto o descartado.';
COMMENT ON COLUMN reporte.resolucion IS 'Resolución del administrador; obligatoria al cerrar.';
COMMENT ON COLUMN reporte.accion IS 'Acción tomada: ninguna o suspension.';
COMMENT ON COLUMN reporte.atendido_por IS 'Administrador que atendió el reporte.';
COMMENT ON COLUMN reporte.creado_en IS 'Fecha del reporte.';
COMMENT ON COLUMN reporte.cerrado_en IS 'Fecha de cierre.';

CREATE TABLE historial_reporte (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporte_id      BIGINT       NOT NULL REFERENCES reporte (id) ON DELETE CASCADE,
    usuario_id      BIGINT       REFERENCES usuario (id) ON DELETE SET NULL,
    estado_anterior VARCHAR(12),
    estado_nuevo    VARCHAR(12)  NOT NULL,
    comentario      VARCHAR(500),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE historial_reporte IS 'Seguimiento de cambios de estado de cada reporte.';
COMMENT ON COLUMN historial_reporte.id IS 'Identificador del registro.';
COMMENT ON COLUMN historial_reporte.reporte_id IS 'Reporte.';
COMMENT ON COLUMN historial_reporte.usuario_id IS 'Administrador que realizó el cambio.';
COMMENT ON COLUMN historial_reporte.estado_anterior IS 'Estado previo.';
COMMENT ON COLUMN historial_reporte.estado_nuevo IS 'Estado resultante.';
COMMENT ON COLUMN historial_reporte.comentario IS 'Comentario del cambio.';
COMMENT ON COLUMN historial_reporte.creado_en IS 'Fecha del cambio.';

-- ---------------------------------------------------------------------
-- 7. ÍNDICES DE APOYO A CONSULTAS FRECUENTES
-- ---------------------------------------------------------------------
CREATE INDEX ix_usuario_rol ON usuario (rol_id);
CREATE INDEX ix_municipio_entidad ON municipio (entidad_federativa_id);
CREATE INDEX ix_habilidad_categoria ON habilidad (categoria_id);
CREATE INDEX ix_experiencia_candidato ON experiencia (candidato_id);
CREATE INDEX ix_formacion_candidato ON formacion (candidato_id);
CREATE INDEX ix_empresa_estado ON empresa (estado);
CREATE INDEX ix_reclutador_empresa ON reclutador (empresa_id);
CREATE INDEX ix_vacante_empresa ON vacante (empresa_id);
CREATE INDEX ix_vacante_busqueda ON vacante (estado, categoria_id, modalidad_id, municipio_id);
CREATE INDEX ix_compatibilidad_vacante ON compatibilidad (vacante_id, puntaje_reclutador DESC);
CREATE INDEX ix_compatibilidad_candidato ON compatibilidad (candidato_id, puntaje_candidato DESC);
CREATE INDEX ix_postulacion_vacante ON postulacion (vacante_id, estado);
CREATE INDEX ix_historial_postulacion ON historial_postulacion (postulacion_id, creado_en);
CREATE INDEX ix_horario_vacante ON horario_entrevista (vacante_id, inicio);
CREATE INDEX ix_notificacion_usuario ON notificacion (usuario_id, leida, creado_en DESC);
CREATE INDEX ix_reporte_estado ON reporte (estado, creado_en);
CREATE INDEX ix_bitacora_entidad ON bitacora (entidad, entidad_id);
