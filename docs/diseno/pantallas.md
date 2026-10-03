# IncluTec — Guía de mockups

**Proyecto:** IncluTec · Estadía ISC · UPQ
**Entrega del análisis y diseño:** 28 de octubre de 2026
**Fuentes:** `Requerimientos_IncluTec_Combinado.xlsx` (qué hace cada pantalla) y el modelo de datos `schema.sql` (cómo se llama cada campo). Si hay duda sobre lo que debe mostrar una pantalla, mandan el xlsx; si hay duda sobre un campo, manda la sección 3 de esta guía.
**Versión 2 (2 oct 2026):** se agregan los nombres de campos de la base de datos, los valores de los catálogos, los estados y los datos de ejemplo.

---

## 1. Contexto en 1 minuto

IncluTec vincula a **personas con discapacidad que buscan empleo** con **empresas que ofrecen vacantes**. La plataforma toma en cuenta:

- competencias
- modalidad de trabajo
- condiciones de accesibilidad del lugar
- ajustes razonables

Son dos productos:

| Producto | Tecnología | Quién lo usa |
|---|---|---|
| App móvil | React Native | **Candidato** y **Reclutador** (la misma app; la navegación cambia según el rol) |
| Panel web | Laravel | **Administrador** |

Dos ideas que deben notarse en el diseño:

1. **El candidato nunca registra un diagnóstico ni su tipo de discapacidad.** Registra **necesidades de ajuste**, por ejemplo: "uso silla de ruedas → necesito acceso con rampa", "necesito intérprete de LSM", "necesito que el software sea compatible con lector de pantalla".
2. **Toda vacante declara su accesibilidad:** las condiciones con las que ya cuenta el lugar y los ajustes que la empresa puede ofrecer si se los piden. El candidato ve un **porcentaje de compatibilidad** con cada vacante.

---

## 2. Reglas generales (aplican a TODAS las pantallas)

### Herramienta y tamaños
- **Figma**, en un solo archivo compartido con una página por módulo: `Móvil – Compartidas`, `Móvil – Candidato`, `Móvil – Reclutador`, `Web – Admin`.
- Frame móvil: **360 × 800** (Android). Frame web: **1440 × 1024**.
- Cada frame se nombra con su código: `CAN-03 Mi perfil`.
- Exporten en **PNG a 2x** con el mismo nombre, por ejemplo `CAN-03_Mi-perfil.png`. Así los insertamos en el documento en orden.

### Accesibilidad (es una plataforma para personas con discapacidad: esto se evalúa)
- **Contraste:** mínimo 4.5:1 para texto normal y 3:1 para texto grande e íconos. Revísenlo con el plugin *Stark* o *Contrast* de Figma.
- **Texto:** cuerpo mínimo de 16 px; nada de texto gris claro sobre blanco.
- **Botones y áreas táctiles:** mínimo 48 × 48 px.
- **Nunca usen solo el color** para comunicar algo. Los estados llevan texto e ícono, por ejemplo ✓ "Aceptada", no solo un punto verde.
- **Cada campo de formulario lleva etiqueta visible arriba**, no solo placeholder, y un mensaje de error debajo que diga cómo corregirlo.
- **Íconos siempre acompañados de texto**, sobre todo los de accesibilidad (♿ Rampa, 🧏 Intérprete LSM, etc.).
- **Lenguaje claro.** "Postularme" en lugar de "Enviar solicitud de aplicación".

### Paleta sugerida (ya cumple contraste sobre blanco)
Es una propuesta; se puede cambiar, siempre que se mantenga el contraste.

| Uso | Color |
|---|---|
| Primario (botones, encabezados) | `#1E40AF` |
| Secundario | `#0F766E` |
| Éxito | `#15803D` |
| Advertencia | `#B45309` |
| Error | `#B91C1C` |
| Texto | `#111827` |
| Texto secundario / bordes | `#6B7280` |
| Fondo | `#FFFFFF` / `#F3F4F6` |

### Estados que hay que dibujar
En las pantallas marcadas con ⚠️ dibujen, además de la vista normal, estas variantes chicas:
- **Vacío** (no hay resultados o datos)
- **Error** (de validación o de conexión)
- **Confirmación** (modal de "¿Seguro que…?")

### Navegación de la app móvil (barra inferior)
| Candidato | Reclutador |
|---|---|
| Vacantes (CAN-01) | Mis vacantes (REC-02) |
| Postulaciones (CAN-05) | Agenda (REC-06) |
| Empresas (CAN-07) | Notificaciones (MOV-04) |
| Notificaciones (MOV-04) | Organización (REC-01) |
| Perfil (CAN-03 → CAN-04) | |

### Navegación del panel web
Menú lateral fijo con estas secciones:
- Dashboard
- Usuarios
- Empresas
- Vacantes
- Categorías y habilidades
- Catálogos
- Reportes

En la parte superior va una barra con el nombre del administrador y el botón "Cerrar sesión".

---

## 3. Datos: nombres de campos, catálogos y estados

El modelo de datos ya está cerrado. Los mockups deben usar **exactamente** estos campos, porque en el sprint 2 el frontend se programa a partir de ellos y en el sprint 4 el API los devuelve con estos mismos nombres. Si una pantalla necesita un dato que no aparece aquí, avísenle a Ricardo antes de dibujarlo.

### 3.1 Cómo leer las líneas "Campos (BD)"

En cada pantalla de la sección 5 hay una línea **Campos (BD)** con el formato `tabla.campo`. Por ejemplo, `usuario.correo` es el campo "Correo" de la tabla `usuario`. El texto que ve el usuario en la pantalla lo deciden ustedes (en español y lenguaje claro); el nombre técnico es el que va en la nota del frame de Figma.

### 3.2 Límites de caracteres

En los campos de texto largo dibujen el contador "0 / 500" debajo del campo.

| Campo | Máximo |
|---|---|
| `candidato.resumen` (resumen profesional) | 500 |
| `candidato.nota_ajustes` (nota sobre necesidades de ajuste) | 300 |
| `experiencia.descripcion` | 500 |
| `empresa.descripcion` · `empresa.practicas_inclusion` | 1000 |
| `vacante.titulo` | 120 |
| `vacante.descripcion` | 2000 |
| `vacante.notas_accesibilidad` | 500 |
| `postulacion.mensaje` (mensaje al postularse) | 500 |
| `historial_postulacion.mensaje` (mensaje del reclutador al cambiar estado) | 500 |
| `observacion.texto` (observación interna) | 1000 |
| `reporte.descripcion` | 500 |
| `usuario.telefono` | 10 dígitos exactos |
| `empresa.rfc` | 12 o 13 caracteres |

### 3.3 Valores de los catálogos

Usen estos valores en las listas desplegables, casillas y chips. Son los que vienen cargados en la base de datos de prueba.

| Catálogo (tabla) | Valores |
|---|---|
| Modalidad (`modalidad`) | Presencial · Remoto · Híbrido |
| Jornada (`jornada`) | Tiempo completo · Medio tiempo · Por horas · Fines de semana |
| Tipo de contrato (`tipo_contrato`) | Indefinido · Temporal · Por proyecto · Prácticas profesionales |
| Nivel educativo (`nivel_educativo`) | Primaria · Secundaria · Bachillerato · Técnico superior universitario · Licenciatura · Posgrado |
| Sector (`sector`) | Manufactura · Comercio · Servicios profesionales · Tecnologías de la información · Salud · Educación · Gobierno |
| Tamaño de empresa (`tamano_empresa`) | Micro (1–10) · Pequeña (11–50) · Mediana (51–250) · Grande (más de 250) |
| Categoría laboral (`categoria`) | Tecnologías de la información · Administración · Atención a clientes · Diseño y comunicación · Producción y logística |
| Habilidades (`habilidad`), ejemplos | Python · JavaScript · SQL · Soporte técnico · Redes · Excel · Contabilidad · Facturación electrónica · Atención telefónica · Manejo de CRM · Comunicación escrita · Diseño gráfico · Redacción · Control de inventarios · Manejo de ERP |
| Nivel de habilidad (`candidato_habilidad.nivel`) | Básico · Intermedio · Avanzado |
| Estado de formación (`formacion.estado`) | Concluida · En curso · Trunca |
| Motivos de reporte (`motivo_reporte`) | Discriminación · Información falsa · Vacante engañosa o fraudulenta · Solicitud de pago al candidato · Contenido inapropiado · Otro |
| Duración de entrevista (`horario_entrevista.duracion_min`) | 30 · 45 · 60 minutos |

**Ajustes y condiciones de accesibilidad (`ajuste`)**: es un solo catálogo que se usa en dos lugares: las necesidades del candidato (CAN-03) y la accesibilidad de la vacante (REC-03). Agrúpenlo siempre por categoría:

| Categoría | Ajustes |
|---|---|
| Movilidad | Acceso con rampa · Elevador · Baño accesible |
| Visual | Software compatible con lector de pantalla · Documentos en formato accesible |
| Auditiva | Intérprete de Lengua de Señas Mexicana · Comunicación por escrito · Alertas visuales |
| Comunicación | Subtitulado en reuniones |
| Cognitiva y psicosocial | Instrucciones por escrito y paso a paso · Espacio de trabajo tranquilo |
| General | Horario flexible · Trabajo remoto |

### 3.4 Estados: texto en pantalla y valor en la BD

Cada estado se muestra con **texto + ícono** (nunca solo color). La columna "Valor" es lo que guarda la BD.

| Entidad | Texto en pantalla → valor |
|---|---|
| Postulación | Postulada → `postulada` · En revisión → `en_revision` · Entrevista → `entrevista` · Aceptada → `aceptada` · No seleccionada → `no_seleccionada` · Retirada → `retirada` |
| Vacante | Borrador → `borrador` · Publicada → `publicada` · Pausada → `pausada` · Cerrada → `cerrada` · Suspendida → `suspendida` |
| Empresa | Pendiente de validación → `pendiente` · Validada → `validada` · Rechazada → `rechazada` · Suspendida → `suspendida` |
| Entrevista | Agendada → `agendada` · Realizada → `realizada` · No asistió → `no_asistio` · Cancelada → `cancelada` |
| Horario de entrevista | Libre → `libre` · Agendado → `agendado` · Cancelado → `cancelado` |
| Reporte | Abierto → `abierto` · En revisión → `en_revision` · Resuelto → `resuelto` · Descartado → `descartado` |
| Usuario | Activo → `activo` · Suspendido → `suspendido` · Eliminado → `eliminado` |
| Ajuste en vacante (`vacante_ajuste.tipo`) | "El lugar cuenta con" → `existente` · "Podemos ofrecer bajo solicitud" → `bajo_solicitud` |
| Compartir ajustes (`candidato.compartir_ajustes`) | Preguntarme en cada postulación → `preguntar` · Siempre → `siempre` · Nunca → `nunca` |

### 3.5 Datos de ejemplo (úsenlos en TODOS los mockups)

Para que las pantallas cuenten la misma historia y coincidan con el reporte, usen estos datos. Son los mismos de la base de datos de prueba.

| Quién / qué | Datos |
|---|---|
| **Candidata** | Mariana López García · mariana.lopez@correo.mx · 442 765 4321 · El Marqués, Querétaro · TSU en Tecnologías de la Información (UTEQ, concluida) · Auxiliar de soporte técnico en Servicios Integrales del Bajío (feb 2023 – jun 2025) · Habilidades: Soporte técnico (avanzado), Redes (intermedio), Comunicación escrita (avanzado), Excel (básico) · Necesidades de ajuste: Acceso con rampa, Baño accesible · Prefiere Remoto e Híbrido · Perfil al 90 % |
| **Segundo candidato** | Jorge Ramírez Soto · Querétaro · Ingeniería en Sistemas Computacionales (UPQ, en curso) · Python, SQL, Excel · No compartió necesidades de ajuste |
| **Reclutadora** | Laura Hernández Ruiz · Coordinadora de Recursos Humanos · rh@tecnoqro.mx |
| **Empresa** | TecnoQro (Tecnologías Querétaro S.A. de C.V.) · RFC TQU150312AB1 · Tecnologías de la información · Mediana · Av. Constituyentes 100, Querétaro · Validada · Prácticas de inclusión: "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica." |
| **Vacante** | Técnico de soporte de TI · Tecnologías de la información · Híbrido · Tiempo completo · Indefinido · 2 plazas · $14,000 – $18,000 mensuales (se muestra) · 1 año de experiencia · Formación mínima: TSU · Obligatorias: Soporte técnico, Redes, SQL, Comunicación escrita · Deseables: JavaScript, Excel · El lugar cuenta con: Acceso con rampa, Baño accesible · Bajo solicitud: Horario flexible |
| **Compatibilidad de Mariana** | **88 %** para ella · **83 %** para la reclutadora · Desglose: 3 de 4 obligatorias (le falta SQL) y 1 de 2 deseables · 2 de 2 necesidades cubiertas · modalidad coincide · formación cumple |
| **Postulación de Mariana** | Estado: Entrevista · Mensaje: "Me interesa mucho el puesto; tengo experiencia en soporte." · Sí compartió sus ajustes |
| **Entrevista** | En 3 días, 45 minutos · https://meet.google.com/abc-defg-hij |
| **Administrador** | Admin IncluTec · admin@inclutec.mx |

---

## 4. Reparto sugerido

| Integrante | Pantallas | Total |
|---|---|---|
| Compañero A | MOV-00 a MOV-04 + CAN-01 a CAN-07 | 12 |
| Compañero B | REC-01 a REC-06 + WEB-01 a WEB-08 | 14 |

Recomendación: **antes de repartir**, hagan juntos una pantalla de cada tipo (CAN-01 y WEB-03) para fijar estilos: botones, tarjetas, tablas y campos. Luego los guardan como **componentes de Figma**, así todo queda consistente.

---

## 5. Pantallas

### 5.1 Móvil — Compartidas

#### MOV-00 · Splash
- Logo de IncluTec centrado y nombre debajo.
- Indicador de carga discreto.
- *Nota:* aquí la app revisa si ya hay sesión y manda al usuario a su pantalla principal o al login.

#### MOV-01 · Inicio de sesión ⚠️
- Logo.
- Campos: **Correo**, **Contraseña** (con botón para mostrar u ocultar).
- Botón **Iniciar sesión**, deshabilitado hasta que ambos campos sean válidos.
- Enlaces: "¿Olvidaste tu contraseña?" (→ MOV-03) y "Crear cuenta" (→ MOV-02).
- Error: "Correo o contraseña incorrectos" y "Tu cuenta está suspendida".
- **Campos (BD):** `usuario.correo`, contraseña (se compara contra `usuario.contrasena_hash`; nunca se muestra).

#### MOV-02 · Registro de cuenta ⚠️
Tres pasos. Dibujen cada uno como frame aparte (`MOV-02a`, `MOV-02b`, `MOV-02c`).
- **Paso 1 – Tipo de cuenta:** dos tarjetas grandes, "Busco empleo" (candidato) y "Represento a una empresa" (reclutador).
- **Paso 2a – Candidato:**
  - Nombre(s), apellidos, correo, teléfono, municipio/estado, contraseña y confirmar contraseña.
- **Paso 2b – Reclutador:**
  - Sección "Tus datos": nombre, puesto, correo, teléfono, contraseña.
  - Sección "Tu empresa": razón social, nombre comercial, RFC, sector (lista), tamaño (lista), municipio/estado.
- **Paso 3 – Privacidad:**
  - Casilla "Acepto el aviso de privacidad", con enlace para leerlo.
  - Solo para candidato, una segunda casilla: "Autorizo el tratamiento de mis necesidades de ajuste para recomendarme vacantes" y un texto corto que explique por qué se pide.
- Botón **Crear cuenta**. Error: "Este correo ya está registrado".
- **Campos (BD):** candidato → `usuario.nombre`, `usuario.apellidos`, `usuario.correo`, `usuario.telefono`, `candidato.municipio_id` (entidad → municipio); reclutador → `usuario.*`, `reclutador.puesto`, `empresa.razon_social`, `empresa.nombre_comercial`, `empresa.rfc`, `empresa.sector_id`, `empresa.tamano_empresa_id`, `empresa.municipio_id`; privacidad → `usuario.acepto_aviso_en`, `candidato.consentimiento_sensibles_en`.

#### MOV-03 · Recuperar contraseña
Dos pasos en frames separados.
- **Paso 1:** campo de correo, botón **Enviar código** y mensaje "Si el correo existe, te enviamos un código".
- **Paso 2:**
  - Código de 6 dígitos (6 casillas), nueva contraseña y confirmar contraseña.
  - Enlace "Reenviar código (en 60 s)".
  - Botón **Guardar**.
- **Campos (BD):** `usuario.correo`; el código vive en `token_recuperacion` (vence en 15 min, máximo 5 intentos).

#### MOV-04 · Notificaciones ⚠️
- Lista de notificaciones: ícono del tipo, título, mensaje corto y fecha. Las no leídas llevan fondo resaltado y la etiqueta "Nueva".
- Botón "Marcar todas como leídas".
- Ícono de engrane → modal de **Preferencias**, con interruptores de push y correo por tipo de aviso.
- Ejemplos de notificaciones:
  - "Tu postulación a Técnico de soporte de TI pasó a Entrevista"
  - "Tienes una entrevista mañana a las 10:00"
  - "Tu empresa fue validada"
- Vacío: "No tienes notificaciones".
- **Campos (BD):** `notificacion.tipo`, `titulo`, `mensaje`, `leida`, `creado_en`; preferencias → `preferencia_notificacion.tipo`, `push`, `correo`.

### 5.2 Móvil — Candidato

#### CAN-01 · Vacantes (inicio del candidato) ⚠️
- Buscador arriba y botón **Filtros** (con contador de filtros activos).
- Chip destacado: **"Solo las que cubren mis necesidades"**.
- Subtítulo "Recomendadas para ti".
- **Tarjeta de vacante:**
  - Puesto.
  - Empresa con ✓ "Empresa validada".
  - Modalidad y ubicación.
  - **Compatibilidad: 88 %** (en número, no solo una barra).
  - 2 o 3 íconos de accesibilidad con texto.
- **Panel de filtros** (frame aparte, `CAN-01b`):
  - Modalidad, categoría, municipio, jornada, salario mínimo y compatibilidad mínima (deslizador).
  - Ajustes de accesibilidad como casillas agrupadas: movilidad, visual, auditiva, comunicación, cognitiva, general.
  - Botones "Limpiar" y "Aplicar".
- Aviso si el perfil está incompleto: "Completa tu perfil para recibir mejores recomendaciones" → CAN-03.
- Vacío: "No encontramos vacantes con estos filtros".
- **Campos (BD):** tarjeta → `vacante.titulo`, `empresa.nombre_comercial` + `empresa.estado` (validada), `modalidad.nombre`, `municipio.nombre`, `compatibilidad.puntaje_candidato`, iconos desde `vacante_ajuste`; filtros → `modalidad`, `categoria`, `municipio`, `jornada`, `vacante.salario_min`, `ajuste`.

#### CAN-02 · Detalle de vacante ⚠️
- **Encabezado:** puesto, empresa (enlace a CAN-07), ubicación y fecha de publicación.
- **Tarjeta de compatibilidad (88 %) con desglose:**
  - "Habilidades: 3 de 4 obligatorias ✓ · te falta: SQL"
  - "Tus necesidades de ajuste: 2 de 2 cubiertas ✓"
  - "Modalidad: coincide ✓"
  - "Formación: cumple ✓"
- **Secciones:**
  - Descripción.
  - Requisitos: habilidades obligatorias y deseables, formación, experiencia.
  - Condiciones: jornada, contrato, salario si se publica.
  - **Accesibilidad**, dividida en "El lugar cuenta con" y "La empresa puede ofrecer bajo solicitud".
- Botón fijo abajo: **Postularme**.
- **Modal de postulación:**
  - Mensaje opcional.
  - Pregunta "¿Compartir tus necesidades de ajuste con esta empresa?" (Sí / No).
  - Botón **Confirmar**.
- Botón deshabilitado con explicación si el perfil está incompleto.
- Menú ⋮ → **Reportar vacante**. Es un modal con el motivo en una lista y una descripción.
- **Campos (BD):** `vacante.titulo`, `descripcion`, `plazas`, `salario_min`, `salario_max` (solo si `mostrar_salario`), `experiencia_anios`, `publicada_en`, `jornada`, `tipo_contrato`, `nivel_educativo` (mínimo), `vacante_habilidad` (con `obligatoria`), `vacante_ajuste` (con `tipo`), `notas_accesibilidad`; desglose → `compatibilidad.componente_h/a/m/f`; postulación → `postulacion.mensaje`, `postulacion.comparte_ajustes`; reporte → `reporte.motivo_reporte_id`, `reporte.descripcion`.

#### CAN-03 · Mi perfil
- Foto, nombre y **barra de completitud** ("Tu perfil está al 90 % · Falta: foto").
- Secciones que se pueden desplegar:
  - **Datos personales:** nombre, apellidos, teléfono, municipio, resumen profesional.
  - **Preferencias laborales:** modalidades de interés, categorías de interés, jornada, disponibilidad para reubicarse.
  - **Necesidades de ajuste** (la más importante de la pantalla):
    - Casillas agrupadas por categoría. Ejemplos: acceso con rampa, baño accesible, intérprete de LSM, software compatible con lector de pantalla, instrucciones por escrito, horario flexible, trabajo remoto.
    - Nota libre.
    - Interruptor "Compartir mis necesidades con las empresas a las que me postule".
    - Texto aclaratorio: "No te pedimos diagnóstico. Solo lo que necesitas para trabajar cómodo(a)".
- Botón a **Mi CV** (CAN-04).
- Opciones de cuenta: cambiar contraseña, cerrar sesión y **Eliminar mi cuenta** (con doble confirmación).
- **Campos (BD):** `usuario.nombre`, `apellidos`, `telefono`; `candidato.foto_url`, `municipio_id`, `resumen`, `jornada_id`, `disponible_reubicacion`, `completitud`; `candidato_modalidad`, `candidato_categoria`; `candidato_necesidad` (lista de `ajuste`), `candidato.nota_ajustes`, `candidato.compartir_ajustes`.

#### CAN-04 · Mi CV ⚠️
- Tres pestañas: **Experiencia · Formación · Habilidades**.
- **Experiencia:**
  - Lista de tarjetas con puesto, empresa y fechas; botón "+ Agregar".
  - Formulario: puesto, empresa, fecha de inicio, fecha de fin o casilla "Trabajo aquí actualmente", descripción.
- **Formación:**
  - Lista de tarjetas y "+ Agregar".
  - Formulario: nivel educativo, institución, carrera y estado (concluida / en curso / trunca), con fechas.
- **Habilidades:**
  - Buscador con autocompletado.
  - Chips de habilidades con su nivel (básico, intermedio, avanzado) y botón para quitar.
  - Contador "12 de 30".
- Botón "Vista previa de mi CV" (cómo lo ve la empresa).
- Dibujen la lista y el formulario de al menos una pestaña.
- **Campos (BD):** experiencia → `experiencia.puesto`, `empresa`, `fecha_inicio`, `fecha_fin`, `actual`, `descripcion`; formación → `formacion.nivel_educativo_id`, `institucion`, `carrera`, `estado`, `fecha_inicio`, `fecha_fin`; habilidades → `candidato_habilidad.habilidad_id`, `nivel`.

#### CAN-05 · Mis postulaciones ⚠️
- Pestañas **Activas / Finalizadas**, más un filtro por estado.
- **Tarjeta:** puesto, empresa, fecha y **estado con ícono y texto**.
- Los estados posibles son: Postulada · En revisión · Entrevista · Aceptada · No seleccionada · Retirada.
- Vacío: "Aún no te has postulado" y botón "Ver vacantes".
- **Campos (BD):** `vacante.titulo`, `empresa.nombre_comercial`, `postulacion.estado`, `postulacion.creado_en`.

#### CAN-06 · Detalle de postulación y entrevista ⚠️
- Encabezado con la vacante y la empresa.
- **Línea de tiempo** de estados, con fecha y el mensaje del reclutador cuando lo haya.
- Si el estado es "Entrevista" y aún no agenda, mostrar la sección **"Elige un horario"**: lista de horarios por día, cada uno con fecha, hora y duración, y el botón **Agendar**.
- **Entrevista agendada:** tarjeta con fecha, hora, duración, liga de Meet/Teams y los botones "Abrir liga", "Copiar" y "Cancelar entrevista" (con la aclaración "hasta 24 h antes").
- Botón **Retirar postulación** (con confirmación).
- Error: "Ese horario acaba de ser tomado, elige otro".
- **Campos (BD):** línea de tiempo → `historial_postulacion.estado_nuevo`, `mensaje`, `creado_en`; horarios → `horario_entrevista.inicio`, `duracion_min`, `liga`, `estado`; entrevista → `entrevista.estado`, `motivo_cancelacion`.

#### CAN-07 · Empresas ⚠️
- **Directorio:** buscador, filtro por sector y lista de tarjetas con logo, nombre, sector y número de vacantes.
- **Ficha de empresa** (frame `CAN-07b`):
  - Logo, nombre, sector, tamaño y ubicación.
  - Descripción.
  - **Prácticas de inclusión.**
  - Lista de vacantes activas.
  - Menú ⋮ → "Reportar empresa".
- **Campos (BD):** `empresa.logo_url`, `nombre_comercial`, `sector`, `tamano_empresa`, `municipio`, `descripcion`, `sitio_web`, `practicas_inclusion`, y sus vacantes con `estado = publicada`.

### 5.3 Móvil — Reclutador

#### REC-01 · Perfil de la organización
- **Banner de estado de validación**, con color, ícono y texto. Hay que dibujar las cuatro variantes:
  - ⏳ Pendiente: "Estamos revisando tu empresa. Puedes crear borradores, pero no publicar".
  - ✓ Validada.
  - ✕ Rechazada, con el motivo.
  - ⛔ Suspendida.
- **Formulario:**
  - Logo, nombre comercial, sector, tamaño, descripción, sitio web, ubicación y **prácticas de inclusión**.
  - Razón social y RFC en solo lectura, con candado, si la empresa ya está validada.
- Sección "Documento de validación": subir la constancia de situación fiscal (PDF) y ver su estado.
- Opciones de cuenta: cambiar contraseña y cerrar sesión.
- **Campos (BD):** `empresa.logo_url`, `nombre_comercial`, `sector_id`, `tamano_empresa_id`, `descripcion`, `sitio_web`, `municipio_id`, `direccion`, `practicas_inclusion`, `razon_social` y `rfc` (solo lectura si está validada), `documento_url`, `estado`, `motivo_estado`; `reclutador.puesto`.

#### REC-02 · Mis vacantes ⚠️
- Filtro por estado: Borrador · Publicada · Pausada · Cerrada · Suspendida.
- **Tarjeta:** título, estado, "14 postulados · 3 nuevos" y menú ⋮ con Editar, Pausar/Reanudar, Cerrar y Duplicar.
- Botón flotante **+ Nueva vacante**.
- Aviso si la empresa no está validada: "Podrás publicar cuando validemos tu empresa".
- Vacío: "Aún no tienes vacantes".
- **Campos (BD):** `vacante.titulo`, `estado`, `publicada_en`; conteo de `postulacion` por vacante (total y en estado `postulada`).

#### REC-03 · Crear / editar vacante ⚠️
Formulario por pasos, con indicador "Paso 2 de 4". Un frame por paso.
1. **Datos generales:**
   - Título, categoría, descripción, jornada, tipo de contrato, número de plazas y ubicación.
   - Salario mínimo y máximo, con la casilla "Mostrar salario".
2. **Requisitos:**
   - Habilidades con autocompletado; cada una se marca como *Obligatoria* o *Deseable*.
   - Formación mínima y años de experiencia.
3. **Modalidad:** presencial / remoto / híbrido (tarjetas seleccionables). Si es presencial o híbrido, la dirección es obligatoria.
4. **Accesibilidad** (obligatoria):
   - Dos bloques de casillas del mismo catálogo: "El lugar ya cuenta con" y "Podemos ofrecer bajo solicitud".
   - Notas.
   - Casilla explícita "Por ahora no contamos con condiciones de accesibilidad".
- Botones al final: **Guardar borrador** y **Publicar**.
- Aviso al editar una vacante que ya tiene postulados: "La compatibilidad se recalculará y avisaremos a los postulados".
- **Campos (BD):** paso 1 → `vacante.titulo`, `categoria_id`, `descripcion`, `jornada_id`, `tipo_contrato_id`, `plazas`, `municipio_id`, `salario_min`, `salario_max`, `mostrar_salario`; paso 2 → `vacante_habilidad` (`habilidad_id`, `obligatoria`), `nivel_educativo_id`, `experiencia_anios`; paso 3 → `modalidad_id`, `direccion`; paso 4 → `vacante_ajuste` (`ajuste_id`, `tipo`), `notas_accesibilidad`, `sin_condiciones_accesibilidad`; botones → `estado` (`borrador` o `publicada`).

#### REC-04 · Candidatos postulados ⚠️
- Encabezado con la vacante y el número de postulados.
- Filtros: estado y compatibilidad mínima. Orden: compatibilidad de mayor a menor.
- **Tarjeta de postulado:** nombre, **compatibilidad laboral 83 %**, estado, fecha y la etiqueta "Ajustes por confirmar" si aplica.
- ⚠️ Importante: **no se muestra ningún dato de discapacidad**, y la compatibilidad del reclutador solo considera habilidades, formación y modalidad.
- Vacío: "Aún no hay postulados".
- **Campos (BD):** `usuario.nombre` + `apellidos`, `compatibilidad.puntaje_reclutador`, `postulacion.estado`, `postulacion.creado_en`; la etiqueta "Ajustes por confirmar" sale de comparar `candidato_necesidad` con `vacante_ajuste` (solo si `comparte_ajustes`).

#### REC-05 · Detalle del postulado
- Nombre, compatibilidad y estado actual.
- **CV:** resumen, experiencia, formación, habilidades y mensaje de postulación.
- **Desglose:** habilidades obligatorias y deseables que cumple (✓) y las que no (✕); formación y modalidad.
- **Necesidades de ajuste**, solo si el candidato aceptó compartirlas:
  - Lista con "✓ Ya cubierto por la vacante" o "Por confirmar con la empresa".
  - Si no las compartió: "El candidato no compartió esta información".
- **Cambio de estado:** botón que abre un modal con los estados permitidos y un mensaje opcional para el candidato.
- **Observaciones internas:** lista con fecha y autor, más un campo para agregar. Etiqueta "No visibles para el candidato".
- Datos de contacto: ocultos hasta el estado "Entrevista" (dibujen el texto "Disponibles al pasar a entrevista").
- Menú ⋮ → "Reportar perfil".
- **Campos (BD):** CV → `candidato.resumen`, `experiencia`, `formacion`, `candidato_habilidad`, `postulacion.mensaje`; ajustes → `candidato_necesidad` (solo si `postulacion.comparte_ajustes`); cambio de estado → `postulacion.estado` + `historial_postulacion.mensaje`; observaciones → `observacion.texto`, `creado_en`, autor; contacto → `usuario.correo`, `usuario.telefono`.

#### REC-06 · Agenda de entrevistas ⚠️
- Vista por días (lista agrupada: "Hoy", "Mañana", "Jue 15 oct").
- **Horario libre:** hora, duración, vacante, etiqueta "Libre" y opción de eliminar.
- **Horario agendado:** hora, candidato, vacante, liga y acciones: "Marcar como realizada", "No asistió", "Cancelar" (con motivo).
- Botón **+ Publicar horarios**, que abre un formulario: vacante, fecha, hora de inicio, duración (30/45/60 min) y liga genérica de Meet o Teams.
- Error: "Este horario se traslapa con otro".
- **Campos (BD):** `horario_entrevista.vacante_id`, `inicio`, `duracion_min`, `liga`, `estado`; agendados → `entrevista.estado`, candidato (`usuario.nombre`); cancelación → `entrevista.motivo_cancelacion`.

### 5.4 Web — Administrador

Todas las pantallas web llevan el menú lateral y la barra superior descritos en la sección 2, excepto WEB-01.

#### WEB-01 · Inicio de sesión (web) ⚠️
- Tarjeta centrada con logo, "Panel de administración", correo, contraseña y botón **Iniciar sesión**.
- Errores: credenciales inválidas y "No tienes permisos de administrador".
- **Campos (BD):** `usuario.correo`, contraseña; solo entra `rol = administrador`.

#### WEB-02 · Dashboard y estadísticas
- Filtro de periodo arriba, a la derecha ("Últimos 30 días"), y botón **Exportar (PDF / XLSX)**.
- **Tarjetas KPI:** candidatos activos, empresas validadas, vacantes publicadas, postulaciones del periodo, contrataciones y tasa de colocación.
- **Tarjetas de pendientes** (con enlace): "5 empresas por validar" y "3 reportes abiertos".
- **Gráficas:**
  - Postulaciones por estado (barras).
  - Vacantes por modalidad y por categoría.
  - Postulaciones y contrataciones por mes (línea).
  - **Brecha de accesibilidad:** ajustes más solicitados contra más ofrecidos (barras dobles).
  - Habilidades más demandadas contra las más registradas.
- Debajo de cada gráfica, el enlace "Ver como tabla".
- **Campos (BD):** todo sale agregado (conteos) de `usuario`, `empresa`, `vacante`, `postulacion`, `candidato_necesidad` y `vacante_ajuste`; nunca se muestra un candidato individual.

#### WEB-03 · Gestión de usuarios ⚠️
- Buscador y filtros por rol y estado; botón **+ Nuevo usuario**.
- **Tabla:** nombre, correo, rol, empresa, fecha de registro, estado y acciones (ver, editar, suspender/reactivar, dar de baja).
- Paginación de 25.
- **Modal** crear/editar: nombre, correo, teléfono, rol y contraseña (solo al crear).
- **Modal** suspender: motivo obligatorio.
- **Detalle de usuario** (frame aparte): datos generales, número de postulaciones o vacantes y reportes asociados.
  - Sin necesidades de ajuste. Dibujen el aviso "Información sensible no disponible para administradores".
- **Campos (BD):** `usuario.nombre`, `apellidos`, `correo`, `telefono`, `rol`, `estado`, `motivo_estado`, `creado_en`, `ultimo_acceso_en`; empresa vía `reclutador.empresa_id`.

#### WEB-04 · Empresas y validación ⚠️
- Pestañas: **Pendientes (5)** · Validadas · Rechazadas · Suspendidas.
- **Tabla:** razón social, RFC, sector, reclutadores, vacantes activas, fecha de solicitud y estado.
- **Vista de revisión** (frame aparte):
  - Datos fiscales y visor del PDF de la constancia.
  - Indicadores "RFC con formato válido ✓" y "RFC no duplicado ✓".
  - Botones **Validar** y **Rechazar**; este último abre un modal con motivo obligatorio.
- Acción **Suspender empresa**, con un aviso: "Sus vacantes publicadas se suspenderán".
- **Campos (BD):** `empresa.razon_social`, `nombre_comercial`, `rfc`, `sector`, `tamano_empresa`, `documento_url`, `estado`, `motivo_estado`, `validada_en`, `creado_en`.

#### WEB-05 · Vacantes (moderación)
- Filtros: empresa, estado, categoría, modalidad y casilla "Con reportes".
- **Tabla:** título, empresa, estado, fecha, postulados y **número de reportes** (resaltado si es mayor que 0).
- **Detalle** con toda la vacante, incluida la accesibilidad.
- Botón **Suspender**, con motivo, y **Reactivar**.
- **Campos (BD):** `vacante.titulo`, `empresa.nombre_comercial`, `estado`, `motivo_estado`, `publicada_en`; conteos de `postulacion` y `reporte` por vacante.

#### WEB-06 · Categorías y habilidades
- Dos pestañas: **Categorías** · **Habilidades**.
- Tabla: nombre, descripción o categoría, "En uso por X candidatos / Y vacantes", estado (activa/inactiva) y acciones.
- Modal crear/editar.
- La acción es **Desactivar**, no borrar. Si el registro está en uso: "No se puede eliminar porque está en uso; puedes desactivarlo".
- **Campos (BD):** `categoria.nombre`, `descripcion`, `activo`; `habilidad.nombre`, `categoria_id`, `activo`.

#### WEB-07 · Catálogos
- Lista lateral de catálogos:
  - **Ajustes y condiciones de accesibilidad**
  - Modalidades
  - Jornadas
  - Tipos de contrato
  - Niveles educativos
  - Sectores
  - Tamaños de empresa
  - Motivos de reporte
- Tabla del catálogo seleccionado con el mismo patrón que WEB-06.
- En el de ajustes, la tabla incluye una columna **Categoría** (movilidad, visual, auditiva, comunicación, cognitiva/psicosocial, general) y la descripción en lenguaje claro.
- **Campos (BD):** todos los catálogos tienen `nombre` y `activo`; además `ajuste.categoria` y `ajuste.descripcion`, `nivel_educativo.orden`, `tamano_empresa.rango`, `motivo_reporte.aplica_a`.

#### WEB-08 · Reportes e incidencias ⚠️
- Pestañas por estado: **Abiertos** · En revisión · Resueltos · Descartados.
- Filtros por tipo (vacante, empresa, candidato) y por motivo.
- **Tabla:** folio, tipo, elemento reportado, motivo, quién reporta, fecha y estado.
- **Detalle del reporte** (frame aparte):
  - Descripción.
  - Vista previa del elemento reportado.
  - "Reportes anteriores contra este elemento: 2".
  - Historial de cambios.
  - Botones: **Tomar en revisión**, **Resolver** (con resolución obligatoria), **Descartar**.
  - Acciones rápidas: **Suspender vacante / empresa / usuario**.
- **Campos (BD):** `reporte.id` (folio), `motivo_reporte_id`, `vacante_id` / `empresa_id` / `candidato_id` (solo uno tiene valor), `reportante_id`, `descripcion`, `estado`, `resolucion`, `accion`, `creado_en`, `cerrado_en`; historial → `historial_reporte.estado_nuevo`, `comentario`, `creado_en`.

---

## 6. Checklist antes de entregar cada pantalla

- [ ] El frame se llama con su código (`CAN-02 Detalle de vacante`).
- [ ] Contraste revisado con el plugin.
- [ ] Botones de al menos 48 px y texto de al menos 16 px.
- [ ] Ningún estado se comunica solo con color.
- [ ] Los formularios tienen etiquetas visibles y un ejemplo de error.
- [ ] Si la pantalla tiene ⚠️, también están dibujados sus estados vacío, error o confirmación.
- [ ] Los campos coinciden con la línea **Campos (BD)** de la pantalla y la nota del frame trae los nombres técnicos.
- [ ] Usa los datos de ejemplo de la sección 3.5 (Mariana, TecnoQro, Técnico de soporte de TI, 88 % / 83 %).
- [ ] Exportada en PNG 2x con el nombre `CÓDIGO_Nombre.png`.

**Total: 26 pantallas** (18 móviles + 8 web), más sus variantes.
