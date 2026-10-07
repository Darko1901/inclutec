# Contrato del API de IncluTec

Versión 1.1 · 7 de octubre de 2026 · Base: `http://localhost:8000/api/v1`

Este documento define cada endpoint del API: ruta, rol que puede usarlo, parámetros, cuerpo, respuesta y errores. La app móvil y el panel web lo usan para sus datos simulados mientras el API no existe, y el API lo implementa en los sprints 4 y 5. Si al implementar algo el contrato no alcanza o no funciona, se reporta y se actualiza el contrato antes de cambiar el código; el código nunca se aparta de él en silencio.

La versión para herramientas está en [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1): se puede abrir en https://editor.swagger.io y sirve para generar los tipos de TypeScript de la app (`npx openapi-typescript docs/api/openapi.yaml -o src/api/tipos.ts`).

**Cambios en la versión 1.1:** los ejemplos se actualizaron con los datos de prueba ampliados (tres empresas validadas, una pendiente, ocho vacantes y un reporte abierto) y el código de recuperación de ejemplo es `123456`, igual que en el mock. Ningún endpoint ni objeto cambió.

Los ejemplos usan los datos de `db/semillas/S002__datos_prueba.sql`: Mariana (candidata, id 3), Laura (reclutadora de TecnoQro, id 2), Jorge (candidato, id 4), el administrador (id 1), la vacante «Técnico de soporte de TI» (id 1) y la postulación de Mariana (id 1), con compatibilidad de 88 % para ella y 83 % para la reclutadora.

## Contenido

1. [Convenciones](#1-convenciones)
2. [Reglas de negocio](#2-reglas-de-negocio)
3. [Índice de endpoints](#3-índice-de-endpoints)
4. [Endpoints](#4-endpoints)
5. [Objetos](#5-objetos)

## 1. Convenciones

### Autenticación

- `POST /auth/login` devuelve un JWT firmado con HS256 que vence a las 8 horas. Su carga útil es `{"sub": "<id de usuario>", "rol": "candidato|reclutador|administrador", "exp": <epoch>}`.
- Toda petición, salvo las marcadas como *público*, lleva `Authorization: Bearer <token>`. Sin token, o con uno vencido, la respuesta es `401` con `codigo: no_autenticado`; el cliente borra el token y regresa al inicio de sesión.
- La app móvil guarda el token en `expo-secure-store`. El panel web lo guarda en la sesión del servidor de Laravel y nunca lo manda al navegador.
- Además del rol, el API revisa la **propiedad**: un candidato solo ve sus propios datos y un reclutador solo las vacantes, postulaciones y horarios de su empresa. Un recurso ajeno responde `403 sin_permiso` o `404 no_encontrado`, según se indica en cada endpoint.

### Formato

- Cuerpos y respuestas en JSON UTF-8. Los nombres de campos van en `snake_case` y coinciden con la base de datos.
- Fecha-hora en ISO 8601 en UTC (`2026-10-06T16:00:00Z`); los clientes la muestran en hora de la Ciudad de México. Fechas sin hora como `AAAA-MM-DD`.
- Los catálogos se **envían** como ids (`modalidad_id: 3`) y se **reciben** como objetos (`modalidad: {"id": 3, "nombre": "Híbrido"}`), para que la app no tenga que cruzar catálogos.
- Los estados se envían y reciben con su valor de base de datos (`en_revision`); el texto que ve el usuario («En revisión») lo pone cada cliente.
- Un campo sin valor viene como `null`, nunca se omite. La excepción son los elementos de catálogo, que solo traen los campos que aplican a su tipo.
- Dinero en pesos mexicanos, número sin formato (`14000`).

### Paginación

Los listados que pueden crecer reciben `page` (desde 1) y `size` (por omisión 20 en la app y 25 en el panel; máximo 100) y responden:

```json
{
  "items": [
    "..."
  ],
  "total": 57,
  "page": 1,
  "size": 20
}
```

Los catálogos y las listas cortas (experiencias, formaciones, observaciones) se devuelven como arreglo simple.

### Errores

Todos los errores tienen la misma forma. `detail` se puede mostrar tal cual al usuario; `codigo` sirve para que el cliente decida qué hacer; `campos` solo aparece en errores de validación y trae un mensaje por campo, con el mismo nombre que en el cuerpo (para objetos anidados, con punto: `empresa.rfc`).

```json
{
  "detail": "Revisa los datos marcados.",
  "codigo": "validacion",
  "campos": {
    "telefono": "Debe tener 10 dígitos."
  }
}
```

FastAPI devuelve por omisión otra forma en los errores 422; el API instala un manejador que los convierte a esta.

| HTTP | `codigo` | Significado |
|---|---|---|
| 400 | `codigo_invalido` | Código de recuperación incorrecto; el mensaje dice cuántos intentos quedan. |
| 400 | `contrasena_incorrecta` | La contraseña actual no coincide. |
| 401 | `credenciales_invalidas` | Correo o contraseña incorrectos (mismo mensaje en ambos casos). |
| 401 | `no_autenticado` | Falta el token, es inválido o ya venció. |
| 403 | `datos_fiscales_bloqueados` | Se intentó cambiar razón social o RFC de una empresa validada. |
| 403 | `empresa_no_validada` | La operación requiere que la empresa esté validada. |
| 403 | `sin_consentimiento` | El candidato no ha otorgado el consentimiento. |
| 403 | `sin_permiso` | El rol o la propiedad no permiten la operación. |
| 404 | `no_encontrado` | El recurso no existe o no es visible para el usuario. |
| 409 | `cancelacion_tardia` | Faltan menos de 24 h para la entrevista. |
| 409 | `correo_duplicado` | El correo ya está registrado. |
| 409 | `en_uso` | El registro está en uso (postulaciones, vacantes u otros registros) y no se puede eliminar ni cambiar de esa forma. |
| 409 | `estado_invalido` | El recurso no está en el estado que requiere la operación. |
| 409 | `horario_ocupado` | Otro candidato acaba de tomar ese horario. |
| 409 | `horario_traslapado` | Se cruza con otro horario del reclutador. |
| 409 | `nombre_duplicado` | Ya existe un registro con ese nombre en el catálogo. |
| 409 | `postulacion_duplicada` | Ya existe una postulación a esa vacante. |
| 409 | `rfc_duplicado` | Otra empresa ya registró ese RFC. |
| 409 | `transicion_invalida` | El cambio de estado no está permitido desde el estado actual. |
| 409 | `vacante_no_disponible` | La vacante ya no está publicada. |
| 410 | `codigo_vencido` | El código venció o se agotaron los 5 intentos; hay que pedir otro. |
| 422 | `archivo_invalido` | Tipo o tamaño de archivo no permitido. |
| 422 | `limite_habilidades` | Más de 30 habilidades o habilidades repetidas. |
| 422 | `perfil_incompleto` | Falta nombre, municipio, una habilidad o una formación; `campos` lo indica. |
| 422 | `vacante_incompleta` | Faltan datos para publicar; `campos` dice cuáles. |
| 422 | `validacion` | Algún campo no cumple el formato; ver `campos`. |
| 423 | `cuenta_suspendida` | La cuenta está suspendida o dada de baja. |
| 429 | `demasiados_intentos` | Cinco intentos fallidos; incluye el encabezado `Retry-After` en segundos. |
| 429 | `reenvio_prematuro` | Aún no pasan 60 s; incluye `Retry-After`. |
| 500 | `error_interno` | Falla no prevista. El cliente muestra «El servicio no está disponible; intenta más tarde». |

### Archivos

- Se suben con `multipart/form-data` en un campo llamado `archivo`. Fotos y logotipos: JPG o PNG de hasta 2 MB. Constancia fiscal: PDF de hasta 5 MB.
- El API los guarda en su servidor y devuelve una ruta como `/archivos/logos/empresa-1.png`, que se sirve desde `http://localhost:8000/archivos/...` (fuera de `/api/v1`). La base de datos guarda solo esa ruta.
- La constancia fiscal solo la pueden descargar el reclutador de la empresa y el administrador.

## 2. Reglas de negocio

### Compatibilidad

Se calcula por par candidato–vacante y se guarda en la tabla `compatibilidad`. Se recalcula cuando el candidato cambia su perfil, CV o necesidades, y cuando la vacante cambia requisitos, modalidad o ajustes.

| Componente | Fórmula |
|---|---|
| H · habilidades | (2 · obligatorias cumplidas + deseables cumplidas) / (2 · obligatorias + deseables). El nivel no cuenta, solo tenerla. |
| A · accesibilidad | Necesidades del candidato que la vacante declara (existente o bajo solicitud) / necesidades registradas. 1 si no registró ninguna o no dio consentimiento. |
| M · modalidad | 1 si la modalidad de la vacante está entre las preferidas; 0.5 si la vacante es híbrida y no coincide; 0 en otro caso. |
| F · formación | 1 si tiene una formación concluida de nivel igual o mayor al mínimo (o la vacante no exige); 0.5 si la está cursando; 0 en otro caso. |

- Candidato: `round(100 · (0.40·H + 0.30·A + 0.15·M + 0.15·F))`.
- Reclutador: `round(100 · (0.40·H + 0.15·M + 0.15·F) / 0.70)`. No incluye A, para que las necesidades de ajuste nunca bajen a nadie en la lista.
- Ejemplo: Mariana con la vacante 1 tiene H = (2·3 + 1)/(2·4 + 2) = 0.70, A = 1, M = 1, F = 1 → **88** para ella y **83** para la reclutadora. Jorge da 57 y 39.

### Perfil del candidato

- **Perfil mínimo para postularse:** nombre, municipio, al menos una habilidad y al menos una formación. Si falta algo, `POST /postulaciones` responde `422 perfil_incompleto` con los faltantes en `campos`.
- **Completitud** (0 a 100), que nunca depende de las necesidades de ajuste:

| Sección (`secciones_pendientes`) | Puntos | Se cumple con |
|---|---|---|
| `datos_personales` | 20 | nombre, apellidos, teléfono y municipio |
| `resumen` | 10 | resumen profesional |
| `foto` | 10 | fotografía |
| `preferencias` | 15 | al menos una modalidad y la jornada |
| `formacion` | 20 | al menos una formación |
| `experiencia` | 10 | al menos una experiencia |
| `habilidades` | 15 | al menos una habilidad |

Mariana tiene todo menos la foto: 90. Jorge no tiene foto ni experiencia: 80.

### Transiciones de estado

| Entidad | Desde → hacia | Quién |
|---|---|---|
| Postulación | postulada → en_revision · en_revision → entrevista · entrevista → aceptada | Reclutador |
| Postulación | postulada, en_revision o entrevista → no_seleccionada | Reclutador |
| Postulación | postulada, en_revision o entrevista → retirada | Candidato |
| Vacante | borrador → publicada · publicada ↔ pausada · publicada o pausada → cerrada | Reclutador |
| Vacante | publicada o pausada → suspendida · suspendida → publicada | Administrador (o al suspender la empresa) |
| Empresa | pendiente → validada o rechazada · rechazada → pendiente (al subir otra constancia) | Administrador / reclutador |
| Empresa | validada → suspendida · suspendida → validada | Administrador |
| Horario | libre → agendado (al reservar) → libre (si el candidato cancela o retira la postulación) · agendado → cancelado (si cancela el reclutador) · un horario libre se puede borrar | Candidato / reclutador |
| Entrevista | agendada → realizada, no_asistio o cancelada | Reclutador; el candidato solo cancela con 24 h |
| Reporte | abierto → en_revision → resuelto o descartado · abierto → descartado | Administrador |
| Usuario | activo ↔ suspendido · activo o suspendido → eliminado | Administrador; el candidato puede eliminar su cuenta |

Una transición que no está en la tabla responde `409 transicion_invalida` y no cambia nada.

### Notificaciones

Cada evento crea una fila en `notificacion` (la ve el usuario en MOV-04) y, según las preferencias del usuario, se envía por push (Expo) y por correo en segundo plano, sin retrasar la respuesta.

| `tipo` | Destinatario | Se genera cuando | `referencia` | Pantalla al tocarla |
|---|---|---|---|---|
| `nueva_postulacion` | Reclutador de la vacante | Un candidato se postula | postulacion | REC-05 |
| `cambio_estado` | Candidato | El reclutador cambia el estado de su postulación | postulacion | CAN-06 |
| `entrevista_agendada` | Reclutador (correo también al candidato) | El candidato reserva un horario | entrevista | REC-06 |
| `entrevista_cancelada` | La otra parte | El candidato o el reclutador cancela | postulacion / entrevista | CAN-06 / REC-06 |
| `recordatorio_entrevista` | Candidato y reclutador | Faltan 24 h para la entrevista | postulacion / entrevista | CAN-06 / REC-06 |
| `empresa_validada` | Reclutadores de la empresa | El administrador valida la empresa | empresa | REC-01 |
| `empresa_rechazada` | Reclutadores de la empresa | El administrador la rechaza | empresa | REC-01 |
| `vacante_suspendida` | Reclutador y postulados activos | Se suspende la vacante o su empresa | vacante / postulacion | REC-02 / CAN-06 |
| `reporte_resuelto` | Quien reportó | El reporte se resuelve o se descarta | reporte | MOV-04 |

Los mensajes nunca incluyen datos sensibles (necesidades de ajuste) ni detalles de sanciones.

## 3. Índice de endpoints

**Autenticación y cuenta**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `POST` | [`/auth/login`](#post-auth-login) | público | Iniciar sesión |
| `GET` | [`/auth/me`](#get-auth-me) | cualquier usuario con sesión | Usuario de la sesión |
| `POST` | [`/auth/logout`](#post-auth-logout) | cualquier usuario con sesión | Cerrar sesión |
| `POST` | [`/auth/registro/candidato`](#post-auth-registro-candidato) | público | Registrar candidato |
| `POST` | [`/auth/registro/reclutador`](#post-auth-registro-reclutador) | público | Registrar reclutador y empresa |
| `POST` | [`/auth/password/solicitar`](#post-auth-password-solicitar) | público | Solicitar código de recuperación |
| `POST` | [`/auth/password/verificar`](#post-auth-password-verificar) | público | Verificar código |
| `POST` | [`/auth/password/restablecer`](#post-auth-password-restablecer) | público | Restablecer contraseña |
| `PUT` | [`/auth/password`](#put-auth-password) | cualquier usuario con sesión | Cambiar contraseña |

**Catálogos**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/catalogos/{tipo}`](#get-catalogos-tipo) | público (también se usa con sesión) | Catálogo activo |

**Notificaciones**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `POST` | [`/dispositivos`](#post-dispositivos) | candidato, reclutador | Registrar dispositivo para push |
| `GET` | [`/notificaciones`](#get-notificaciones) | candidato, reclutador | Mis notificaciones |
| `GET` | [`/notificaciones/resumen`](#get-notificaciones-resumen) | candidato, reclutador | Contador de no leídas |
| `PATCH` | [`/notificaciones/{id}/leida`](#patch-notificaciones-id-leida) | candidato, reclutador | Marcar una como leída |
| `PATCH` | [`/notificaciones/leidas`](#patch-notificaciones-leidas) | candidato, reclutador | Marcar todas como leídas |
| `GET` | [`/notificaciones/preferencias`](#get-notificaciones-preferencias) | candidato, reclutador | Preferencias de canal |
| `PUT` | [`/notificaciones/preferencias`](#put-notificaciones-preferencias) | candidato, reclutador | Guardar preferencias de canal |

**Perfil y CV del candidato**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/candidatos/me`](#get-candidatos-me) | candidato | Mi perfil |
| `PUT` | [`/candidatos/me`](#put-candidatos-me) | candidato | Actualizar mi perfil |
| `POST` | [`/candidatos/me/foto`](#post-candidatos-me-foto) | candidato | Subir foto |
| `DELETE` | [`/candidatos/me/foto`](#delete-candidatos-me-foto) | candidato | Quitar foto |
| `PUT` | [`/candidatos/me/consentimiento`](#put-candidatos-me-consentimiento) | candidato | Otorgar o revocar consentimiento |
| `PUT` | [`/candidatos/me/necesidades`](#put-candidatos-me-necesidades) | candidato | Guardar necesidades de ajuste |
| `DELETE` | [`/candidatos/me`](#delete-candidatos-me) | candidato | Eliminar mi cuenta |
| `GET` | [`/candidatos/me/experiencias`](#get-candidatos-me-experiencias) | candidato | Mis experiencias |
| `POST` | [`/candidatos/me/experiencias`](#post-candidatos-me-experiencias) | candidato | Agregar experiencia |
| `PUT` | [`/candidatos/me/experiencias/{id}`](#put-candidatos-me-experiencias-id) | candidato | Editar experiencia |
| `DELETE` | [`/candidatos/me/experiencias/{id}`](#delete-candidatos-me-experiencias-id) | candidato | Eliminar experiencia |
| `GET` | [`/candidatos/me/formaciones`](#get-candidatos-me-formaciones) | candidato | Mis formaciones |
| `POST` | [`/candidatos/me/formaciones`](#post-candidatos-me-formaciones) | candidato | Agregar formación |
| `PUT` | [`/candidatos/me/formaciones/{id}`](#put-candidatos-me-formaciones-id) | candidato | Editar formación |
| `DELETE` | [`/candidatos/me/formaciones/{id}`](#delete-candidatos-me-formaciones-id) | candidato | Eliminar formación |
| `GET` | [`/candidatos/me/habilidades`](#get-candidatos-me-habilidades) | candidato | Mis habilidades |
| `PUT` | [`/candidatos/me/habilidades`](#put-candidatos-me-habilidades) | candidato | Guardar mis habilidades |
| `GET` | [`/candidatos/me/vista-previa`](#get-candidatos-me-vista-previa) | candidato | Vista previa de mi CV |

**Empresas**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/empresas`](#get-empresas) | candidato, reclutador, administrador | Directorio de empresas |
| `GET` | [`/empresas/{id}`](#get-empresas-id) | candidato, reclutador, administrador | Ficha de empresa |
| `GET` | [`/empresas/me`](#get-empresas-me) | reclutador | Mi organización |
| `PUT` | [`/empresas/me`](#put-empresas-me) | reclutador | Actualizar mi organización |
| `POST` | [`/empresas/me/logo`](#post-empresas-me-logo) | reclutador | Subir logotipo |
| `POST` | [`/empresas/me/documento`](#post-empresas-me-documento) | reclutador | Subir constancia de situación fiscal |
| `GET` | [`/empresas/me/vacantes`](#get-empresas-me-vacantes) | reclutador | Vacantes de mi empresa |

**Vacantes y compatibilidad**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/vacantes/recomendadas`](#get-vacantes-recomendadas) | candidato | Vacantes recomendadas |
| `GET` | [`/vacantes`](#get-vacantes) | candidato | Buscar vacantes |
| `GET` | [`/vacantes/{id}`](#get-vacantes-id) | candidato, reclutador (de su empresa), administrador | Detalle de vacante |
| `GET` | [`/vacantes/{id}/compatibilidad`](#get-vacantes-id-compatibilidad) | candidato | Desglose de compatibilidad |
| `POST` | [`/vacantes`](#post-vacantes) | reclutador | Crear vacante |
| `PUT` | [`/vacantes/{id}`](#put-vacantes-id) | reclutador | Editar vacante |
| `PATCH` | [`/vacantes/{id}/estado`](#patch-vacantes-id-estado) | reclutador | Publicar, pausar, reanudar o cerrar |
| `POST` | [`/vacantes/{id}/duplicar`](#post-vacantes-id-duplicar) | reclutador | Duplicar como borrador |
| `GET` | [`/vacantes/{id}/postulaciones`](#get-vacantes-id-postulaciones) | reclutador | Postulados de una vacante |

**Postulaciones**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `POST` | [`/postulaciones`](#post-postulaciones) | candidato | Postularme |
| `GET` | [`/postulaciones/me`](#get-postulaciones-me) | candidato | Mis postulaciones |
| `GET` | [`/postulaciones/{id}`](#get-postulaciones-id) | candidato | Detalle de mi postulación |
| `PATCH` | [`/postulaciones/{id}/retirar`](#patch-postulaciones-id-retirar) | candidato | Retirar mi postulación |
| `POST` | [`/postulaciones/{id}/entrevista`](#post-postulaciones-id-entrevista) | candidato | Agendar entrevista |
| `GET` | [`/postulaciones/{id}/candidato`](#get-postulaciones-id-candidato) | reclutador | Detalle del postulado |
| `PATCH` | [`/postulaciones/{id}/estado`](#patch-postulaciones-id-estado) | reclutador | Cambiar estado de la postulación |
| `GET` | [`/postulaciones/{id}/observaciones`](#get-postulaciones-id-observaciones) | reclutador | Observaciones internas |
| `POST` | [`/postulaciones/{id}/observaciones`](#post-postulaciones-id-observaciones) | reclutador | Agregar observación interna |

**Horarios y entrevistas**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `POST` | [`/horarios-entrevista`](#post-horarios-entrevista) | reclutador | Publicar horario |
| `GET` | [`/horarios-entrevista`](#get-horarios-entrevista) | candidato | Horarios disponibles de una vacante |
| `DELETE` | [`/horarios-entrevista/{id}`](#delete-horarios-entrevista-id) | reclutador | Eliminar horario libre |
| `GET` | [`/entrevistas/me`](#get-entrevistas-me) | reclutador | Mi agenda |
| `PATCH` | [`/entrevistas/{id}`](#patch-entrevistas-id) | reclutador | Registrar resultado o cancelar |
| `DELETE` | [`/entrevistas/{id}`](#delete-entrevistas-id) | candidato | Cancelar mi entrevista |

**Reportes**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `POST` | [`/reportes`](#post-reportes) | candidato, reclutador | Reportar vacante, empresa o candidato |

**Administración: estadísticas**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/admin/estadisticas/resumen`](#get-admin-estadisticas-resumen) | administrador | Indicadores y gráficas |
| `GET` | [`/admin/estadisticas/exportar`](#get-admin-estadisticas-exportar) | administrador | Exportar estadísticas |

**Administración: usuarios**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/admin/usuarios`](#get-admin-usuarios) | administrador | Listar usuarios |
| `GET` | [`/admin/usuarios/{id}`](#get-admin-usuarios-id) | administrador | Detalle de usuario |
| `POST` | [`/admin/usuarios`](#post-admin-usuarios) | administrador | Crear usuario |
| `PUT` | [`/admin/usuarios/{id}`](#put-admin-usuarios-id) | administrador | Editar usuario |
| `PATCH` | [`/admin/usuarios/{id}/estado`](#patch-admin-usuarios-id-estado) | administrador | Suspender, reactivar o dar de baja |

**Administración: empresas**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/admin/empresas`](#get-admin-empresas) | administrador | Listar empresas |
| `GET` | [`/admin/empresas/{id}`](#get-admin-empresas-id) | administrador | Detalle de empresa |
| `POST` | [`/admin/empresas`](#post-admin-empresas) | administrador | Crear empresa |
| `PUT` | [`/admin/empresas/{id}`](#put-admin-empresas-id) | administrador | Editar empresa |
| `PATCH` | [`/admin/empresas/{id}/validacion`](#patch-admin-empresas-id-validacion) | administrador | Validar o rechazar |
| `PATCH` | [`/admin/empresas/{id}/estado`](#patch-admin-empresas-id-estado) | administrador | Suspender o reactivar |

**Administración: vacantes**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/admin/vacantes`](#get-admin-vacantes) | administrador | Listar todas las vacantes |
| `PATCH` | [`/admin/vacantes/{id}/estado`](#patch-admin-vacantes-id-estado) | administrador | Suspender o reactivar vacante |

**Administración: catálogos**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/admin/categorias`](#get-admin-categorias) | administrador | Listar categorías |
| `POST` | [`/admin/categorias`](#post-admin-categorias) | administrador | Crear categoría |
| `PUT` | [`/admin/categorias/{id}`](#put-admin-categorias-id) | administrador | Editar categoría |
| `PATCH` | [`/admin/categorias/{id}`](#patch-admin-categorias-id) | administrador | Activar o desactivar categoría |
| `DELETE` | [`/admin/categorias/{id}`](#delete-admin-categorias-id) | administrador | Eliminar categoría |
| `GET` | [`/admin/habilidades`](#get-admin-habilidades) | administrador | Listar habilidades |
| `POST` | [`/admin/habilidades`](#post-admin-habilidades) | administrador | Crear habilidad |
| `PUT` | [`/admin/habilidades/{id}`](#put-admin-habilidades-id) | administrador | Editar habilidad |
| `PATCH` | [`/admin/habilidades/{id}`](#patch-admin-habilidades-id) | administrador | Activar o desactivar habilidad |
| `DELETE` | [`/admin/habilidades/{id}`](#delete-admin-habilidades-id) | administrador | Eliminar habilidad |
| `GET` | [`/admin/catalogos/{tipo}`](#get-admin-catalogos-tipo) | administrador | Listar catálogo |
| `POST` | [`/admin/catalogos/{tipo}`](#post-admin-catalogos-tipo) | administrador | Crear elemento |
| `PUT` | [`/admin/catalogos/{tipo}/{id}`](#put-admin-catalogos-tipo-id) | administrador | Editar elemento |
| `PATCH` | [`/admin/catalogos/{tipo}/{id}`](#patch-admin-catalogos-tipo-id) | administrador | Activar o desactivar elemento |
| `DELETE` | [`/admin/catalogos/{tipo}/{id}`](#delete-admin-catalogos-tipo-id) | administrador | Eliminar elemento |

**Administración: reportes**

| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| `GET` | [`/admin/reportes`](#get-admin-reportes) | administrador | Bandeja de reportes |
| `GET` | [`/admin/reportes/{id}`](#get-admin-reportes-id) | administrador | Detalle del reporte |
| `PATCH` | [`/admin/reportes/{id}`](#patch-admin-reportes-id) | administrador | Dar seguimiento al reporte |

Total: 100 endpoints.

## 4. Endpoints

### Autenticación y cuenta

<a id="post-auth-login"></a>
#### `POST /auth/login` · Iniciar sesión

**Rol:** público · **Trazabilidad:** MOV-01 RF-02, WEB-01 RF-02 · CU-02, CU-19

Devuelve el token y los datos del usuario. La app móvil rechaza al administrador y el panel web acepta solo al administrador; esa regla la aplica cada cliente con `usuario.rol`. Tras 5 intentos fallidos con el mismo correo, el acceso se bloquea 15 minutos.

**Cuerpo** ([Login](#obj-login)):

```json
{
  "correo": "mariana.lopez@correo.mx",
  "contrasena": "Inclutec2026"
}
```

**Respuesta 200** ([Sesion](#obj-sesion)):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwicm9sIjoiY2FuZGlkYXRvIiwiZXhwIjoxNzkxMDgwMDAwfQ.firma",
  "token_type": "bearer",
  "expira_en": "2026-10-04T02:00:00Z",
  "usuario": {
    "id": 3,
    "correo": "mariana.lopez@correo.mx",
    "nombre": "Mariana",
    "apellidos": "López García",
    "telefono": "4427654321",
    "rol": "candidato",
    "estado": "activo",
    "empresa": null,
    "consentimiento_sensibles": true
  }
}
```

**Errores:** `401 credenciales_invalidas` Correo o contraseña incorrectos (mismo mensaje en ambos casos). · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál. · `423 cuenta_suspendida` La cuenta está suspendida o dada de baja. · `429 demasiados_intentos` Cinco intentos fallidos; incluye el encabezado `Retry-After` en segundos.

<a id="get-auth-me"></a>
#### `GET /auth/me` · Usuario de la sesión

**Rol:** cualquier usuario con sesión · **Trazabilidad:** MOV-00 RF-02 · CU-01

Sirve para validar un token guardado al abrir la app o el panel.

**Respuesta 200** ([Usuario](#obj-usuario)):

```json
{
  "id": 3,
  "correo": "mariana.lopez@correo.mx",
  "nombre": "Mariana",
  "apellidos": "López García",
  "telefono": "4427654321",
  "rol": "candidato",
  "estado": "activo",
  "empresa": null,
  "consentimiento_sensibles": true
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `423 cuenta_suspendida` La cuenta fue suspendida después de emitir el token.

<a id="post-auth-logout"></a>
#### `POST /auth/logout` · Cerrar sesión

**Rol:** cualquier usuario con sesión · **Trazabilidad:** CAN-03 RF-06

El JWT no se revoca en el servidor (expira solo); el cliente lo borra. Si se envía el token push, el dispositivo se da de baja.

**Cuerpo** ([Logout](#obj-logout)):

```json
{
  "expo_push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció.

<a id="post-auth-registro-candidato"></a>
#### `POST /auth/registro/candidato` · Registrar candidato

**Rol:** público · **Trazabilidad:** MOV-02 RF-02, RF-04 a RF-07 · CU-03

Crea la cuenta y su perfil vacío y devuelve la sesión iniciada. `consentimiento_sensibles = false` crea la cuenta con la sección de necesidades de ajuste deshabilitada.

**Cuerpo** ([RegistroCandidato](#obj-registrocandidato)):

```json
{
  "nombre": "Mariana",
  "apellidos": "López García",
  "correo": "mariana.lopez@correo.mx",
  "telefono": "4427654321",
  "municipio_id": 2,
  "contrasena": "Inclutec2026",
  "acepta_aviso": true,
  "consentimiento_sensibles": true
}
```

**Respuesta 201** ([Sesion](#obj-sesion)):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwicm9sIjoiY2FuZGlkYXRvIiwiZXhwIjoxNzkxMDgwMDAwfQ.firma",
  "token_type": "bearer",
  "expira_en": "2026-10-04T02:00:00Z",
  "usuario": {
    "id": 3,
    "correo": "mariana.lopez@correo.mx",
    "nombre": "Mariana",
    "apellidos": "López García",
    "telefono": "4427654321",
    "rol": "candidato",
    "estado": "activo",
    "empresa": null,
    "consentimiento_sensibles": true
  }
}
```

**Errores:** `409 correo_duplicado` El correo ya está registrado. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="post-auth-registro-reclutador"></a>
#### `POST /auth/registro/reclutador` · Registrar reclutador y empresa

**Rol:** público · **Trazabilidad:** MOV-02 RF-03 a RF-07 · CU-03

Crea la cuenta del reclutador y la empresa en estado «pendiente» y devuelve la sesión iniciada. En `usuario.empresa` viene el estado de la empresa.

**Cuerpo** ([RegistroReclutador](#obj-registroreclutador)):

```json
{
  "reclutador": {
    "nombre": "Laura",
    "apellidos": "Hernández Ruiz",
    "puesto": "Coordinadora de Recursos Humanos",
    "correo": "rh@tecnoqro.mx",
    "telefono": "4421234567",
    "contrasena": "Inclutec2026"
  },
  "empresa": {
    "razon_social": "Tecnologías Querétaro S.A. de C.V.",
    "nombre_comercial": "TecnoQro",
    "rfc": "TQU150312AB1",
    "sector_id": 4,
    "tamano_empresa_id": 3,
    "municipio_id": 3
  },
  "acepta_aviso": true
}
```

**Respuesta 201** ([Sesion](#obj-sesion)):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwicm9sIjoiY2FuZGlkYXRvIiwiZXhwIjoxNzkxMDgwMDAwfQ.firma",
  "token_type": "bearer",
  "expira_en": "2026-10-04T02:00:00Z",
  "usuario": {
    "id": 3,
    "correo": "mariana.lopez@correo.mx",
    "nombre": "Mariana",
    "apellidos": "López García",
    "telefono": "4427654321",
    "rol": "candidato",
    "estado": "activo",
    "empresa": null,
    "consentimiento_sensibles": true
  }
}
```

**Errores:** `409 correo_duplicado` El correo ya está registrado. · `409 rfc_duplicado` Otra empresa ya registró ese RFC; `campos` marca `empresa.rfc`. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="post-auth-password-solicitar"></a>
#### `POST /auth/password/solicitar` · Solicitar código de recuperación

**Rol:** público · **Trazabilidad:** MOV-03 RF-01, RF-04 · CU-04

Envía un código de 6 dígitos por correo, válido 15 minutos. Responde lo mismo exista o no la cuenta. Para reenviar deben pasar 60 s desde el envío anterior.

**Cuerpo** ([SolicitudCodigo](#obj-solicitudcodigo)):

```json
{
  "correo": "mariana.lopez@correo.mx"
}
```

**Respuesta 202** ([Mensaje](#obj-mensaje)):

```json
{
  "detail": "Si el correo está registrado, te enviamos un código de 6 dígitos."
}
```

**Errores:** `429 reenvio_prematuro` Aún no pasan 60 s; incluye `Retry-After`.

<a id="post-auth-password-verificar"></a>
#### `POST /auth/password/verificar` · Verificar código

**Rol:** público · **Trazabilidad:** MOV-03 RF-02 · CU-04

Comprueba el código sin consumirlo, para pasar al paso de nueva contraseña. Cada intento fallido cuenta (máximo 5).

**Cuerpo** ([VerificacionCodigo](#obj-verificacioncodigo)):

```json
{
  "correo": "mariana.lopez@correo.mx",
  "codigo": "123456"
}
```

**Respuesta 200** ([Mensaje](#obj-mensaje)):

```json
{
  "detail": "Código correcto."
}
```

**Errores:** `400 codigo_invalido` Código incorrecto; el mensaje dice cuántos intentos quedan. · `410 codigo_vencido` El código venció o se agotaron los 5 intentos; hay que pedir otro.

<a id="post-auth-password-restablecer"></a>
#### `POST /auth/password/restablecer` · Restablecer contraseña

**Rol:** público · **Trazabilidad:** MOV-03 RF-03 · CU-04

Valida de nuevo el código, guarda la nueva contraseña y marca el código como usado.

**Cuerpo** ([Restablecimiento](#obj-restablecimiento)):

```json
{
  "correo": "mariana.lopez@correo.mx",
  "codigo": "123456",
  "contrasena": "NuevaClave2026"
}
```

**Respuesta 200** ([Mensaje](#obj-mensaje)):

```json
{
  "detail": "Tu contraseña se actualizó. Ya puedes iniciar sesión."
}
```

**Errores:** `400 codigo_invalido` Código incorrecto. · `410 codigo_vencido` El código venció o ya se usó. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-auth-password"></a>
#### `PUT /auth/password` · Cambiar contraseña

**Rol:** cualquier usuario con sesión · **Trazabilidad:** CAN-03 RF-06, REC-01 RF-05

**Cuerpo** ([CambioContrasena](#obj-cambiocontrasena)):

```json
{
  "contrasena_actual": "Inclutec2026",
  "contrasena_nueva": "NuevaClave2026"
}
```

**Respuesta 204:** sin cuerpo.

**Errores:** `400 contrasena_incorrecta` La contraseña actual no coincide. · `401 no_autenticado` Falta el token, es inválido o ya venció. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

### Catálogos

<a id="get-catalogos-tipo"></a>
#### `GET /catalogos/{tipo}` · Catálogo activo

**Rol:** público (también se usa con sesión) · **Trazabilidad:** API RF-11, CAN-04 RF-04 · CU-03, CU-15

Devuelve un arreglo (sin paginar) de los registros activos, ordenados por nombre (niveles educativos por `orden`). `tipo`: `entidades`, `municipios`, `modalidades`, `jornadas`, `tipos-contrato`, `niveles-educativos`, `sectores`, `tamanos-empresa`, `categorias`, `habilidades`, `ajustes`, `motivos-reporte`.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `tipo` | ruta | texto | Tipo de catálogo. |
| `entidad_id` | query | entero | Solo `municipios`: filtra por entidad. |
| `categoria_id` | query | entero | Solo `habilidades`: filtra por categoría. |
| `q` | query | texto | Solo `habilidades`: autocompletado (mínimo 2 caracteres, máximo 20 resultados). |
| `aplica_a` | query | texto | Solo `motivos-reporte`: vacante, empresa o candidato (incluye los de «todos»). |

**Respuesta 200** (arreglo de [CatalogoItem](#obj-catalogoitem)):

```json
[
  {
    "id": 1,
    "nombre": "Python",
    "categoria_id": 1
  },
  {
    "id": 4,
    "nombre": "Soporte técnico",
    "categoria_id": 1
  }
]
```

**Errores:** `404 no_encontrado` El tipo de catálogo no existe.

### Notificaciones

<a id="post-dispositivos"></a>
#### `POST /dispositivos` · Registrar dispositivo para push

**Rol:** candidato, reclutador · **Trazabilidad:** MOV-04 RF-01 · CU-02

Si el token ya existe, se reasigna al usuario actual.

**Cuerpo** ([Dispositivo](#obj-dispositivo)):

```json
{
  "expo_push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "plataforma": "android"
}
```

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-notificaciones"></a>
#### `GET /notificaciones` · Mis notificaciones

**Rol:** candidato, reclutador · **Trazabilidad:** MOV-04 RF-02 · CU-05

Más recientes primero.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `20`. |
| `solo_no_leidas` | query | booleano | true para traer solo las no leídas. |

**Respuesta 200** ([PaginaNotificaciones](#obj-paginanotificaciones)):

```json
{
  "items": [
    {
      "id": 1,
      "tipo": "cambio_estado",
      "titulo": "Tu postulación avanzó",
      "mensaje": "Tu postulación a Técnico de soporte de TI pasó a Entrevista.",
      "referencia": {
        "tipo": "postulacion",
        "id": 1
      },
      "leida": false,
      "creado_en": "2026-10-02T16:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-notificaciones-resumen"></a>
#### `GET /notificaciones/resumen` · Contador de no leídas

**Rol:** candidato, reclutador · **Trazabilidad:** MOV-04 RF-03 · CU-05

Para el número de la barra de navegación.

**Respuesta 200** ([ResumenNotificaciones](#obj-resumennotificaciones)):

```json
{
  "no_leidas": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="patch-notificaciones-id-leida"></a>
#### `PATCH /notificaciones/{id}/leida` · Marcar una como leída

**Rol:** candidato, reclutador · **Trazabilidad:** MOV-04 RF-04 · CU-05

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="patch-notificaciones-leidas"></a>
#### `PATCH /notificaciones/leidas` · Marcar todas como leídas

**Rol:** candidato, reclutador · **Trazabilidad:** MOV-04 RF-04 · CU-05

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-notificaciones-preferencias"></a>
#### `GET /notificaciones/preferencias` · Preferencias de canal

**Rol:** candidato, reclutador · **Trazabilidad:** MOV-04 RF-06 · CU-05

Una fila por cada tipo de notificación que aplica al rol; si el usuario no ha cambiado nada, todo viene en true.

**Respuesta 200** (arreglo de [PreferenciaNotificacion](#obj-preferencianotificacion)):

```json
[
  {
    "tipo": "cambio_estado",
    "push": true,
    "correo": true
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="put-notificaciones-preferencias"></a>
#### `PUT /notificaciones/preferencias` · Guardar preferencias de canal

**Rol:** candidato, reclutador · **Trazabilidad:** MOV-04 RF-06 · CU-05

Recibe la lista completa y devuelve la lista guardada. La notificación dentro de la app siempre se genera.

**Cuerpo** (arreglo de [PreferenciaNotificacion](#obj-preferencianotificacion)):

```json
[
  {
    "tipo": "cambio_estado",
    "push": true,
    "correo": true
  }
]
```

**Respuesta 200** (arreglo de [PreferenciaNotificacion](#obj-preferencianotificacion)):

```json
[
  {
    "tipo": "cambio_estado",
    "push": true,
    "correo": true
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

### Perfil y CV del candidato

<a id="get-candidatos-me"></a>
#### `GET /candidatos/me` · Mi perfil

**Rol:** candidato · **Trazabilidad:** CAN-03 RF-01 a RF-05 · CU-08

**Respuesta 200** ([PerfilCandidato](#obj-perfilcandidato)):

```json
{
  "usuario": {
    "id": 3,
    "nombre": "Mariana",
    "apellidos": "López García",
    "correo": "mariana.lopez@correo.mx",
    "telefono": "4427654321"
  },
  "municipio": {
    "id": 2,
    "nombre": "El Marqués",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "jornada": {
    "id": 1,
    "nombre": "Tiempo completo"
  },
  "resumen": "Técnica en sistemas con experiencia en soporte y atención a usuarios.",
  "foto_url": null,
  "disponible_reubicacion": false,
  "modalidades": [
    {
      "id": 2,
      "nombre": "Remoto"
    },
    {
      "id": 3,
      "nombre": "Híbrido"
    }
  ],
  "categorias": [
    {
      "id": 1,
      "nombre": "Tecnologías de la información"
    }
  ],
  "compartir_ajustes": "preguntar",
  "consentimiento_sensibles_en": "2026-09-28T17:00:00Z",
  "necesidades": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad"
    }
  ],
  "nota_ajustes": null,
  "completitud": 90,
  "secciones_pendientes": [
    "foto"
  ],
  "perfil_minimo": true,
  "actualizado_en": "2026-09-30T17:00:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="put-candidatos-me"></a>
#### `PUT /candidatos/me` · Actualizar mi perfil

**Rol:** candidato · **Trazabilidad:** CAN-03 RF-01, RF-02, RF-04 · CU-08

Recalcula la completitud y la compatibilidad con las vacantes publicadas.

**Cuerpo** ([PerfilCandidatoEntrada](#obj-perfilcandidatoentrada)):

```json
{
  "nombre": "Mariana",
  "apellidos": "López García",
  "telefono": "4427654321",
  "municipio_id": 2,
  "jornada_id": 1,
  "resumen": "Técnica en sistemas con experiencia en soporte y atención a usuarios.",
  "disponible_reubicacion": false,
  "modalidad_ids": [
    2,
    3
  ],
  "categoria_ids": [
    1
  ],
  "compartir_ajustes": "preguntar"
}
```

**Respuesta 200** ([PerfilCandidato](#obj-perfilcandidato)):

```json
{
  "usuario": {
    "id": 3,
    "nombre": "Mariana",
    "apellidos": "López García",
    "correo": "mariana.lopez@correo.mx",
    "telefono": "4427654321"
  },
  "municipio": {
    "id": 2,
    "nombre": "El Marqués",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "jornada": {
    "id": 1,
    "nombre": "Tiempo completo"
  },
  "resumen": "Técnica en sistemas con experiencia en soporte y atención a usuarios.",
  "foto_url": null,
  "disponible_reubicacion": false,
  "modalidades": [
    {
      "id": 2,
      "nombre": "Remoto"
    },
    {
      "id": 3,
      "nombre": "Híbrido"
    }
  ],
  "categorias": [
    {
      "id": 1,
      "nombre": "Tecnologías de la información"
    }
  ],
  "compartir_ajustes": "preguntar",
  "consentimiento_sensibles_en": "2026-09-28T17:00:00Z",
  "necesidades": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad"
    }
  ],
  "nota_ajustes": null,
  "completitud": 90,
  "secciones_pendientes": [
    "foto"
  ],
  "perfil_minimo": true,
  "actualizado_en": "2026-09-30T17:00:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="post-candidatos-me-foto"></a>
#### `POST /candidatos/me/foto` · Subir foto

**Rol:** candidato · **Trazabilidad:** CAN-03 RF-01

**Cuerpo** (`multipart/form-data`): Campo `archivo`: JPG o PNG de hasta 2 MB. Reemplaza la anterior.

**Respuesta 200** ([Archivo](#obj-archivo)):

```json
{
  "url": "/archivos/fotos/candidato-3.jpg"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 archivo_invalido` No es JPG/PNG o supera 2 MB.

<a id="delete-candidatos-me-foto"></a>
#### `DELETE /candidatos/me/foto` · Quitar foto

**Rol:** candidato · **Trazabilidad:** CAN-03 RF-01

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="put-candidatos-me-consentimiento"></a>
#### `PUT /candidatos/me/consentimiento` · Otorgar o revocar consentimiento

**Rol:** candidato · **Trazabilidad:** MOV-02 RF-05, CAN-03 RF-03 · CU-08

Al revocarlo se borran las necesidades de ajuste y la nota, y se recalcula la compatibilidad.

**Cuerpo** ([Consentimiento](#obj-consentimiento)):

```json
{
  "otorgado": true
}
```

**Respuesta 200** ([PerfilCandidato](#obj-perfilcandidato)):

```json
{
  "usuario": {
    "id": 3,
    "nombre": "Mariana",
    "apellidos": "López García",
    "correo": "mariana.lopez@correo.mx",
    "telefono": "4427654321"
  },
  "municipio": {
    "id": 2,
    "nombre": "El Marqués",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "jornada": {
    "id": 1,
    "nombre": "Tiempo completo"
  },
  "resumen": "Técnica en sistemas con experiencia en soporte y atención a usuarios.",
  "foto_url": null,
  "disponible_reubicacion": false,
  "modalidades": [
    {
      "id": 2,
      "nombre": "Remoto"
    },
    {
      "id": 3,
      "nombre": "Híbrido"
    }
  ],
  "categorias": [
    {
      "id": 1,
      "nombre": "Tecnologías de la información"
    }
  ],
  "compartir_ajustes": "preguntar",
  "consentimiento_sensibles_en": "2026-09-28T17:00:00Z",
  "necesidades": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad"
    }
  ],
  "nota_ajustes": null,
  "completitud": 90,
  "secciones_pendientes": [
    "foto"
  ],
  "perfil_minimo": true,
  "actualizado_en": "2026-09-30T17:00:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="put-candidatos-me-necesidades"></a>
#### `PUT /candidatos/me/necesidades` · Guardar necesidades de ajuste

**Rol:** candidato · **Trazabilidad:** CAN-03 RF-03 · CU-08

Reemplaza la lista completa. Nunca se pide diagnóstico ni tipo de discapacidad.

**Cuerpo** ([NecesidadesEntrada](#obj-necesidadesentrada)):

```json
{
  "ajuste_ids": [
    1,
    3
  ],
  "nota_ajustes": null
}
```

**Respuesta 200** ([Necesidades](#obj-necesidades)):

```json
{
  "necesidades": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad"
    }
  ],
  "nota_ajustes": null
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_consentimiento` El candidato no ha otorgado el consentimiento. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="delete-candidatos-me"></a>
#### `DELETE /candidatos/me` · Eliminar mi cuenta

**Rol:** candidato · **Trazabilidad:** CAN-03 RF-07 · CU-08

Derecho ARCO de cancelación: baja lógica del usuario, borrado de necesidades, foto, CV y dispositivos; las postulaciones activas pasan a «retirada».

**Cuerpo** ([EliminarCuenta](#obj-eliminarcuenta)):

```json
{
  "contrasena": "Inclutec2026"
}
```

**Respuesta 204:** sin cuerpo.

**Errores:** `400 contrasena_incorrecta` La contraseña no coincide. · `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-candidatos-me-experiencias"></a>
#### `GET /candidatos/me/experiencias` · Mis experiencias

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-02 · CU-09

Ordenadas de la más reciente a la más antigua.

**Respuesta 200** (arreglo de [Experiencia](#obj-experiencia)):

```json
[
  {
    "id": 1,
    "puesto": "Auxiliar de soporte técnico",
    "empresa": "Servicios Integrales del Bajío",
    "fecha_inicio": "2023-02-01",
    "fecha_fin": "2025-06-30",
    "actual": false,
    "descripcion": "Atención de tickets y mantenimiento de equipos."
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="post-candidatos-me-experiencias"></a>
#### `POST /candidatos/me/experiencias` · Agregar experiencia

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-02 · CU-09

Recalcula completitud y compatibilidad (igual en editar y eliminar).

**Cuerpo** ([ExperienciaEntrada](#obj-experienciaentrada)):

```json
{
  "puesto": "Auxiliar de soporte técnico",
  "empresa": "Servicios Integrales del Bajío",
  "fecha_inicio": "2023-02-01",
  "fecha_fin": "2025-06-30",
  "actual": false,
  "descripcion": "Atención de tickets y mantenimiento de equipos."
}
```

**Respuesta 201** ([Experiencia](#obj-experiencia)):

```json
{
  "id": 1,
  "puesto": "Auxiliar de soporte técnico",
  "empresa": "Servicios Integrales del Bajío",
  "fecha_inicio": "2023-02-01",
  "fecha_fin": "2025-06-30",
  "actual": false,
  "descripcion": "Atención de tickets y mantenimiento de equipos."
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-candidatos-me-experiencias-id"></a>
#### `PUT /candidatos/me/experiencias/{id}` · Editar experiencia

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-02 · CU-09

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([ExperienciaEntrada](#obj-experienciaentrada)):

```json
{
  "puesto": "Auxiliar de soporte técnico",
  "empresa": "Servicios Integrales del Bajío",
  "fecha_inicio": "2023-02-01",
  "fecha_fin": "2025-06-30",
  "actual": false,
  "descripcion": "Atención de tickets y mantenimiento de equipos."
}
```

**Respuesta 200** ([Experiencia](#obj-experiencia)):

```json
{
  "id": 1,
  "puesto": "Auxiliar de soporte técnico",
  "empresa": "Servicios Integrales del Bajío",
  "fecha_inicio": "2023-02-01",
  "fecha_fin": "2025-06-30",
  "actual": false,
  "descripcion": "Atención de tickets y mantenimiento de equipos."
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="delete-candidatos-me-experiencias-id"></a>
#### `DELETE /candidatos/me/experiencias/{id}` · Eliminar experiencia

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-02 · CU-09

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="get-candidatos-me-formaciones"></a>
#### `GET /candidatos/me/formaciones` · Mis formaciones

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-03 · CU-09

**Respuesta 200** (arreglo de [Formacion](#obj-formacion)):

```json
[
  {
    "id": 1,
    "nivel_educativo": {
      "id": 4,
      "nombre": "Técnico superior universitario",
      "orden": 4
    },
    "institucion": "Universidad Tecnológica de Querétaro",
    "carrera": "TSU en Tecnologías de la Información",
    "estado": "concluida",
    "fecha_inicio": "2020-09-01",
    "fecha_fin": "2022-08-31"
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="post-candidatos-me-formaciones"></a>
#### `POST /candidatos/me/formaciones` · Agregar formación

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-03 · CU-09

**Cuerpo** ([FormacionEntrada](#obj-formacionentrada)):

```json
{
  "nivel_educativo_id": 4,
  "institucion": "Universidad Tecnológica de Querétaro",
  "carrera": "TSU en Tecnologías de la Información",
  "estado": "concluida",
  "fecha_inicio": "2020-09-01",
  "fecha_fin": "2022-08-31"
}
```

**Respuesta 201** ([Formacion](#obj-formacion)):

```json
{
  "id": 1,
  "nivel_educativo": {
    "id": 4,
    "nombre": "Técnico superior universitario",
    "orden": 4
  },
  "institucion": "Universidad Tecnológica de Querétaro",
  "carrera": "TSU en Tecnologías de la Información",
  "estado": "concluida",
  "fecha_inicio": "2020-09-01",
  "fecha_fin": "2022-08-31"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-candidatos-me-formaciones-id"></a>
#### `PUT /candidatos/me/formaciones/{id}` · Editar formación

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-03 · CU-09

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([FormacionEntrada](#obj-formacionentrada)):

```json
{
  "nivel_educativo_id": 4,
  "institucion": "Universidad Tecnológica de Querétaro",
  "carrera": "TSU en Tecnologías de la Información",
  "estado": "concluida",
  "fecha_inicio": "2020-09-01",
  "fecha_fin": "2022-08-31"
}
```

**Respuesta 200** ([Formacion](#obj-formacion)):

```json
{
  "id": 1,
  "nivel_educativo": {
    "id": 4,
    "nombre": "Técnico superior universitario",
    "orden": 4
  },
  "institucion": "Universidad Tecnológica de Querétaro",
  "carrera": "TSU en Tecnologías de la Información",
  "estado": "concluida",
  "fecha_inicio": "2020-09-01",
  "fecha_fin": "2022-08-31"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="delete-candidatos-me-formaciones-id"></a>
#### `DELETE /candidatos/me/formaciones/{id}` · Eliminar formación

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-03 · CU-09

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="get-candidatos-me-habilidades"></a>
#### `GET /candidatos/me/habilidades` · Mis habilidades

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-04 · CU-09

**Respuesta 200** (arreglo de [HabilidadCandidato](#obj-habilidadcandidato)):

```json
[
  {
    "id": 4,
    "nombre": "Soporte técnico",
    "nivel": "avanzado"
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="put-candidatos-me-habilidades"></a>
#### `PUT /candidatos/me/habilidades` · Guardar mis habilidades

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-04, RF-05 · CU-09

Reemplaza la lista completa.

**Cuerpo** ([HabilidadesEntrada](#obj-habilidadesentrada)):

```json
{
  "habilidades": [
    {
      "habilidad_id": 4,
      "nivel": "avanzado"
    },
    {
      "habilidad_id": 5,
      "nivel": "intermedio"
    },
    {
      "habilidad_id": 6,
      "nivel": "basico"
    },
    {
      "habilidad_id": 11,
      "nivel": "avanzado"
    }
  ]
}
```

**Respuesta 200** (arreglo de [HabilidadCandidato](#obj-habilidadcandidato)):

```json
[
  {
    "id": 4,
    "nombre": "Soporte técnico",
    "nivel": "avanzado"
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 limite_habilidades` Más de 30 habilidades o habilidades repetidas. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="get-candidatos-me-vista-previa"></a>
#### `GET /candidatos/me/vista-previa` · Vista previa de mi CV

**Rol:** candidato · **Trazabilidad:** CAN-04 RF-06

El CV tal como lo ve una empresa (sin correo ni teléfono, que solo se muestran desde el estado «entrevista»).

**Respuesta 200** ([CV](#obj-cv)):

```json
{
  "id": 3,
  "nombre": "Mariana",
  "apellidos": "López García",
  "foto_url": null,
  "municipio": {
    "id": 2,
    "nombre": "El Marqués",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "resumen": "Técnica en sistemas con experiencia en soporte y atención a usuarios.",
  "modalidades": [
    {
      "id": 2,
      "nombre": "Remoto"
    },
    {
      "id": 3,
      "nombre": "Híbrido"
    }
  ],
  "experiencias": [
    {
      "id": 1,
      "puesto": "Auxiliar de soporte técnico",
      "empresa": "Servicios Integrales del Bajío",
      "fecha_inicio": "2023-02-01",
      "fecha_fin": "2025-06-30",
      "actual": false,
      "descripcion": "Atención de tickets y mantenimiento de equipos."
    }
  ],
  "formaciones": [
    {
      "id": 1,
      "nivel_educativo": {
        "id": 4,
        "nombre": "Técnico superior universitario",
        "orden": 4
      },
      "institucion": "Universidad Tecnológica de Querétaro",
      "carrera": "TSU en Tecnologías de la Información",
      "estado": "concluida",
      "fecha_inicio": "2020-09-01",
      "fecha_fin": "2022-08-31"
    }
  ],
  "habilidades": [
    {
      "id": 4,
      "nombre": "Soporte técnico",
      "nivel": "avanzado"
    },
    {
      "id": 5,
      "nombre": "Redes",
      "nivel": "intermedio"
    },
    {
      "id": 6,
      "nombre": "Excel",
      "nivel": "basico"
    },
    {
      "id": 11,
      "nombre": "Comunicación escrita",
      "nivel": "avanzado"
    }
  ],
  "correo": null,
  "telefono": null
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

### Empresas

<a id="get-empresas"></a>
#### `GET /empresas` · Directorio de empresas

**Rol:** candidato, reclutador, administrador · **Trazabilidad:** CAN-07 RF-01 · CU-12

Solo empresas validadas, ordenadas por nombre comercial.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `q` | query | texto | Busca en el nombre comercial. |
| `sector_id` | query | entero | Filtra por sector. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `20`. |

**Respuesta 200** ([PaginaEmpresas](#obj-paginaempresas)):

```json
{
  "items": [
    {
      "id": 1,
      "nombre_comercial": "TecnoQro",
      "logo_url": "/archivos/logos/empresa-1.png",
      "sector": {
        "id": 4,
        "nombre": "Tecnologías de la información"
      },
      "tamano_empresa": {
        "id": 3,
        "nombre": "Mediana",
        "rango": "51 a 250 trabajadores"
      },
      "municipio": {
        "id": 3,
        "nombre": "Querétaro",
        "entidad": {
          "id": 22,
          "nombre": "Querétaro"
        }
      },
      "vacantes_publicadas": 1
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-empresas-id"></a>
#### `GET /empresas/{id}` · Ficha de empresa

**Rol:** candidato, reclutador, administrador · **Trazabilidad:** CAN-07 RF-02, RF-03 · CU-12

Datos públicos de una empresa validada más sus vacantes publicadas (con la compatibilidad si quien consulta es candidato).

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([EmpresaPublica](#obj-empresapublica)):

```json
{
  "id": 1,
  "nombre_comercial": "TecnoQro",
  "logo_url": "/archivos/logos/empresa-1.png",
  "sector": {
    "id": 4,
    "nombre": "Tecnologías de la información"
  },
  "tamano_empresa": {
    "id": 3,
    "nombre": "Mediana",
    "rango": "51 a 250 trabajadores"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "descripcion": "Empresa de desarrollo de software y soporte técnico.",
  "sitio_web": "https://tecnoqro.mx",
  "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
  "vacantes": [
    {
      "id": 1,
      "titulo": "Técnico de soporte de TI",
      "empresa": {
        "id": 1,
        "nombre_comercial": "TecnoQro",
        "logo_url": "/archivos/logos/empresa-1.png",
        "validada": true
      },
      "categoria": {
        "id": 1,
        "nombre": "Tecnologías de la información"
      },
      "modalidad": {
        "id": 3,
        "nombre": "Híbrido"
      },
      "jornada": {
        "id": 1,
        "nombre": "Tiempo completo"
      },
      "municipio": {
        "id": 3,
        "nombre": "Querétaro",
        "entidad": {
          "id": 22,
          "nombre": "Querétaro"
        }
      },
      "salario": {
        "min": 14000,
        "max": 18000
      },
      "compatibilidad": 88,
      "ajustes": [
        {
          "id": 1,
          "nombre": "Acceso con rampa",
          "categoria": "movilidad",
          "tipo": "existente"
        },
        {
          "id": 3,
          "nombre": "Baño accesible",
          "categoria": "movilidad",
          "tipo": "existente"
        },
        {
          "id": 12,
          "nombre": "Horario flexible",
          "categoria": "general",
          "tipo": "bajo_solicitud"
        }
      ],
      "cubre_mis_necesidades": true,
      "publicada_en": "2026-09-29T15:00:00Z",
      "postulacion_id": 1
    }
  ]
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="get-empresas-me"></a>
#### `GET /empresas/me` · Mi organización

**Rol:** reclutador · **Trazabilidad:** REC-01 RF-01, RF-02 · CU-13

**Respuesta 200** ([EmpresaPropia](#obj-empresapropia)):

```json
{
  "id": 1,
  "razon_social": "Tecnologías Querétaro S.A. de C.V.",
  "nombre_comercial": "TecnoQro",
  "rfc": "TQU150312AB1",
  "sector": {
    "id": 4,
    "nombre": "Tecnologías de la información"
  },
  "tamano_empresa": {
    "id": 3,
    "nombre": "Mediana",
    "rango": "51 a 250 trabajadores"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": "Empresa de desarrollo de software y soporte técnico.",
  "sitio_web": "https://tecnoqro.mx",
  "logo_url": "/archivos/logos/empresa-1.png",
  "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
  "documento_url": "/archivos/documentos/empresa-1.pdf",
  "estado": "validada",
  "motivo_estado": null,
  "validada_en": "2026-09-28T16:00:00Z",
  "datos_fiscales_editables": false
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="put-empresas-me"></a>
#### `PUT /empresas/me` · Actualizar mi organización

**Rol:** reclutador · **Trazabilidad:** REC-01 RF-01, RF-04 · CU-13

`razon_social` y `rfc` solo se aceptan mientras la empresa no esté validada.

**Cuerpo** ([EmpresaEntrada](#obj-empresaentrada)):

```json
{
  "nombre_comercial": "TecnoQro",
  "sector_id": 4,
  "tamano_empresa_id": 3,
  "municipio_id": 3,
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": "Empresa de desarrollo de software y soporte técnico.",
  "sitio_web": "https://tecnoqro.mx",
  "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica."
}
```

**Respuesta 200** ([EmpresaPropia](#obj-empresapropia)):

```json
{
  "id": 1,
  "razon_social": "Tecnologías Querétaro S.A. de C.V.",
  "nombre_comercial": "TecnoQro",
  "rfc": "TQU150312AB1",
  "sector": {
    "id": 4,
    "nombre": "Tecnologías de la información"
  },
  "tamano_empresa": {
    "id": 3,
    "nombre": "Mediana",
    "rango": "51 a 250 trabajadores"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": "Empresa de desarrollo de software y soporte técnico.",
  "sitio_web": "https://tecnoqro.mx",
  "logo_url": "/archivos/logos/empresa-1.png",
  "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
  "documento_url": "/archivos/documentos/empresa-1.pdf",
  "estado": "validada",
  "motivo_estado": null,
  "validada_en": "2026-09-28T16:00:00Z",
  "datos_fiscales_editables": false
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 datos_fiscales_bloqueados` Se intentó cambiar razón social o RFC de una empresa validada. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `409 rfc_duplicado` Otra empresa ya registró ese RFC. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="post-empresas-me-logo"></a>
#### `POST /empresas/me/logo` · Subir logotipo

**Rol:** reclutador · **Trazabilidad:** REC-01 RF-01

**Cuerpo** (`multipart/form-data`): Campo `archivo`: JPG o PNG de hasta 2 MB.

**Respuesta 200** ([Archivo](#obj-archivo)):

```json
{
  "url": "/archivos/logos/empresa-1.png"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 archivo_invalido` No es JPG/PNG o supera 2 MB.

<a id="post-empresas-me-documento"></a>
#### `POST /empresas/me/documento` · Subir constancia de situación fiscal

**Rol:** reclutador · **Trazabilidad:** REC-01 RF-03 · CU-13

Si la empresa estaba «rechazada», vuelve a «pendiente» para una nueva revisión.

**Cuerpo** (`multipart/form-data`): Campo `archivo`: PDF de hasta 5 MB.

**Respuesta 200** ([Archivo](#obj-archivo)):

```json
{
  "url": "/archivos/documentos/empresa-1.pdf"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `409 estado_invalido` La empresa ya está validada o suspendida. · `422 archivo_invalido` No es PDF o supera 5 MB.

<a id="get-empresas-me-vacantes"></a>
#### `GET /empresas/me/vacantes` · Vacantes de mi empresa

**Rol:** reclutador · **Trazabilidad:** REC-02 RF-01, RF-02 · CU-14

Más recientes primero.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `estado` | query | texto | borrador, publicada, pausada, cerrada o suspendida. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `20`. |

**Respuesta 200** ([PaginaVacantesReclutador](#obj-paginavacantesreclutador)):

```json
{
  "items": [
    {
      "id": 1,
      "titulo": "Técnico de soporte de TI",
      "estado": "publicada",
      "modalidad": {
        "id": 3,
        "nombre": "Híbrido"
      },
      "postulados": 1,
      "nuevas": 0,
      "publicada_en": "2026-09-29T15:00:00Z",
      "actualizado_en": "2026-09-29T15:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

### Vacantes y compatibilidad

<a id="get-vacantes-recomendadas"></a>
#### `GET /vacantes/recomendadas` · Vacantes recomendadas

**Rol:** candidato · **Trazabilidad:** CAN-01 RF-01, RF-06 · CU-06

Vacantes publicadas ordenadas por compatibilidad del candidato, de mayor a menor. Si el perfil no cumple el mínimo, igual responde, con `compatibilidad` calculada sobre lo que haya.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `20`. |

**Respuesta 200** ([PaginaVacantes](#obj-paginavacantes)):

```json
{
  "items": [
    {
      "id": 1,
      "titulo": "Técnico de soporte de TI",
      "empresa": {
        "id": 1,
        "nombre_comercial": "TecnoQro",
        "logo_url": "/archivos/logos/empresa-1.png",
        "validada": true
      },
      "categoria": {
        "id": 1,
        "nombre": "Tecnologías de la información"
      },
      "modalidad": {
        "id": 3,
        "nombre": "Híbrido"
      },
      "jornada": {
        "id": 1,
        "nombre": "Tiempo completo"
      },
      "municipio": {
        "id": 3,
        "nombre": "Querétaro",
        "entidad": {
          "id": 22,
          "nombre": "Querétaro"
        }
      },
      "salario": {
        "min": 14000,
        "max": 18000
      },
      "compatibilidad": 88,
      "ajustes": [
        {
          "id": 1,
          "nombre": "Acceso con rampa",
          "categoria": "movilidad",
          "tipo": "existente"
        },
        {
          "id": 3,
          "nombre": "Baño accesible",
          "categoria": "movilidad",
          "tipo": "existente"
        },
        {
          "id": 12,
          "nombre": "Horario flexible",
          "categoria": "general",
          "tipo": "bajo_solicitud"
        }
      ],
      "cubre_mis_necesidades": true,
      "publicada_en": "2026-09-29T15:00:00Z",
      "postulacion_id": 1
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-vacantes"></a>
#### `GET /vacantes` · Buscar vacantes

**Rol:** candidato · **Trazabilidad:** CAN-01 RF-02 a RF-05 · CU-06

Todos los filtros se combinan con «y». Solo vacantes publicadas de empresas validadas.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `q` | query | texto | Texto en título, descripción o nombre de la empresa (mínimo 3 caracteres). |
| `modalidad_id` | query | entero | Modalidad. |
| `categoria_id` | query | entero | Categoría. |
| `entidad_id` | query | entero | Entidad federativa. |
| `municipio_id` | query | entero | Municipio. |
| `jornada_id` | query | entero | Jornada. |
| `salario_min` | query | número | Vacantes cuyo salario máximo publicado es ≥ este valor. |
| `compatibilidad_min` | query | entero | Puntaje mínimo del candidato (0 a 100). |
| `ajuste_id` | query | lista de enteros | Uno o varios; vacantes que declaran todos esos ajustes (existente o bajo solicitud). Se repite el parámetro: `ajuste_id=1&ajuste_id=6`. |
| `cubre_mis_necesidades` | query | booleano | true: solo vacantes que cubren todas las necesidades del candidato. |
| `orden` | query | texto | `compatibilidad` (por omisión) o `recientes`. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `20`. |

**Respuesta 200** ([PaginaVacantes](#obj-paginavacantes)):

```json
{
  "items": [
    {
      "id": 1,
      "titulo": "Técnico de soporte de TI",
      "empresa": {
        "id": 1,
        "nombre_comercial": "TecnoQro",
        "logo_url": "/archivos/logos/empresa-1.png",
        "validada": true
      },
      "categoria": {
        "id": 1,
        "nombre": "Tecnologías de la información"
      },
      "modalidad": {
        "id": 3,
        "nombre": "Híbrido"
      },
      "jornada": {
        "id": 1,
        "nombre": "Tiempo completo"
      },
      "municipio": {
        "id": 3,
        "nombre": "Querétaro",
        "entidad": {
          "id": 22,
          "nombre": "Querétaro"
        }
      },
      "salario": {
        "min": 14000,
        "max": 18000
      },
      "compatibilidad": 88,
      "ajustes": [
        {
          "id": 1,
          "nombre": "Acceso con rampa",
          "categoria": "movilidad",
          "tipo": "existente"
        },
        {
          "id": 3,
          "nombre": "Baño accesible",
          "categoria": "movilidad",
          "tipo": "existente"
        },
        {
          "id": 12,
          "nombre": "Horario flexible",
          "categoria": "general",
          "tipo": "bajo_solicitud"
        }
      ],
      "cubre_mis_necesidades": true,
      "publicada_en": "2026-09-29T15:00:00Z",
      "postulacion_id": 1
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="get-vacantes-id"></a>
#### `GET /vacantes/{id}` · Detalle de vacante

**Rol:** candidato, reclutador (de su empresa), administrador · **Trazabilidad:** CAN-02 RF-01 a RF-03, WEB-05 RF-03 · CU-07, CU-23

El candidato solo ve vacantes publicadas (o a las que ya se postuló). El reclutador ve cualquier estado de las vacantes de su empresa.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([VacanteDetalle](#obj-vacantedetalle)):

```json
{
  "id": 1,
  "titulo": "Técnico de soporte de TI",
  "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro",
    "logo_url": "/archivos/logos/empresa-1.png",
    "validada": true
  },
  "categoria": {
    "id": 1,
    "nombre": "Tecnologías de la información"
  },
  "modalidad": {
    "id": 3,
    "nombre": "Híbrido"
  },
  "jornada": {
    "id": 1,
    "nombre": "Tiempo completo"
  },
  "tipo_contrato": {
    "id": 1,
    "nombre": "Indefinido"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "plazas": 2,
  "salario": {
    "min": 14000,
    "max": 18000
  },
  "mostrar_salario": true,
  "nivel_educativo": {
    "id": 4,
    "nombre": "Técnico superior universitario",
    "orden": 4
  },
  "experiencia_anios": 1,
  "habilidades": [
    {
      "id": 4,
      "nombre": "Soporte técnico",
      "obligatoria": true
    },
    {
      "id": 5,
      "nombre": "Redes",
      "obligatoria": true
    },
    {
      "id": 3,
      "nombre": "SQL",
      "obligatoria": true
    },
    {
      "id": 11,
      "nombre": "Comunicación escrita",
      "obligatoria": true
    },
    {
      "id": 2,
      "nombre": "JavaScript",
      "obligatoria": false
    },
    {
      "id": 6,
      "nombre": "Excel",
      "obligatoria": false
    }
  ],
  "ajustes": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad",
      "descripcion": "Entrada y áreas de trabajo accesibles en silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad",
      "descripcion": "Sanitario adaptado para personas usuarias de silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 12,
      "nombre": "Horario flexible",
      "categoria": "general",
      "descripcion": "Posibilidad de ajustar horarios de entrada y salida",
      "tipo": "bajo_solicitud"
    }
  ],
  "sin_condiciones_accesibilidad": false,
  "notas_accesibilidad": null,
  "estado": "publicada",
  "motivo_estado": null,
  "publicada_en": "2026-09-29T15:00:00Z",
  "actualizado_en": "2026-09-29T15:00:00Z",
  "postulacion_id": 1,
  "postulados": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="get-vacantes-id-compatibilidad"></a>
#### `GET /vacantes/{id}/compatibilidad` · Desglose de compatibilidad

**Rol:** candidato · **Trazabilidad:** CAN-02 RF-04 · CU-07

Se calcula al momento si no existe o está desactualizado.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([Compatibilidad](#obj-compatibilidad)):

```json
{
  "puntaje": 88,
  "componentes": {
    "h": 0.7,
    "a": 1.0,
    "m": 1.0,
    "f": 1.0
  },
  "habilidades": {
    "obligatorias_cumplidas": [
      {
        "id": 4,
        "nombre": "Soporte técnico"
      },
      {
        "id": 5,
        "nombre": "Redes"
      },
      {
        "id": 11,
        "nombre": "Comunicación escrita"
      }
    ],
    "obligatorias_faltantes": [
      {
        "id": 3,
        "nombre": "SQL"
      }
    ],
    "deseables_cumplidas": [
      {
        "id": 6,
        "nombre": "Excel"
      }
    ],
    "deseables_faltantes": [
      {
        "id": 2,
        "nombre": "JavaScript"
      }
    ]
  },
  "necesidades": {
    "cubiertas": [
      {
        "id": 1,
        "nombre": "Acceso con rampa",
        "categoria": "movilidad",
        "tipo": "existente"
      },
      {
        "id": 3,
        "nombre": "Baño accesible",
        "categoria": "movilidad",
        "tipo": "existente"
      }
    ],
    "no_cubiertas": []
  },
  "modalidad": {
    "vacante": {
      "id": 3,
      "nombre": "Híbrido"
    },
    "coincide": true
  },
  "formacion": {
    "requerida": {
      "id": 4,
      "nombre": "Técnico superior universitario",
      "orden": 4
    },
    "cumple": "si"
  },
  "calculado_en": "2026-09-30T17:20:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="post-vacantes"></a>
#### `POST /vacantes` · Crear vacante

**Rol:** reclutador · **Trazabilidad:** REC-03 RF-01 a RF-05 · CU-15

Con `estado = borrador` solo valida formatos. Con `estado = publicada` exige empresa validada, al menos una habilidad obligatoria, dirección si la modalidad es presencial o híbrida, y la sección de accesibilidad (ajustes o `sin_condiciones_accesibilidad = true`). Al publicar se calcula la compatibilidad con los candidatos.

**Cuerpo** ([VacanteEntrada](#obj-vacanteentrada)):

```json
{
  "titulo": "Técnico de soporte de TI",
  "categoria_id": 1,
  "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
  "jornada_id": 1,
  "tipo_contrato_id": 1,
  "plazas": 2,
  "modalidad_id": 3,
  "municipio_id": 3,
  "direccion": "Av. Constituyentes 100, Querétaro",
  "salario_min": 14000,
  "salario_max": 18000,
  "mostrar_salario": true,
  "nivel_educativo_id": 4,
  "experiencia_anios": 1,
  "habilidades": [
    {
      "habilidad_id": 4,
      "obligatoria": true
    },
    {
      "habilidad_id": 5,
      "obligatoria": true
    },
    {
      "habilidad_id": 3,
      "obligatoria": true
    },
    {
      "habilidad_id": 11,
      "obligatoria": true
    },
    {
      "habilidad_id": 2,
      "obligatoria": false
    },
    {
      "habilidad_id": 6,
      "obligatoria": false
    }
  ],
  "ajustes": [
    {
      "ajuste_id": 1,
      "tipo": "existente"
    },
    {
      "ajuste_id": 3,
      "tipo": "existente"
    },
    {
      "ajuste_id": 12,
      "tipo": "bajo_solicitud"
    }
  ],
  "sin_condiciones_accesibilidad": false,
  "notas_accesibilidad": null,
  "estado": "publicada"
}
```

**Respuesta 201** ([VacanteGuardada](#obj-vacanteguardada)):

```json
{
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI",
    "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro",
      "logo_url": "/archivos/logos/empresa-1.png",
      "validada": true
    },
    "categoria": {
      "id": 1,
      "nombre": "Tecnologías de la información"
    },
    "modalidad": {
      "id": 3,
      "nombre": "Híbrido"
    },
    "jornada": {
      "id": 1,
      "nombre": "Tiempo completo"
    },
    "tipo_contrato": {
      "id": 1,
      "nombre": "Indefinido"
    },
    "municipio": {
      "id": 3,
      "nombre": "Querétaro",
      "entidad": {
        "id": 22,
        "nombre": "Querétaro"
      }
    },
    "direccion": "Av. Constituyentes 100, Querétaro",
    "plazas": 2,
    "salario": {
      "min": 14000,
      "max": 18000
    },
    "mostrar_salario": true,
    "nivel_educativo": {
      "id": 4,
      "nombre": "Técnico superior universitario",
      "orden": 4
    },
    "experiencia_anios": 1,
    "habilidades": [
      {
        "id": 4,
        "nombre": "Soporte técnico",
        "obligatoria": true
      },
      {
        "id": 5,
        "nombre": "Redes",
        "obligatoria": true
      },
      {
        "id": 3,
        "nombre": "SQL",
        "obligatoria": true
      },
      {
        "id": 11,
        "nombre": "Comunicación escrita",
        "obligatoria": true
      },
      {
        "id": 2,
        "nombre": "JavaScript",
        "obligatoria": false
      },
      {
        "id": 6,
        "nombre": "Excel",
        "obligatoria": false
      }
    ],
    "ajustes": [
      {
        "id": 1,
        "nombre": "Acceso con rampa",
        "categoria": "movilidad",
        "descripcion": "Entrada y áreas de trabajo accesibles en silla de ruedas",
        "tipo": "existente"
      },
      {
        "id": 3,
        "nombre": "Baño accesible",
        "categoria": "movilidad",
        "descripcion": "Sanitario adaptado para personas usuarias de silla de ruedas",
        "tipo": "existente"
      },
      {
        "id": 12,
        "nombre": "Horario flexible",
        "categoria": "general",
        "descripcion": "Posibilidad de ajustar horarios de entrada y salida",
        "tipo": "bajo_solicitud"
      }
    ],
    "sin_condiciones_accesibilidad": false,
    "notas_accesibilidad": null,
    "estado": "publicada",
    "motivo_estado": null,
    "publicada_en": "2026-09-29T15:00:00Z",
    "actualizado_en": "2026-09-29T15:00:00Z",
    "postulacion_id": 1,
    "postulados": 1
  },
  "postulados_notificados": 0
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 empresa_no_validada` Se pidió publicar y la empresa no está validada. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `422 vacante_incompleta` Faltan datos para publicar; `campos` dice cuáles. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-vacantes-id"></a>
#### `PUT /vacantes/{id}` · Editar vacante

**Rol:** reclutador · **Trazabilidad:** REC-03 RF-05, RF-06 · CU-15

Mismas reglas que al crear. Si la vacante tiene postulados y cambian habilidades, formación, modalidad o ajustes, se recalcula la compatibilidad y se avisa a los postulados (`postulados_notificados`). Una vacante suspendida no se puede editar.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([VacanteEntrada](#obj-vacanteentrada)):

```json
{
  "titulo": "Técnico de soporte de TI",
  "categoria_id": 1,
  "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
  "jornada_id": 1,
  "tipo_contrato_id": 1,
  "plazas": 2,
  "modalidad_id": 3,
  "municipio_id": 3,
  "direccion": "Av. Constituyentes 100, Querétaro",
  "salario_min": 14000,
  "salario_max": 18000,
  "mostrar_salario": true,
  "nivel_educativo_id": 4,
  "experiencia_anios": 1,
  "habilidades": [
    {
      "habilidad_id": 4,
      "obligatoria": true
    },
    {
      "habilidad_id": 5,
      "obligatoria": true
    },
    {
      "habilidad_id": 3,
      "obligatoria": true
    },
    {
      "habilidad_id": 11,
      "obligatoria": true
    },
    {
      "habilidad_id": 2,
      "obligatoria": false
    },
    {
      "habilidad_id": 6,
      "obligatoria": false
    }
  ],
  "ajustes": [
    {
      "ajuste_id": 1,
      "tipo": "existente"
    },
    {
      "ajuste_id": 3,
      "tipo": "existente"
    },
    {
      "ajuste_id": 12,
      "tipo": "bajo_solicitud"
    }
  ],
  "sin_condiciones_accesibilidad": false,
  "notas_accesibilidad": null,
  "estado": "publicada"
}
```

**Respuesta 200** ([VacanteGuardada](#obj-vacanteguardada)):

```json
{
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI",
    "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro",
      "logo_url": "/archivos/logos/empresa-1.png",
      "validada": true
    },
    "categoria": {
      "id": 1,
      "nombre": "Tecnologías de la información"
    },
    "modalidad": {
      "id": 3,
      "nombre": "Híbrido"
    },
    "jornada": {
      "id": 1,
      "nombre": "Tiempo completo"
    },
    "tipo_contrato": {
      "id": 1,
      "nombre": "Indefinido"
    },
    "municipio": {
      "id": 3,
      "nombre": "Querétaro",
      "entidad": {
        "id": 22,
        "nombre": "Querétaro"
      }
    },
    "direccion": "Av. Constituyentes 100, Querétaro",
    "plazas": 2,
    "salario": {
      "min": 14000,
      "max": 18000
    },
    "mostrar_salario": true,
    "nivel_educativo": {
      "id": 4,
      "nombre": "Técnico superior universitario",
      "orden": 4
    },
    "experiencia_anios": 1,
    "habilidades": [
      {
        "id": 4,
        "nombre": "Soporte técnico",
        "obligatoria": true
      },
      {
        "id": 5,
        "nombre": "Redes",
        "obligatoria": true
      },
      {
        "id": 3,
        "nombre": "SQL",
        "obligatoria": true
      },
      {
        "id": 11,
        "nombre": "Comunicación escrita",
        "obligatoria": true
      },
      {
        "id": 2,
        "nombre": "JavaScript",
        "obligatoria": false
      },
      {
        "id": 6,
        "nombre": "Excel",
        "obligatoria": false
      }
    ],
    "ajustes": [
      {
        "id": 1,
        "nombre": "Acceso con rampa",
        "categoria": "movilidad",
        "descripcion": "Entrada y áreas de trabajo accesibles en silla de ruedas",
        "tipo": "existente"
      },
      {
        "id": 3,
        "nombre": "Baño accesible",
        "categoria": "movilidad",
        "descripcion": "Sanitario adaptado para personas usuarias de silla de ruedas",
        "tipo": "existente"
      },
      {
        "id": 12,
        "nombre": "Horario flexible",
        "categoria": "general",
        "descripcion": "Posibilidad de ajustar horarios de entrada y salida",
        "tipo": "bajo_solicitud"
      }
    ],
    "sin_condiciones_accesibilidad": false,
    "notas_accesibilidad": null,
    "estado": "publicada",
    "motivo_estado": null,
    "publicada_en": "2026-09-29T15:00:00Z",
    "actualizado_en": "2026-09-29T15:00:00Z",
    "postulacion_id": 1,
    "postulados": 1
  },
  "postulados_notificados": 0
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 empresa_no_validada` Se pidió publicar y la empresa no está validada. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 estado_invalido` La vacante está suspendida o cerrada. · `422 vacante_incompleta` Faltan datos para publicar. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="patch-vacantes-id-estado"></a>
#### `PATCH /vacantes/{id}/estado` · Publicar, pausar, reanudar o cerrar

**Rol:** reclutador · **Trazabilidad:** REC-02 RF-03, RF-05 · CU-14

Transiciones: borrador → publicada; publicada → pausada o cerrada; pausada → publicada o cerrada. Una vacante suspendida solo la reactiva el administrador.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([CambioEstadoVacante](#obj-cambioestadovacante)):

```json
{
  "estado": "pausada"
}
```

**Respuesta 200** ([VacanteDetalle](#obj-vacantedetalle)):

```json
{
  "id": 1,
  "titulo": "Técnico de soporte de TI",
  "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro",
    "logo_url": "/archivos/logos/empresa-1.png",
    "validada": true
  },
  "categoria": {
    "id": 1,
    "nombre": "Tecnologías de la información"
  },
  "modalidad": {
    "id": 3,
    "nombre": "Híbrido"
  },
  "jornada": {
    "id": 1,
    "nombre": "Tiempo completo"
  },
  "tipo_contrato": {
    "id": 1,
    "nombre": "Indefinido"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "plazas": 2,
  "salario": {
    "min": 14000,
    "max": 18000
  },
  "mostrar_salario": true,
  "nivel_educativo": {
    "id": 4,
    "nombre": "Técnico superior universitario",
    "orden": 4
  },
  "experiencia_anios": 1,
  "habilidades": [
    {
      "id": 4,
      "nombre": "Soporte técnico",
      "obligatoria": true
    },
    {
      "id": 5,
      "nombre": "Redes",
      "obligatoria": true
    },
    {
      "id": 3,
      "nombre": "SQL",
      "obligatoria": true
    },
    {
      "id": 11,
      "nombre": "Comunicación escrita",
      "obligatoria": true
    },
    {
      "id": 2,
      "nombre": "JavaScript",
      "obligatoria": false
    },
    {
      "id": 6,
      "nombre": "Excel",
      "obligatoria": false
    }
  ],
  "ajustes": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad",
      "descripcion": "Entrada y áreas de trabajo accesibles en silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad",
      "descripcion": "Sanitario adaptado para personas usuarias de silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 12,
      "nombre": "Horario flexible",
      "categoria": "general",
      "descripcion": "Posibilidad de ajustar horarios de entrada y salida",
      "tipo": "bajo_solicitud"
    }
  ],
  "sin_condiciones_accesibilidad": false,
  "notas_accesibilidad": null,
  "estado": "publicada",
  "motivo_estado": null,
  "publicada_en": "2026-09-29T15:00:00Z",
  "actualizado_en": "2026-09-29T15:00:00Z",
  "postulacion_id": 1,
  "postulados": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 empresa_no_validada` Publicar requiere empresa validada. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 transicion_invalida` La transición no está permitida desde el estado actual. · `422 vacante_incompleta` Faltan datos para publicar.

<a id="post-vacantes-id-duplicar"></a>
#### `POST /vacantes/{id}/duplicar` · Duplicar como borrador

**Rol:** reclutador · **Trazabilidad:** REC-02 RF-04 · CU-14

Copia datos, habilidades y ajustes; el título lleva « (copia)» y el estado es «borrador».

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 201** ([VacanteDetalle](#obj-vacantedetalle)):

```json
{
  "id": 1,
  "titulo": "Técnico de soporte de TI",
  "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro",
    "logo_url": "/archivos/logos/empresa-1.png",
    "validada": true
  },
  "categoria": {
    "id": 1,
    "nombre": "Tecnologías de la información"
  },
  "modalidad": {
    "id": 3,
    "nombre": "Híbrido"
  },
  "jornada": {
    "id": 1,
    "nombre": "Tiempo completo"
  },
  "tipo_contrato": {
    "id": 1,
    "nombre": "Indefinido"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "plazas": 2,
  "salario": {
    "min": 14000,
    "max": 18000
  },
  "mostrar_salario": true,
  "nivel_educativo": {
    "id": 4,
    "nombre": "Técnico superior universitario",
    "orden": 4
  },
  "experiencia_anios": 1,
  "habilidades": [
    {
      "id": 4,
      "nombre": "Soporte técnico",
      "obligatoria": true
    },
    {
      "id": 5,
      "nombre": "Redes",
      "obligatoria": true
    },
    {
      "id": 3,
      "nombre": "SQL",
      "obligatoria": true
    },
    {
      "id": 11,
      "nombre": "Comunicación escrita",
      "obligatoria": true
    },
    {
      "id": 2,
      "nombre": "JavaScript",
      "obligatoria": false
    },
    {
      "id": 6,
      "nombre": "Excel",
      "obligatoria": false
    }
  ],
  "ajustes": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad",
      "descripcion": "Entrada y áreas de trabajo accesibles en silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad",
      "descripcion": "Sanitario adaptado para personas usuarias de silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 12,
      "nombre": "Horario flexible",
      "categoria": "general",
      "descripcion": "Posibilidad de ajustar horarios de entrada y salida",
      "tipo": "bajo_solicitud"
    }
  ],
  "sin_condiciones_accesibilidad": false,
  "notas_accesibilidad": null,
  "estado": "publicada",
  "motivo_estado": null,
  "publicada_en": "2026-09-29T15:00:00Z",
  "actualizado_en": "2026-09-29T15:00:00Z",
  "postulacion_id": 1,
  "postulados": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="get-vacantes-id-postulaciones"></a>
#### `GET /vacantes/{id}/postulaciones` · Postulados de una vacante

**Rol:** reclutador · **Trazabilidad:** REC-04 RF-01 a RF-04 · CU-16

Ordenados por compatibilidad del reclutador (sin el componente A), de mayor a menor. Las necesidades de ajuste nunca afectan el orden.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |
| `estado` | query | texto | Estado de la postulación. |
| `compatibilidad_min` | query | entero | Puntaje mínimo (0 a 100). |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `20`. |

**Respuesta 200** ([PaginaPostulados](#obj-paginapostulados)):

```json
{
  "items": [
    {
      "postulacion_id": 1,
      "candidato": {
        "id": 3,
        "nombre": "Mariana",
        "apellidos": "López García",
        "foto_url": null
      },
      "compatibilidad": 83,
      "estado": "entrevista",
      "creado_en": "2026-09-30T17:20:00Z",
      "ajustes_por_confirmar": false
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` La vacante no es de la empresa del reclutador. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

### Postulaciones

<a id="post-postulaciones"></a>
#### `POST /postulaciones` · Postularme

**Rol:** candidato · **Trazabilidad:** CAN-02 RF-05 a RF-07 · CU-07

Crea la postulación en «postulada», registra el historial y avisa al reclutador. Si `compartir_ajustes` es true y el candidato no tiene consentimiento vigente, se guarda como false.

**Cuerpo** ([PostulacionEntrada](#obj-postulacionentrada)):

```json
{
  "vacante_id": 1,
  "mensaje": "Me interesa mucho el puesto; tengo experiencia en soporte.",
  "compartir_ajustes": true
}
```

**Respuesta 201** ([PostulacionDetalle](#obj-postulaciondetalle)):

```json
{
  "id": 1,
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI",
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro",
      "logo_url": "/archivos/logos/empresa-1.png"
    }
  },
  "estado": "postulada",
  "mensaje": "Me interesa mucho el puesto; tengo experiencia en soporte.",
  "comparte_ajustes": true,
  "creado_en": "2026-09-30T17:20:00Z",
  "actualizado_en": "2026-09-30T17:20:00Z",
  "historial": [
    {
      "estado_anterior": null,
      "estado_nuevo": "postulada",
      "mensaje": null,
      "creado_en": "2026-09-30T17:20:00Z"
    }
  ],
  "entrevista": null,
  "puede_retirar": true
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `409 postulacion_duplicada` Ya existe una postulación a esa vacante. · `409 vacante_no_disponible` La vacante ya no está publicada. · `422 perfil_incompleto` Falta nombre, municipio, una habilidad o una formación; `campos` lo indica. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="get-postulaciones-me"></a>
#### `GET /postulaciones/me` · Mis postulaciones

**Rol:** candidato · **Trazabilidad:** CAN-05 RF-01, RF-02 · CU-10

Más recientes primero.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `estado` | query | texto | Un estado de postulación. |
| `activas` | query | booleano | true: postulada, en_revision o entrevista; false: aceptada, no_seleccionada o retirada. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `20`. |

**Respuesta 200** ([PaginaPostulaciones](#obj-paginapostulaciones)):

```json
{
  "items": [
    {
      "id": 1,
      "vacante": {
        "id": 1,
        "titulo": "Técnico de soporte de TI",
        "empresa": {
          "id": 1,
          "nombre_comercial": "TecnoQro",
          "logo_url": "/archivos/logos/empresa-1.png"
        }
      },
      "estado": "entrevista",
      "creado_en": "2026-09-30T17:20:00Z",
      "actualizado_en": "2026-10-02T16:30:00Z",
      "entrevista_inicio": "2026-10-06T16:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-postulaciones-id"></a>
#### `GET /postulaciones/{id}` · Detalle de mi postulación

**Rol:** candidato · **Trazabilidad:** CAN-06 RF-01, RF-04 · CU-11

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([PostulacionDetalle](#obj-postulaciondetalle)):

```json
{
  "id": 1,
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI",
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro",
      "logo_url": "/archivos/logos/empresa-1.png"
    }
  },
  "estado": "entrevista",
  "mensaje": "Me interesa mucho el puesto; tengo experiencia en soporte.",
  "comparte_ajustes": true,
  "creado_en": "2026-09-30T17:20:00Z",
  "actualizado_en": "2026-10-02T16:30:00Z",
  "historial": [
    {
      "estado_anterior": null,
      "estado_nuevo": "postulada",
      "mensaje": null,
      "creado_en": "2026-09-30T17:20:00Z"
    },
    {
      "estado_anterior": "postulada",
      "estado_nuevo": "en_revision",
      "mensaje": null,
      "creado_en": "2026-10-01T15:10:00Z"
    },
    {
      "estado_anterior": "en_revision",
      "estado_nuevo": "entrevista",
      "mensaje": "Nos gustaría conocerte; agenda un horario.",
      "creado_en": "2026-10-02T16:30:00Z"
    }
  ],
  "entrevista": {
    "id": 1,
    "estado": "agendada",
    "inicio": "2026-10-06T16:00:00Z",
    "fin": "2026-10-06T16:45:00Z",
    "duracion_min": 45,
    "liga": "https://meet.google.com/abc-defg-hij",
    "puede_cancelar": true,
    "vacante": {
      "id": 1,
      "titulo": "Técnico de soporte de TI"
    },
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro"
    },
    "creado_en": "2026-10-02T19:05:00Z"
  },
  "puede_retirar": true
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="patch-postulaciones-id-retirar"></a>
#### `PATCH /postulaciones/{id}/retirar` · Retirar mi postulación

**Rol:** candidato · **Trazabilidad:** CAN-06 RF-06 · CU-11

Si tenía una entrevista agendada, se cancela y el horario vuelve a quedar libre.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([PostulacionDetalle](#obj-postulaciondetalle)):

```json
{
  "id": 1,
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI",
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro",
      "logo_url": "/archivos/logos/empresa-1.png"
    }
  },
  "estado": "retirada",
  "mensaje": "Me interesa mucho el puesto; tengo experiencia en soporte.",
  "comparte_ajustes": true,
  "creado_en": "2026-09-30T17:20:00Z",
  "actualizado_en": "2026-10-03T18:00:00Z",
  "historial": [
    {
      "estado_anterior": null,
      "estado_nuevo": "postulada",
      "mensaje": null,
      "creado_en": "2026-09-30T17:20:00Z"
    },
    {
      "estado_anterior": "postulada",
      "estado_nuevo": "en_revision",
      "mensaje": null,
      "creado_en": "2026-10-01T15:10:00Z"
    },
    {
      "estado_anterior": "en_revision",
      "estado_nuevo": "entrevista",
      "mensaje": "Nos gustaría conocerte; agenda un horario.",
      "creado_en": "2026-10-02T16:30:00Z"
    },
    {
      "estado_anterior": "entrevista",
      "estado_nuevo": "retirada",
      "mensaje": null,
      "creado_en": "2026-10-03T18:00:00Z"
    }
  ],
  "entrevista": null,
  "puede_retirar": false
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 transicion_invalida` La postulación ya está finalizada.

<a id="post-postulaciones-id-entrevista"></a>
#### `POST /postulaciones/{id}/entrevista` · Agendar entrevista

**Rol:** candidato · **Trazabilidad:** CAN-06 RF-03 · CU-11

Toma el horario dentro de una transacción con bloqueo (`SELECT … FOR UPDATE`). Solo si la postulación está en «entrevista» y no tiene otra entrevista agendada. Avisa al reclutador y envía la confirmación por correo a ambos.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([ReservaEntrevista](#obj-reservaentrevista)):

```json
{
  "horario_id": 2
}
```

**Respuesta 201** ([Entrevista](#obj-entrevista)):

```json
{
  "id": 1,
  "estado": "agendada",
  "inicio": "2026-10-06T16:00:00Z",
  "fin": "2026-10-06T16:45:00Z",
  "duracion_min": 45,
  "liga": "https://meet.google.com/abc-defg-hij",
  "puede_cancelar": true,
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI"
  },
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro"
  },
  "creado_en": "2026-10-02T19:05:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 horario_ocupado` Otro candidato acaba de tomar ese horario. · `409 estado_invalido` La postulación no está en «entrevista» o ya tiene una entrevista agendada.

<a id="get-postulaciones-id-candidato"></a>
#### `GET /postulaciones/{id}/candidato` · Detalle del postulado

**Rol:** reclutador · **Trazabilidad:** REC-05 RF-01 a RF-03, RF-06 · CU-17

Al abrirlo por primera vez, una postulación «postulada» no cambia de estado sola; el reclutador la mueve a «en_revision».

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([PostuladoDetalle](#obj-postuladodetalle)):

```json
{
  "postulacion": {
    "id": 1,
    "estado": "entrevista",
    "mensaje": "Me interesa mucho el puesto; tengo experiencia en soporte.",
    "creado_en": "2026-09-30T17:20:00Z",
    "historial": [
      {
        "estado_anterior": null,
        "estado_nuevo": "postulada",
        "mensaje": null,
        "creado_en": "2026-09-30T17:20:00Z"
      },
      {
        "estado_anterior": "postulada",
        "estado_nuevo": "en_revision",
        "mensaje": null,
        "creado_en": "2026-10-01T15:10:00Z"
      },
      {
        "estado_anterior": "en_revision",
        "estado_nuevo": "entrevista",
        "mensaje": "Nos gustaría conocerte; agenda un horario.",
        "creado_en": "2026-10-02T16:30:00Z"
      }
    ]
  },
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI"
  },
  "candidato": {
    "id": 3,
    "nombre": "Mariana",
    "apellidos": "López García",
    "foto_url": null,
    "municipio": {
      "id": 2,
      "nombre": "El Marqués",
      "entidad": {
        "id": 22,
        "nombre": "Querétaro"
      }
    },
    "resumen": "Técnica en sistemas con experiencia en soporte y atención a usuarios.",
    "modalidades": [
      {
        "id": 2,
        "nombre": "Remoto"
      },
      {
        "id": 3,
        "nombre": "Híbrido"
      }
    ],
    "experiencias": [
      {
        "id": 1,
        "puesto": "Auxiliar de soporte técnico",
        "empresa": "Servicios Integrales del Bajío",
        "fecha_inicio": "2023-02-01",
        "fecha_fin": "2025-06-30",
        "actual": false,
        "descripcion": "Atención de tickets y mantenimiento de equipos."
      }
    ],
    "formaciones": [
      {
        "id": 1,
        "nivel_educativo": {
          "id": 4,
          "nombre": "Técnico superior universitario",
          "orden": 4
        },
        "institucion": "Universidad Tecnológica de Querétaro",
        "carrera": "TSU en Tecnologías de la Información",
        "estado": "concluida",
        "fecha_inicio": "2020-09-01",
        "fecha_fin": "2022-08-31"
      }
    ],
    "habilidades": [
      {
        "id": 4,
        "nombre": "Soporte técnico",
        "nivel": "avanzado"
      },
      {
        "id": 5,
        "nombre": "Redes",
        "nivel": "intermedio"
      },
      {
        "id": 6,
        "nombre": "Excel",
        "nivel": "basico"
      },
      {
        "id": 11,
        "nombre": "Comunicación escrita",
        "nivel": "avanzado"
      }
    ],
    "correo": "mariana.lopez@correo.mx",
    "telefono": "4427654321"
  },
  "compatibilidad": {
    "puntaje": 83,
    "componentes": {
      "h": 0.7,
      "m": 1.0,
      "f": 1.0
    },
    "habilidades": {
      "obligatorias_cumplidas": [
        {
          "id": 4,
          "nombre": "Soporte técnico"
        },
        {
          "id": 5,
          "nombre": "Redes"
        },
        {
          "id": 11,
          "nombre": "Comunicación escrita"
        }
      ],
      "obligatorias_faltantes": [
        {
          "id": 3,
          "nombre": "SQL"
        }
      ],
      "deseables_cumplidas": [
        {
          "id": 6,
          "nombre": "Excel"
        }
      ],
      "deseables_faltantes": [
        {
          "id": 2,
          "nombre": "JavaScript"
        }
      ]
    },
    "modalidad": {
      "vacante": {
        "id": 3,
        "nombre": "Híbrido"
      },
      "coincide": true
    },
    "formacion": {
      "requerida": {
        "id": 4,
        "nombre": "Técnico superior universitario",
        "orden": 4
      },
      "cumple": "si"
    }
  },
  "necesidades": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad",
      "estado": "existente"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad",
      "estado": "existente"
    }
  ],
  "nota_ajustes": null,
  "transiciones_permitidas": [
    "aceptada",
    "no_seleccionada"
  ],
  "entrevista": {
    "id": 1,
    "estado": "agendada",
    "inicio": "2026-10-06T16:00:00Z",
    "fin": "2026-10-06T16:45:00Z",
    "duracion_min": 45,
    "liga": "https://meet.google.com/abc-defg-hij",
    "puede_cancelar": false,
    "vacante": {
      "id": 1,
      "titulo": "Técnico de soporte de TI"
    },
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro"
    },
    "creado_en": "2026-10-02T19:05:00Z"
  }
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` La postulación no es de una vacante de su empresa. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="patch-postulaciones-id-estado"></a>
#### `PATCH /postulaciones/{id}/estado` · Cambiar estado de la postulación

**Rol:** reclutador · **Trazabilidad:** REC-05 RF-04 · CU-17

Transiciones: postulada → en_revision o no_seleccionada; en_revision → entrevista o no_seleccionada; entrevista → aceptada o no_seleccionada. Registra el historial y notifica al candidato por app, push y correo.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([CambioEstadoPostulacion](#obj-cambioestadopostulacion)):

```json
{
  "estado": "aceptada",
  "mensaje": "¡Felicidades! Te contactaremos para la contratación."
}
```

**Respuesta 200** ([ResultadoCambioEstado](#obj-resultadocambioestado)):

```json
{
  "id": 1,
  "estado": "aceptada",
  "historial": [
    {
      "estado_anterior": null,
      "estado_nuevo": "postulada",
      "mensaje": null,
      "creado_en": "2026-09-30T17:20:00Z"
    },
    {
      "estado_anterior": "postulada",
      "estado_nuevo": "en_revision",
      "mensaje": null,
      "creado_en": "2026-10-01T15:10:00Z"
    },
    {
      "estado_anterior": "en_revision",
      "estado_nuevo": "entrevista",
      "mensaje": "Nos gustaría conocerte; agenda un horario.",
      "creado_en": "2026-10-02T16:30:00Z"
    },
    {
      "estado_anterior": "entrevista",
      "estado_nuevo": "aceptada",
      "mensaje": "¡Felicidades! Te contactaremos para la contratación.",
      "creado_en": "2026-10-03T18:00:00Z"
    }
  ],
  "transiciones_permitidas": []
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 transicion_invalida` La transición no está permitida desde el estado actual. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="get-postulaciones-id-observaciones"></a>
#### `GET /postulaciones/{id}/observaciones` · Observaciones internas

**Rol:** reclutador · **Trazabilidad:** REC-05 RF-05 · CU-17

Más recientes primero. El candidato nunca las ve.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** (arreglo de [Observacion](#obj-observacion)):

```json
[
  {
    "id": 1,
    "texto": "Perfil sólido en soporte; confirmar disponibilidad de horario.",
    "autor": {
      "id": 2,
      "nombre": "Laura",
      "apellidos": "Hernández Ruiz"
    },
    "creado_en": "2026-10-01T15:12:00Z"
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="post-postulaciones-id-observaciones"></a>
#### `POST /postulaciones/{id}/observaciones` · Agregar observación interna

**Rol:** reclutador · **Trazabilidad:** REC-05 RF-05 · CU-17

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([ObservacionEntrada](#obj-observacionentrada)):

```json
{
  "texto": "Perfil sólido en soporte; confirmar disponibilidad de horario."
}
```

**Respuesta 201** ([Observacion](#obj-observacion)):

```json
{
  "id": 1,
  "texto": "Perfil sólido en soporte; confirmar disponibilidad de horario.",
  "autor": {
    "id": 2,
    "nombre": "Laura",
    "apellidos": "Hernández Ruiz"
  },
  "creado_en": "2026-10-01T15:12:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

### Horarios y entrevistas

<a id="post-horarios-entrevista"></a>
#### `POST /horarios-entrevista` · Publicar horario

**Rol:** reclutador · **Trazabilidad:** REC-06 RF-01 · CU-18

La fecha debe ser futura y no traslaparse con otro horario vigente del mismo reclutador.

**Cuerpo** ([HorarioEntrada](#obj-horarioentrada)):

```json
{
  "vacante_id": 1,
  "inicio": "2026-10-06T17:00:00Z",
  "duracion_min": 45,
  "liga": "https://meet.google.com/abc-defg-hij"
}
```

**Respuesta 201** ([Horario](#obj-horario)):

```json
{
  "id": 2,
  "vacante_id": 1,
  "inicio": "2026-10-06T17:00:00Z",
  "fin": "2026-10-06T17:45:00Z",
  "duracion_min": 45,
  "estado": "libre",
  "liga": "https://meet.google.com/abc-defg-hij"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 horario_traslapado` Se cruza con otro horario del reclutador. · `422 validacion` Fecha pasada, duración distinta de 30/45/60 o liga que no es de Meet o Teams.

<a id="get-horarios-entrevista"></a>
#### `GET /horarios-entrevista` · Horarios disponibles de una vacante

**Rol:** candidato · **Trazabilidad:** CAN-06 RF-02 · CU-11

Solo si el candidato tiene una postulación en «entrevista» para esa vacante. Devuelve los horarios libres y futuros, sin la liga.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `vacante_id` | query | entero | Vacante. Obligatorio. |
| `disponible` | query | booleano | Siempre true para el candidato. Por omisión: `True`. |

**Respuesta 200** (arreglo de [Horario](#obj-horario)):

```json
[
  {
    "id": 2,
    "vacante_id": 1,
    "inicio": "2026-10-06T17:00:00Z",
    "fin": "2026-10-06T17:45:00Z",
    "duracion_min": 45,
    "estado": "libre",
    "liga": null
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El candidato no está en etapa de entrevista para esa vacante.

<a id="delete-horarios-entrevista-id"></a>
#### `DELETE /horarios-entrevista/{id}` · Eliminar horario libre

**Rol:** reclutador · **Trazabilidad:** REC-06 RF-03 · CU-18

Para un horario agendado se usa `PATCH /entrevistas/{id}` con estado «cancelada».

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 estado_invalido` El horario ya está agendado.

<a id="get-entrevistas-me"></a>
#### `GET /entrevistas/me` · Mi agenda

**Rol:** reclutador · **Trazabilidad:** REC-06 RF-02 · CU-18

Horarios del reclutador (libres y agendados) agrupados por día, en orden cronológico. Por omisión, desde hoy hasta 30 días después.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `desde` | query | texto | Fecha AAAA-MM-DD. |
| `hasta` | query | texto | Fecha AAAA-MM-DD. |
| `vacante_id` | query | entero | Filtra por vacante. |

**Respuesta 200** (arreglo de [DiaAgenda](#obj-diaagenda)):

```json
[
  {
    "fecha": "2026-10-06",
    "horarios": [
      {
        "id": 1,
        "inicio": "2026-10-06T16:00:00Z",
        "fin": "2026-10-06T16:45:00Z",
        "duracion_min": 45,
        "liga": "https://meet.google.com/abc-defg-hij",
        "estado": "agendado",
        "vacante": {
          "id": 1,
          "titulo": "Técnico de soporte de TI"
        },
        "entrevista": {
          "id": 1,
          "estado": "agendada",
          "postulacion_id": 1,
          "candidato": {
            "id": 3,
            "nombre": "Mariana",
            "apellidos": "López García"
          }
        }
      },
      {
        "id": 2,
        "inicio": "2026-10-06T17:00:00Z",
        "fin": "2026-10-06T17:45:00Z",
        "duracion_min": 45,
        "liga": "https://meet.google.com/abc-defg-hij",
        "estado": "libre",
        "vacante": {
          "id": 1,
          "titulo": "Técnico de soporte de TI"
        },
        "entrevista": null
      }
    ]
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="patch-entrevistas-id"></a>
#### `PATCH /entrevistas/{id}` · Registrar resultado o cancelar

**Rol:** reclutador · **Trazabilidad:** REC-06 RF-03, RF-04 · CU-18

«realizada» y «no_asistio» solo después de la hora de inicio. «cancelada» exige motivo, libera el horario como «cancelado» y avisa al candidato por app y correo.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([ResultadoEntrevista](#obj-resultadoentrevista)):

```json
{
  "estado": "realizada",
  "motivo_cancelacion": null
}
```

**Respuesta 200** ([Entrevista](#obj-entrevista)):

```json
{
  "id": 1,
  "estado": "realizada",
  "inicio": "2026-10-06T16:00:00Z",
  "fin": "2026-10-06T16:45:00Z",
  "duracion_min": 45,
  "liga": "https://meet.google.com/abc-defg-hij",
  "puede_cancelar": false,
  "vacante": {
    "id": 1,
    "titulo": "Técnico de soporte de TI"
  },
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro"
  },
  "creado_en": "2026-10-02T19:05:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 transicion_invalida` La entrevista ya tiene resultado o aún no ocurre. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="delete-entrevistas-id"></a>
#### `DELETE /entrevistas/{id}` · Cancelar mi entrevista

**Rol:** candidato · **Trazabilidad:** CAN-06 RF-05 · CU-11

Solo con al menos 24 h de anticipación. El horario vuelve a quedar libre y se avisa al reclutador.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([CancelacionCandidato](#obj-cancelacioncandidato)):

```json
{
  "motivo": "Tengo un compromiso médico ese día."
}
```

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 cancelacion_tardia` Faltan menos de 24 h para la entrevista.

### Reportes

<a id="post-reportes"></a>
#### `POST /reportes` · Reportar vacante, empresa o candidato

**Rol:** candidato, reclutador · **Trazabilidad:** CAN-02 RF-08, CAN-07 RF-04, REC-05 RF-07 · CU-07, CU-12, CU-17

El candidato reporta vacantes o empresas; el reclutador reporta candidatos que se postularon a sus vacantes.

**Cuerpo** ([ReporteEntrada](#obj-reporteentrada)):

```json
{
  "motivo_reporte_id": 2,
  "vacante_id": 5,
  "descripcion": "El salario publicado no coincide con lo que me dijeron por teléfono."
}
```

**Respuesta 201** ([ReporteCreado](#obj-reportecreado)):

```json
{
  "id": 1,
  "estado": "abierto",
  "creado_en": "2026-10-03T18:00:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `422 validacion` No se indicó exactamente un elemento, o el motivo no aplica a ese tipo.

### Administración: estadísticas

<a id="get-admin-estadisticas-resumen"></a>
#### `GET /admin/estadisticas/resumen` · Indicadores y gráficas

**Rol:** administrador · **Trazabilidad:** WEB-02 RF-01 a RF-05, RF-07 · CU-20

Por omisión, los últimos 30 días.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `desde` | query | texto | AAAA-MM-DD. |
| `hasta` | query | texto | AAAA-MM-DD. |

**Respuesta 200** ([Estadisticas](#obj-estadisticas)):

```json
{
  "periodo": {
    "desde": "2026-09-03",
    "hasta": "2026-10-03"
  },
  "indicadores": {
    "candidatos_activos": 2,
    "empresas_validadas": 3,
    "vacantes_publicadas": 6,
    "postulaciones": 2,
    "contrataciones": 0,
    "tasa_colocacion": 0.0
  },
  "pendientes": {
    "empresas_por_validar": 1,
    "reportes_abiertos": 1
  },
  "graficas": {
    "postulaciones_por_estado": [
      {
        "etiqueta": "entrevista",
        "total": 1
      }
    ],
    "vacantes_por_modalidad": [
      {
        "etiqueta": "Híbrido",
        "total": 1
      }
    ],
    "vacantes_por_categoria": [
      {
        "etiqueta": "Tecnologías de la información",
        "total": 1
      }
    ],
    "evolucion_mensual": [
      {
        "mes": "2026-09",
        "postulaciones": 1,
        "contrataciones": 0
      },
      {
        "mes": "2026-10",
        "postulaciones": 0,
        "contrataciones": 0
      }
    ],
    "brecha_ajustes": [
      {
        "etiqueta": "Acceso con rampa",
        "solicitados": 1,
        "ofrecidos": 1
      },
      {
        "etiqueta": "Baño accesible",
        "solicitados": 1,
        "ofrecidos": 1
      },
      {
        "etiqueta": "Horario flexible",
        "solicitados": 0,
        "ofrecidos": 1
      }
    ],
    "brecha_habilidades": [
      {
        "etiqueta": "SQL",
        "demandadas": 1,
        "registradas": 1
      },
      {
        "etiqueta": "Soporte técnico",
        "demandadas": 1,
        "registradas": 1
      }
    ]
  }
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-admin-estadisticas-exportar"></a>
#### `GET /admin/estadisticas/exportar` · Exportar estadísticas

**Rol:** administrador · **Trazabilidad:** WEB-02 RF-06 · CU-20

Devuelve el archivo con `Content-Disposition: attachment`. El panel lo reenvía al navegador.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `formato` | query | texto | `pdf` o `xlsx`. Obligatorio. |
| `desde` | query | texto | AAAA-MM-DD. |
| `hasta` | query | texto | AAAA-MM-DD. |

**Respuesta 200:** archivo (application/pdf o application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

### Administración: usuarios

<a id="get-admin-usuarios"></a>
#### `GET /admin/usuarios` · Listar usuarios

**Rol:** administrador · **Trazabilidad:** WEB-03 RF-01, RF-02 · CU-21

Más recientes primero.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `q` | query | texto | Busca en nombre, apellidos o correo. |
| `rol` | query | texto | candidato, reclutador o administrador. |
| `estado` | query | texto | activo, suspendido o eliminado. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `25`. |

**Respuesta 200** ([PaginaUsuarios](#obj-paginausuarios)):

```json
{
  "items": [
    {
      "id": 2,
      "nombre": "Laura",
      "apellidos": "Hernández Ruiz",
      "correo": "rh@tecnoqro.mx",
      "telefono": "4421234567",
      "rol": "reclutador",
      "estado": "activo",
      "empresa": {
        "id": 1,
        "nombre_comercial": "TecnoQro"
      },
      "creado_en": "2026-09-28T15:00:00Z",
      "ultimo_acceso_en": "2026-10-02T16:25:00Z"
    }
  ],
  "total": 7,
  "page": 1,
  "size": 25
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-admin-usuarios-id"></a>
#### `GET /admin/usuarios/{id}` · Detalle de usuario

**Rol:** administrador · **Trazabilidad:** WEB-03 RF-06 · CU-21

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([UsuarioAdminDetalle](#obj-usuarioadmindetalle)):

```json
{
  "usuario": {
    "id": 2,
    "nombre": "Laura",
    "apellidos": "Hernández Ruiz",
    "correo": "rh@tecnoqro.mx",
    "telefono": "4421234567",
    "rol": "reclutador",
    "estado": "activo",
    "empresa": {
      "id": 1,
      "nombre_comercial": "TecnoQro"
    },
    "creado_en": "2026-09-28T15:00:00Z",
    "ultimo_acceso_en": "2026-10-02T16:25:00Z"
  },
  "motivo_estado": null,
  "puesto": "Coordinadora de Recursos Humanos",
  "totales": {
    "postulaciones": null,
    "vacantes": 1,
    "reportes_recibidos": 0,
    "reportes_hechos": 0
  }
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="post-admin-usuarios"></a>
#### `POST /admin/usuarios` · Crear usuario

**Rol:** administrador · **Trazabilidad:** WEB-03 RF-03 · CU-21

La contraseña es obligatoria al crear. Un candidato creado aquí empieza sin consentimiento de datos sensibles.

**Cuerpo** ([UsuarioAdminEntrada](#obj-usuarioadminentrada)):

```json
{
  "rol": "administrador",
  "nombre": "Isay",
  "apellidos": "Guerra López",
  "correo": "isay@inclutec.mx",
  "telefono": null,
  "contrasena": "Inclutec2026",
  "empresa_id": null,
  "puesto": null
}
```

**Respuesta 201** ([UsuarioAdmin](#obj-usuarioadmin)):

```json
{
  "id": 2,
  "nombre": "Laura",
  "apellidos": "Hernández Ruiz",
  "correo": "rh@tecnoqro.mx",
  "telefono": "4421234567",
  "rol": "reclutador",
  "estado": "activo",
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro"
  },
  "creado_en": "2026-09-28T15:00:00Z",
  "ultimo_acceso_en": "2026-10-02T16:25:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `409 correo_duplicado` El correo ya está registrado. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-admin-usuarios-id"></a>
#### `PUT /admin/usuarios/{id}` · Editar usuario

**Rol:** administrador · **Trazabilidad:** WEB-03 RF-04 · CU-21

Sin `contrasena`. Cambiar el rol solo se permite si el usuario no tiene postulaciones (candidato) ni vacantes (reclutador).

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([UsuarioAdminEntrada](#obj-usuarioadminentrada)):

```json
{
  "rol": "administrador",
  "nombre": "Isay",
  "apellidos": "Guerra López",
  "correo": "isay@inclutec.mx",
  "telefono": null,
  "contrasena": "Inclutec2026",
  "empresa_id": null,
  "puesto": null
}
```

**Respuesta 200** ([UsuarioAdmin](#obj-usuarioadmin)):

```json
{
  "id": 2,
  "nombre": "Laura",
  "apellidos": "Hernández Ruiz",
  "correo": "rh@tecnoqro.mx",
  "telefono": "4421234567",
  "rol": "reclutador",
  "estado": "activo",
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro"
  },
  "creado_en": "2026-09-28T15:00:00Z",
  "ultimo_acceso_en": "2026-10-02T16:25:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 correo_duplicado` El correo ya está registrado. · `409 en_uso` No se puede cambiar el rol: tiene postulaciones o vacantes. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="patch-admin-usuarios-id-estado"></a>
#### `PATCH /admin/usuarios/{id}/estado` · Suspender, reactivar o dar de baja

**Rol:** administrador · **Trazabilidad:** WEB-03 RF-05 · CU-21

Nunca se borra físicamente. Un usuario suspendido no puede iniciar sesión (423).

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([CambioEstadoUsuario](#obj-cambioestadousuario)):

```json
{
  "estado": "suspendido",
  "motivo": "Publicó información falsa en su perfil."
}
```

**Respuesta 200** ([UsuarioAdmin](#obj-usuarioadmin)):

```json
{
  "id": 2,
  "nombre": "Laura",
  "apellidos": "Hernández Ruiz",
  "correo": "rh@tecnoqro.mx",
  "telefono": "4421234567",
  "rol": "reclutador",
  "estado": "activo",
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro"
  },
  "creado_en": "2026-09-28T15:00:00Z",
  "ultimo_acceso_en": "2026-10-02T16:25:00Z"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 estado_invalido` Un administrador no puede suspenderse a sí mismo. · `422 validacion` Falta el motivo.

### Administración: empresas

<a id="get-admin-empresas"></a>
#### `GET /admin/empresas` · Listar empresas

**Rol:** administrador · **Trazabilidad:** WEB-04 RF-01, RF-02 · CU-22

Las pendientes primero, de la más antigua a la más reciente; después las demás por nombre.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `q` | query | texto | Busca en razón social, nombre comercial o RFC. |
| `estado` | query | texto | pendiente, validada, rechazada o suspendida. |
| `sector_id` | query | entero | Sector. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `25`. |

**Respuesta 200** ([PaginaEmpresasAdmin](#obj-paginaempresasadmin)):

```json
{
  "items": [
    {
      "id": 1,
      "razon_social": "Tecnologías Querétaro S.A. de C.V.",
      "nombre_comercial": "TecnoQro",
      "rfc": "TQU150312AB1",
      "sector": {
        "id": 4,
        "nombre": "Tecnologías de la información"
      },
      "estado": "validada",
      "reclutadores": 1,
      "vacantes_activas": 1,
      "documento": true,
      "creado_en": "2026-09-28T15:00:00Z"
    }
  ],
  "total": 4,
  "page": 1,
  "size": 25
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-admin-empresas-id"></a>
#### `GET /admin/empresas/{id}` · Detalle de empresa

**Rol:** administrador · **Trazabilidad:** WEB-04 RF-03, RF-04 · CU-22

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([EmpresaAdminDetalle](#obj-empresaadmindetalle)):

```json
{
  "empresa": {
    "id": 1,
    "razon_social": "Tecnologías Querétaro S.A. de C.V.",
    "nombre_comercial": "TecnoQro",
    "rfc": "TQU150312AB1",
    "sector": {
      "id": 4,
      "nombre": "Tecnologías de la información"
    },
    "tamano_empresa": {
      "id": 3,
      "nombre": "Mediana",
      "rango": "51 a 250 trabajadores"
    },
    "municipio": {
      "id": 3,
      "nombre": "Querétaro",
      "entidad": {
        "id": 22,
        "nombre": "Querétaro"
      }
    },
    "direccion": "Av. Constituyentes 100, Querétaro",
    "descripcion": "Empresa de desarrollo de software y soporte técnico.",
    "sitio_web": "https://tecnoqro.mx",
    "logo_url": "/archivos/logos/empresa-1.png",
    "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
    "documento_url": "/archivos/documentos/empresa-1.pdf",
    "estado": "validada",
    "motivo_estado": null,
    "validada_en": "2026-09-28T16:00:00Z",
    "datos_fiscales_editables": false
  },
  "reclutadores": [
    {
      "usuario_id": 2,
      "nombre": "Laura",
      "apellidos": "Hernández Ruiz",
      "correo": "rh@tecnoqro.mx",
      "puesto": "Coordinadora de Recursos Humanos",
      "estado": "activo"
    }
  ],
  "rfc_duplicado": false,
  "reportes": 0
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="post-admin-empresas"></a>
#### `POST /admin/empresas` · Crear empresa

**Rol:** administrador · **Trazabilidad:** WEB-04 RF-05 · CU-22

Se crea en estado «validada».

**Cuerpo** ([EmpresaAdminEntrada](#obj-empresaadminentrada)):

```json
{
  "razon_social": "Tecnologías Querétaro S.A. de C.V.",
  "nombre_comercial": "TecnoQro",
  "rfc": "TQU150312AB1",
  "sector_id": 4,
  "tamano_empresa_id": 3,
  "municipio_id": 3,
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": null,
  "sitio_web": null,
  "practicas_inclusion": null
}
```

**Respuesta 201** ([EmpresaPropia](#obj-empresapropia)):

```json
{
  "id": 1,
  "razon_social": "Tecnologías Querétaro S.A. de C.V.",
  "nombre_comercial": "TecnoQro",
  "rfc": "TQU150312AB1",
  "sector": {
    "id": 4,
    "nombre": "Tecnologías de la información"
  },
  "tamano_empresa": {
    "id": 3,
    "nombre": "Mediana",
    "rango": "51 a 250 trabajadores"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": "Empresa de desarrollo de software y soporte técnico.",
  "sitio_web": "https://tecnoqro.mx",
  "logo_url": "/archivos/logos/empresa-1.png",
  "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
  "documento_url": "/archivos/documentos/empresa-1.pdf",
  "estado": "validada",
  "motivo_estado": null,
  "validada_en": "2026-09-28T16:00:00Z",
  "datos_fiscales_editables": false
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `409 rfc_duplicado` Otra empresa ya registró ese RFC. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-admin-empresas-id"></a>
#### `PUT /admin/empresas/{id}` · Editar empresa

**Rol:** administrador · **Trazabilidad:** WEB-04 RF-05 · CU-22

El administrador sí puede corregir razón social y RFC de una empresa validada.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([EmpresaAdminEntrada](#obj-empresaadminentrada)):

```json
{
  "razon_social": "Tecnologías Querétaro S.A. de C.V.",
  "nombre_comercial": "TecnoQro",
  "rfc": "TQU150312AB1",
  "sector_id": 4,
  "tamano_empresa_id": 3,
  "municipio_id": 3,
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": null,
  "sitio_web": null,
  "practicas_inclusion": null
}
```

**Respuesta 200** ([EmpresaPropia](#obj-empresapropia)):

```json
{
  "id": 1,
  "razon_social": "Tecnologías Querétaro S.A. de C.V.",
  "nombre_comercial": "TecnoQro",
  "rfc": "TQU150312AB1",
  "sector": {
    "id": 4,
    "nombre": "Tecnologías de la información"
  },
  "tamano_empresa": {
    "id": 3,
    "nombre": "Mediana",
    "rango": "51 a 250 trabajadores"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": "Empresa de desarrollo de software y soporte técnico.",
  "sitio_web": "https://tecnoqro.mx",
  "logo_url": "/archivos/logos/empresa-1.png",
  "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
  "documento_url": "/archivos/documentos/empresa-1.pdf",
  "estado": "validada",
  "motivo_estado": null,
  "validada_en": "2026-09-28T16:00:00Z",
  "datos_fiscales_editables": false
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 rfc_duplicado` Otra empresa ya registró ese RFC. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="patch-admin-empresas-id-validacion"></a>
#### `PATCH /admin/empresas/{id}/validacion` · Validar o rechazar

**Rol:** administrador · **Trazabilidad:** WEB-04 RF-03 · CU-22

Solo para empresas «pendiente». Registra quién y cuándo, escribe en la bitácora y notifica al reclutador.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([Validacion](#obj-validacion)):

```json
{
  "decision": "rechazada",
  "motivo": "La constancia de situación fiscal no es legible."
}
```

**Respuesta 200** ([EmpresaPropia](#obj-empresapropia)):

```json
{
  "id": 1,
  "razon_social": "Tecnologías Querétaro S.A. de C.V.",
  "nombre_comercial": "TecnoQro",
  "rfc": "TQU150312AB1",
  "sector": {
    "id": 4,
    "nombre": "Tecnologías de la información"
  },
  "tamano_empresa": {
    "id": 3,
    "nombre": "Mediana",
    "rango": "51 a 250 trabajadores"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "descripcion": "Empresa de desarrollo de software y soporte técnico.",
  "sitio_web": "https://tecnoqro.mx",
  "logo_url": "/archivos/logos/empresa-1.png",
  "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
  "documento_url": "/archivos/documentos/empresa-1.pdf",
  "estado": "validada",
  "motivo_estado": null,
  "validada_en": "2026-09-28T16:00:00Z",
  "datos_fiscales_editables": false
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 estado_invalido` La empresa no está pendiente. · `422 validacion` Falta el motivo del rechazo.

<a id="patch-admin-empresas-id-estado"></a>
#### `PATCH /admin/empresas/{id}/estado` · Suspender o reactivar

**Rol:** administrador · **Trazabilidad:** WEB-04 RF-06, WEB-08 RF-05 · CU-22, CU-26

Al suspender, sus vacantes publicadas pasan a «suspendida» y se notifica a los postulados. Al reactivar, las vacantes siguen suspendidas hasta que el administrador las reactive una por una. También sirve como baja lógica de la empresa.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([CambioEstadoEmpresa](#obj-cambioestadoempresa)):

```json
{
  "estado": "suspendida",
  "motivo": "Varias vacantes reportadas como engañosas."
}
```

**Respuesta 200** ([ResultadoEstadoEmpresa](#obj-resultadoestadoempresa)):

```json
{
  "empresa": {
    "id": 1,
    "razon_social": "Tecnologías Querétaro S.A. de C.V.",
    "nombre_comercial": "TecnoQro",
    "rfc": "TQU150312AB1",
    "sector": {
      "id": 4,
      "nombre": "Tecnologías de la información"
    },
    "tamano_empresa": {
      "id": 3,
      "nombre": "Mediana",
      "rango": "51 a 250 trabajadores"
    },
    "municipio": {
      "id": 3,
      "nombre": "Querétaro",
      "entidad": {
        "id": 22,
        "nombre": "Querétaro"
      }
    },
    "direccion": "Av. Constituyentes 100, Querétaro",
    "descripcion": "Empresa de desarrollo de software y soporte técnico.",
    "sitio_web": "https://tecnoqro.mx",
    "logo_url": "/archivos/logos/empresa-1.png",
    "practicas_inclusion": "Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.",
    "documento_url": "/archivos/documentos/empresa-1.pdf",
    "estado": "suspendida",
    "motivo_estado": "Varias vacantes reportadas como engañosas.",
    "validada_en": "2026-09-28T16:00:00Z",
    "datos_fiscales_editables": false
  },
  "vacantes_suspendidas": 1,
  "postulados_notificados": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 transicion_invalida` Solo se suspende una empresa validada y solo se reactiva una suspendida. · `422 validacion` Falta el motivo.

### Administración: vacantes

<a id="get-admin-vacantes"></a>
#### `GET /admin/vacantes` · Listar todas las vacantes

**Rol:** administrador · **Trazabilidad:** WEB-05 RF-01, RF-02 · CU-23

El detalle se consulta con `GET /vacantes/{id}`.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `q` | query | texto | Busca en el título. |
| `empresa_id` | query | entero | Empresa. |
| `estado` | query | texto | Estado de la vacante. |
| `categoria_id` | query | entero | Categoría. |
| `modalidad_id` | query | entero | Modalidad. |
| `con_reportes` | query | booleano | true: solo vacantes con reportes abiertos. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `25`. |

**Respuesta 200** ([PaginaVacantesAdmin](#obj-paginavacantesadmin)):

```json
{
  "items": [
    {
      "id": 1,
      "titulo": "Técnico de soporte de TI",
      "empresa": {
        "id": 1,
        "nombre_comercial": "TecnoQro"
      },
      "categoria": {
        "id": 1,
        "nombre": "Tecnologías de la información"
      },
      "modalidad": {
        "id": 3,
        "nombre": "Híbrido"
      },
      "estado": "publicada",
      "publicada_en": "2026-09-29T15:00:00Z",
      "postulados": 1,
      "reportes_abiertos": 0
    }
  ],
  "total": 8,
  "page": 1,
  "size": 25
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="patch-admin-vacantes-id-estado"></a>
#### `PATCH /admin/vacantes/{id}/estado` · Suspender o reactivar vacante

**Rol:** administrador · **Trazabilidad:** WEB-05 RF-04, WEB-08 RF-05 · CU-23, CU-26

Suspender avisa al reclutador y a los postulados. Reactivar la deja «publicada».

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([ModeracionVacante](#obj-moderacionvacante)):

```json
{
  "estado": "suspendida",
  "motivo": "Solicita pagos a los candidatos."
}
```

**Respuesta 200** ([VacanteDetalle](#obj-vacantedetalle)):

```json
{
  "id": 1,
  "titulo": "Técnico de soporte de TI",
  "descripcion": "Atención a usuarios internos, mantenimiento de equipos y redes.",
  "empresa": {
    "id": 1,
    "nombre_comercial": "TecnoQro",
    "logo_url": "/archivos/logos/empresa-1.png",
    "validada": true
  },
  "categoria": {
    "id": 1,
    "nombre": "Tecnologías de la información"
  },
  "modalidad": {
    "id": 3,
    "nombre": "Híbrido"
  },
  "jornada": {
    "id": 1,
    "nombre": "Tiempo completo"
  },
  "tipo_contrato": {
    "id": 1,
    "nombre": "Indefinido"
  },
  "municipio": {
    "id": 3,
    "nombre": "Querétaro",
    "entidad": {
      "id": 22,
      "nombre": "Querétaro"
    }
  },
  "direccion": "Av. Constituyentes 100, Querétaro",
  "plazas": 2,
  "salario": {
    "min": 14000,
    "max": 18000
  },
  "mostrar_salario": true,
  "nivel_educativo": {
    "id": 4,
    "nombre": "Técnico superior universitario",
    "orden": 4
  },
  "experiencia_anios": 1,
  "habilidades": [
    {
      "id": 4,
      "nombre": "Soporte técnico",
      "obligatoria": true
    },
    {
      "id": 5,
      "nombre": "Redes",
      "obligatoria": true
    },
    {
      "id": 3,
      "nombre": "SQL",
      "obligatoria": true
    },
    {
      "id": 11,
      "nombre": "Comunicación escrita",
      "obligatoria": true
    },
    {
      "id": 2,
      "nombre": "JavaScript",
      "obligatoria": false
    },
    {
      "id": 6,
      "nombre": "Excel",
      "obligatoria": false
    }
  ],
  "ajustes": [
    {
      "id": 1,
      "nombre": "Acceso con rampa",
      "categoria": "movilidad",
      "descripcion": "Entrada y áreas de trabajo accesibles en silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 3,
      "nombre": "Baño accesible",
      "categoria": "movilidad",
      "descripcion": "Sanitario adaptado para personas usuarias de silla de ruedas",
      "tipo": "existente"
    },
    {
      "id": 12,
      "nombre": "Horario flexible",
      "categoria": "general",
      "descripcion": "Posibilidad de ajustar horarios de entrada y salida",
      "tipo": "bajo_solicitud"
    }
  ],
  "sin_condiciones_accesibilidad": false,
  "notas_accesibilidad": null,
  "estado": "publicada",
  "motivo_estado": null,
  "publicada_en": "2026-09-29T15:00:00Z",
  "actualizado_en": "2026-09-29T15:00:00Z",
  "postulacion_id": 1,
  "postulados": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 transicion_invalida` Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida. · `422 validacion` Falta el motivo.

### Administración: catálogos

<a id="get-admin-categorias"></a>
#### `GET /admin/categorias` · Listar categorías

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-01 · CU-24

Incluye las inactivas.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `q` | query | texto | Busca por nombre. |

**Respuesta 200** (arreglo de [CategoriaAdmin](#obj-categoriaadmin)):

```json
[
  {
    "id": 1,
    "nombre": "Tecnologías de la información",
    "descripcion": "Desarrollo, soporte y administración de sistemas",
    "activo": true,
    "habilidades": 5,
    "vacantes": 1
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="post-admin-categorias"></a>
#### `POST /admin/categorias` · Crear categoría

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-01 · CU-24

**Cuerpo** ([CategoriaEntrada](#obj-categoriaentrada)):

```json
{
  "nombre": "Salud y bienestar",
  "descripcion": "Atención y apoyo en servicios de salud"
}
```

**Respuesta 201** ([CategoriaAdmin](#obj-categoriaadmin)):

```json
{
  "id": 6,
  "nombre": "Salud y bienestar",
  "descripcion": "Atención y apoyo en servicios de salud",
  "activo": true,
  "habilidades": 0,
  "vacantes": 0
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `409 nombre_duplicado` Ya existe una categoría con ese nombre. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-admin-categorias-id"></a>
#### `PUT /admin/categorias/{id}` · Editar categoría

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-01 · CU-24

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([CategoriaEntrada](#obj-categoriaentrada)):

```json
{
  "nombre": "Salud y bienestar",
  "descripcion": "Atención y apoyo en servicios de salud"
}
```

**Respuesta 200** ([CategoriaAdmin](#obj-categoriaadmin)):

```json
{
  "id": 1,
  "nombre": "Tecnologías de la información",
  "descripcion": "Desarrollo, soporte y administración de sistemas",
  "activo": true,
  "habilidades": 5,
  "vacantes": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 nombre_duplicado` Ya existe una categoría con ese nombre. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="patch-admin-categorias-id"></a>
#### `PATCH /admin/categorias/{id}` · Activar o desactivar categoría

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-03 · CU-24

Desactivada, deja de ofrecerse en registros nuevos; lo ya guardado no cambia.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([Activacion](#obj-activacion)):

```json
{
  "activo": false
}
```

**Respuesta 200** ([CategoriaAdmin](#obj-categoriaadmin)):

```json
{
  "id": 1,
  "nombre": "Tecnologías de la información",
  "descripcion": "Desarrollo, soporte y administración de sistemas",
  "activo": true,
  "habilidades": 5,
  "vacantes": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="delete-admin-categorias-id"></a>
#### `DELETE /admin/categorias/{id}` · Eliminar categoría

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-03 · CU-24

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 en_uso` La categoría está en uso; solo se puede desactivar.

<a id="get-admin-habilidades"></a>
#### `GET /admin/habilidades` · Listar habilidades

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-02, RF-04 · CU-24

Incluye las inactivas y cuántos candidatos y vacantes usan cada una.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `q` | query | texto | Busca por nombre. |
| `categoria_id` | query | entero | Categoría. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `25`. |

**Respuesta 200** ([PaginaHabilidadesAdmin](#obj-paginahabilidadesadmin)):

```json
{
  "items": [
    {
      "id": 3,
      "nombre": "SQL",
      "categoria": {
        "id": 1,
        "nombre": "Tecnologías de la información"
      },
      "activo": true,
      "candidatos": 1,
      "vacantes": 1
    }
  ],
  "total": 15,
  "page": 1,
  "size": 25
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="post-admin-habilidades"></a>
#### `POST /admin/habilidades` · Crear habilidad

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-02 · CU-24

**Cuerpo** ([HabilidadEntrada](#obj-habilidadentrada)):

```json
{
  "nombre": "Power BI",
  "categoria_id": 1
}
```

**Respuesta 201** ([HabilidadAdmin](#obj-habilidadadmin)):

```json
{
  "id": 16,
  "nombre": "Power BI",
  "categoria": {
    "id": 1,
    "nombre": "Tecnologías de la información"
  },
  "activo": true,
  "candidatos": 0,
  "vacantes": 0
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `409 nombre_duplicado` Ya existe una habilidad con ese nombre. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-admin-habilidades-id"></a>
#### `PUT /admin/habilidades/{id}` · Editar habilidad

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-02 · CU-24

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([HabilidadEntrada](#obj-habilidadentrada)):

```json
{
  "nombre": "Power BI",
  "categoria_id": 1
}
```

**Respuesta 200** ([HabilidadAdmin](#obj-habilidadadmin)):

```json
{
  "id": 3,
  "nombre": "SQL",
  "categoria": {
    "id": 1,
    "nombre": "Tecnologías de la información"
  },
  "activo": true,
  "candidatos": 1,
  "vacantes": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 nombre_duplicado` Ya existe una habilidad con ese nombre. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="patch-admin-habilidades-id"></a>
#### `PATCH /admin/habilidades/{id}` · Activar o desactivar habilidad

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-03 · CU-24

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([Activacion](#obj-activacion)):

```json
{
  "activo": false
}
```

**Respuesta 200** ([HabilidadAdmin](#obj-habilidadadmin)):

```json
{
  "id": 3,
  "nombre": "SQL",
  "categoria": {
    "id": 1,
    "nombre": "Tecnologías de la información"
  },
  "activo": true,
  "candidatos": 1,
  "vacantes": 1
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="delete-admin-habilidades-id"></a>
#### `DELETE /admin/habilidades/{id}` · Eliminar habilidad

**Rol:** administrador · **Trazabilidad:** WEB-06 RF-03 · CU-24

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 en_uso` La habilidad está en uso; solo se puede desactivar.

<a id="get-admin-catalogos-tipo"></a>
#### `GET /admin/catalogos/{tipo}` · Listar catálogo

**Rol:** administrador · **Trazabilidad:** WEB-07 RF-01 a RF-03 · CU-25

Incluye los inactivos y cuántos registros usan cada elemento. `tipo`: `modalidades`, `jornadas`, `tipos-contrato`, `niveles-educativos`, `sectores`, `tamanos-empresa`, `ajustes`, `motivos-reporte`. Las entidades y municipios no se editan desde el panel.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `tipo` | ruta | texto | Tipo de catálogo. |

**Respuesta 200** (arreglo de [CatalogoAdmin](#obj-catalogoadmin)):

```json
[
  {
    "id": 6,
    "nombre": "Intérprete de Lengua de Señas Mexicana",
    "activo": true,
    "en_uso": 0,
    "descripcion": "Intérprete de LSM en reuniones y capacitaciones",
    "categoria": "auditiva"
  }
]
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="post-admin-catalogos-tipo"></a>
#### `POST /admin/catalogos/{tipo}` · Crear elemento

**Rol:** administrador · **Trazabilidad:** WEB-07 RF-01 a RF-04 · CU-25

Los campos obligatorios dependen del tipo (ver `CatalogoEntrada`). `tipo`: `modalidades`, `jornadas`, `tipos-contrato`, `niveles-educativos`, `sectores`, `tamanos-empresa`, `ajustes`, `motivos-reporte`. Las entidades y municipios no se editan desde el panel.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `tipo` | ruta | texto | Tipo de catálogo. |

**Cuerpo** ([CatalogoEntrada](#obj-catalogoentrada)):

```json
{
  "nombre": "Lector de pantalla instalado",
  "descripcion": "Equipos con NVDA o JAWS ya instalados",
  "categoria": "visual"
}
```

**Respuesta 201** ([CatalogoAdmin](#obj-catalogoadmin)):

```json
{
  "id": 14,
  "nombre": "Lector de pantalla instalado",
  "activo": true,
  "en_uso": 0,
  "descripcion": "Equipos con NVDA o JAWS ya instalados",
  "categoria": "visual"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 nombre_duplicado` Ya existe un elemento con ese nombre en el catálogo. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="put-admin-catalogos-tipo-id"></a>
#### `PUT /admin/catalogos/{tipo}/{id}` · Editar elemento

**Rol:** administrador · **Trazabilidad:** WEB-07 RF-01 a RF-04 · CU-25

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `tipo` | ruta | texto | Tipo de catálogo. |
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([CatalogoEntrada](#obj-catalogoentrada)):

```json
{
  "nombre": "Lector de pantalla instalado",
  "descripcion": "Equipos con NVDA o JAWS ya instalados",
  "categoria": "visual"
}
```

**Respuesta 200** ([CatalogoAdmin](#obj-catalogoadmin)):

```json
{
  "id": 6,
  "nombre": "Intérprete de Lengua de Señas Mexicana",
  "activo": true,
  "en_uso": 0,
  "descripcion": "Intérprete de LSM en reuniones y capacitaciones",
  "categoria": "auditiva"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 nombre_duplicado` Ya existe un elemento con ese nombre en el catálogo. · `422 validacion` Algún campo no cumple el formato; `campos` indica cuál.

<a id="patch-admin-catalogos-tipo-id"></a>
#### `PATCH /admin/catalogos/{tipo}/{id}` · Activar o desactivar elemento

**Rol:** administrador · **Trazabilidad:** WEB-07 RF-04 · CU-25

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `tipo` | ruta | texto | Tipo de catálogo. |
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([Activacion](#obj-activacion)):

```json
{
  "activo": false
}
```

**Respuesta 200** ([CatalogoAdmin](#obj-catalogoadmin)):

```json
{
  "id": 6,
  "nombre": "Intérprete de Lengua de Señas Mexicana",
  "activo": true,
  "en_uso": 0,
  "descripcion": "Intérprete de LSM en reuniones y capacitaciones",
  "categoria": "auditiva"
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="delete-admin-catalogos-tipo-id"></a>
#### `DELETE /admin/catalogos/{tipo}/{id}` · Eliminar elemento

**Rol:** administrador · **Trazabilidad:** WEB-07 RF-04 · CU-25

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `tipo` | ruta | texto | Tipo de catálogo. |
| `id` | ruta | entero | Identificador. |

**Respuesta 204:** sin cuerpo.

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 en_uso` El elemento está en uso; solo se puede desactivar.

### Administración: reportes

<a id="get-admin-reportes"></a>
#### `GET /admin/reportes` · Bandeja de reportes

**Rol:** administrador · **Trazabilidad:** WEB-08 RF-01, RF-02 · CU-26

Por omisión, los más antiguos primero.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `estado` | query | texto | abierto, en_revision, resuelto o descartado. |
| `tipo` | query | texto | vacante, empresa o candidato. |
| `motivo_reporte_id` | query | entero | Motivo. |
| `orden` | query | texto | `antiguos` (por omisión) o `recientes`. |
| `page` | query | entero | Página, desde 1. Por omisión: `1`. |
| `size` | query | entero | Tamaño de página (máximo 100). Por omisión: `25`. |

**Respuesta 200** ([PaginaReportes](#obj-paginareportes)):

```json
{
  "items": [
    {
      "id": 1,
      "tipo": "vacante",
      "objeto": {
        "id": 5,
        "nombre": "Ejecutivo de atención telefónica · ConCentro"
      },
      "motivo": {
        "id": 2,
        "nombre": "Información falsa"
      },
      "reportante": {
        "id": 4,
        "nombre": "Jorge",
        "apellidos": "Ramírez Soto"
      },
      "estado": "abierto",
      "creado_en": "2026-10-03T18:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 25
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint.

<a id="get-admin-reportes-id"></a>
#### `GET /admin/reportes/{id}` · Detalle del reporte

**Rol:** administrador · **Trazabilidad:** WEB-08 RF-03 · CU-26

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Respuesta 200** ([ReporteAdminDetalle](#obj-reporteadmindetalle)):

```json
{
  "reporte": {
    "id": 1,
    "tipo": "vacante",
    "objeto": {
      "id": 5,
      "nombre": "Ejecutivo de atención telefónica · ConCentro"
    },
    "motivo": {
      "id": 2,
      "nombre": "Información falsa"
    },
    "reportante": {
      "id": 4,
      "nombre": "Jorge",
      "apellidos": "Ramírez Soto"
    },
    "estado": "abierto",
    "creado_en": "2026-10-03T18:00:00Z"
  },
  "descripcion": "El salario publicado no coincide con lo que me dijeron por teléfono.",
  "resolucion": null,
  "accion": null,
  "atendido_por": null,
  "cerrado_en": null,
  "historial": [
    {
      "estado_anterior": null,
      "estado_nuevo": "abierto",
      "comentario": null,
      "usuario": null,
      "creado_en": "2026-10-03T18:00:00Z"
    }
  ],
  "objeto_estado": "publicada",
  "reportes_previos": []
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario.

<a id="patch-admin-reportes-id"></a>
#### `PATCH /admin/reportes/{id}` · Dar seguimiento al reporte

**Rol:** administrador · **Trazabilidad:** WEB-08 RF-04, RF-06 · CU-26

abierto → en_revision → resuelto o descartado (también abierto → descartado). Al cerrar exige `resolucion`, registra el historial y notifica a quien reportó sin detalles de la sanción. Para suspender el elemento se usan los endpoints de usuarios, empresas o vacantes.

| Parámetro | En | Tipo | Descripción |
|---|---|---|---|
| `id` | ruta | entero | Identificador. |

**Cuerpo** ([SeguimientoReporte](#obj-seguimientoreporte)):

```json
{
  "estado": "resuelto",
  "comentario": null,
  "resolucion": "La empresa corrigió el salario publicado; se le pidió mantener la información actualizada.",
  "accion": "suspension"
}
```

**Respuesta 200** ([ReporteAdminDetalle](#obj-reporteadmindetalle)):

```json
{
  "reporte": {
    "id": 1,
    "tipo": "vacante",
    "objeto": {
      "id": 5,
      "nombre": "Ejecutivo de atención telefónica · ConCentro"
    },
    "motivo": {
      "id": 2,
      "nombre": "Información falsa"
    },
    "reportante": {
      "id": 4,
      "nombre": "Jorge",
      "apellidos": "Ramírez Soto"
    },
    "estado": "resuelto",
    "creado_en": "2026-10-03T18:00:00Z"
  },
  "descripcion": "El salario publicado no coincide con lo que me dijeron por teléfono.",
  "resolucion": "La empresa corrigió el salario publicado; se le pidió mantener la información actualizada.",
  "accion": "suspension",
  "atendido_por": {
    "id": 1,
    "nombre": "Admin",
    "apellidos": "IncluTec"
  },
  "cerrado_en": "2026-10-03T19:00:00Z",
  "historial": [
    {
      "estado_anterior": null,
      "estado_nuevo": "abierto",
      "comentario": null,
      "usuario": null,
      "creado_en": "2026-10-03T18:00:00Z"
    },
    {
      "estado_anterior": "abierto",
      "estado_nuevo": "resuelto",
      "comentario": null,
      "usuario": {
        "id": 1,
        "nombre": "Admin"
      },
      "creado_en": "2026-10-03T19:00:00Z"
    }
  ],
  "objeto_estado": "publicada",
  "reportes_previos": []
}
```

**Errores:** `401 no_autenticado` Falta el token, es inválido o ya venció. · `403 sin_permiso` El rol del usuario no tiene acceso a este endpoint. · `404 no_encontrado` El recurso no existe o no es visible para este usuario. · `409 transicion_invalida` El reporte ya está cerrado. · `422 validacion` Falta la resolución al cerrar.

## 5. Objetos

Campos de cada objeto. Todos vienen siempre en las respuestas (con `null` cuando no hay valor); en los cuerpos de entrada, los marcados como *opcional* se pueden omitir.

<a id="obj-error"></a>
### Error

| Campo | Tipo | Descripción |
|---|---|---|
| `detail` | texto | Mensaje claro en español para mostrar al usuario. |
| `codigo` | texto | Código estable para que el cliente decida qué hacer (ver tabla de códigos). |
| `campos` *(opcional)* | objeto o null | Solo en errores de validación: mensaje por campo, con el nombre del campo del cuerpo. |

<a id="obj-ref"></a>
### Ref

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |

<a id="obj-entidad"></a>
### Entidad

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero | Clave INEGI. |
| `nombre` | texto |  |

<a id="obj-municipio"></a>
### Municipio

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `entidad` | [Entidad](#obj-entidad) |  |

<a id="obj-niveleducativo"></a>
### NivelEducativo

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `orden` | entero | Posición jerárquica; mayor = más alto. |

<a id="obj-tamanoempresa"></a>
### TamanoEmpresa

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `rango` | texto |  |

<a id="obj-habilidad"></a>
### Habilidad

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |

<a id="obj-ajusteref"></a>
### AjusteRef

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `categoria` | `movilidad` \| `visual` \| `auditiva` \| `comunicacion` \| `cognitiva_psicosocial` \| `general` |  |

<a id="obj-ajuste"></a>
### Ajuste

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `categoria` | `movilidad` \| `visual` \| `auditiva` \| `comunicacion` \| `cognitiva_psicosocial` \| `general` |  |
| `descripcion` | texto |  |

<a id="obj-paginacion"></a>
### Paginacion

| Campo | Tipo | Descripción |
|---|---|---|
| `total` | entero | Total de registros que cumplen el filtro. |
| `page` | entero | Página actual (desde 1). |
| `size` | entero | Tamaño de página. |

<a id="obj-catalogoitem"></a>
### CatalogoItem

Elemento de un catálogo. Solo vienen los campos que aplican al tipo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `descripcion` *(opcional)* | texto o null | Solo categorías y ajustes. |
| `categoria` *(opcional)* | texto o null | Solo ajustes: movilidad, visual, auditiva, comunicacion, cognitiva_psicosocial o general. |
| `categoria_id` *(opcional)* | entero o null | Solo habilidades. |
| `orden` *(opcional)* | entero o null | Solo niveles educativos. |
| `rango` *(opcional)* | texto o null | Solo tamaños de empresa. |
| `aplica_a` *(opcional)* | texto o null | Solo motivos de reporte: vacante, empresa, candidato o todos. |
| `entidad_federativa_id` *(opcional)* | entero o null | Solo municipios. |

<a id="obj-usuario"></a>
### Usuario

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `correo` | texto |  |
| `nombre` | texto |  |
| `apellidos` | texto |  |
| `telefono` | texto o null |  |
| `rol` | `candidato` \| `reclutador` \| `administrador` |  |
| `estado` | `activo` \| `suspendido` \| `eliminado` |  |
| `empresa` | objeto o null | Solo reclutadores: su empresa y el estado de validación. |
| `empresa.id` | entero |  |
| `empresa.nombre_comercial` | texto |  |
| `empresa.estado` | `pendiente` \| `validada` \| `rechazada` \| `suspendida` |  |
| `consentimiento_sensibles` | booleano o null | Solo candidatos: si otorgó el consentimiento para tratar necesidades de ajuste. |

<a id="obj-sesion"></a>
### Sesion

| Campo | Tipo | Descripción |
|---|---|---|
| `access_token` | texto | JWT HS256. Se envía en cada petición como `Authorization: Bearer <token>`. |
| `token_type` | `bearer` |  |
| `expira_en` | fecha-hora | Vencimiento del token (8 h después de emitirse). |
| `usuario` | [Usuario](#obj-usuario) |  |

<a id="obj-login"></a>
### Login

| Campo | Tipo | Descripción |
|---|---|---|
| `correo` | texto |  |
| `contrasena` | texto | (máx. 64 car., mín. 8 car.) |

<a id="obj-registrocandidato"></a>
### RegistroCandidato

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | texto | (máx. 80 car.) |
| `apellidos` | texto | (máx. 120 car.) |
| `correo` | texto | (máx. 254 car.) |
| `telefono` | texto | 10 dígitos. (patrón `^[0-9]{10}$`) |
| `municipio_id` | entero |  |
| `contrasena` | texto | 8 a 64 caracteres, con al menos una letra y un número. (máx. 64 car., mín. 8 car.) |
| `acepta_aviso` | booleano | Debe ser true. |
| `consentimiento_sensibles` | booleano | Consentimiento expreso para tratar necesidades de ajuste. Si es false, la cuenta se crea y esa sección queda deshabilitada. |

<a id="obj-registroreclutador"></a>
### RegistroReclutador

| Campo | Tipo | Descripción |
|---|---|---|
| `reclutador` | objeto |  |
| `reclutador.nombre` | texto | (máx. 80 car.) |
| `reclutador.apellidos` | texto | (máx. 120 car.) |
| `reclutador.puesto` | texto | (máx. 100 car.) |
| `reclutador.correo` | texto |  |
| `reclutador.telefono` | texto | (patrón `^[0-9]{10}$`) |
| `reclutador.contrasena` | texto | (máx. 64 car., mín. 8 car.) |
| `empresa` | objeto |  |
| `empresa.razon_social` | texto | (máx. 200 car.) |
| `empresa.nombre_comercial` | texto | (máx. 150 car.) |
| `empresa.rfc` | texto | 12 o 13 caracteres en mayúsculas. (patrón `^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$`) |
| `empresa.sector_id` | entero |  |
| `empresa.tamano_empresa_id` | entero |  |
| `empresa.municipio_id` | entero |  |
| `acepta_aviso` | booleano | Debe ser true. |

<a id="obj-solicitudcodigo"></a>
### SolicitudCodigo

| Campo | Tipo | Descripción |
|---|---|---|
| `correo` | texto |  |

<a id="obj-verificacioncodigo"></a>
### VerificacionCodigo

| Campo | Tipo | Descripción |
|---|---|---|
| `correo` | texto |  |
| `codigo` | texto | 6 dígitos. (patrón `^[0-9]{6}$`) |

<a id="obj-restablecimiento"></a>
### Restablecimiento

| Campo | Tipo | Descripción |
|---|---|---|
| `correo` | texto |  |
| `codigo` | texto | (patrón `^[0-9]{6}$`) |
| `contrasena` | texto | (máx. 64 car., mín. 8 car.) |

<a id="obj-cambiocontrasena"></a>
### CambioContrasena

| Campo | Tipo | Descripción |
|---|---|---|
| `contrasena_actual` | texto |  |
| `contrasena_nueva` | texto | (máx. 64 car., mín. 8 car.) |

<a id="obj-mensaje"></a>
### Mensaje

| Campo | Tipo | Descripción |
|---|---|---|
| `detail` | texto |  |

<a id="obj-dispositivo"></a>
### Dispositivo

| Campo | Tipo | Descripción |
|---|---|---|
| `expo_push_token` | texto | (máx. 255 car.) |
| `plataforma` | `android` \| `ios` |  |

<a id="obj-logout"></a>
### Logout

| Campo | Tipo | Descripción |
|---|---|---|
| `expo_push_token` *(opcional)* | texto o null | Si se envía, el dispositivo deja de recibir push. |

<a id="obj-notificacion"></a>
### Notificacion

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `tipo` | `cambio_estado` \| `nueva_postulacion` \| `entrevista_agendada` \| `entrevista_cancelada` \| `recordatorio_entrevista` \| `empresa_validada` \| `empresa_rechazada` \| `vacante_suspendida` \| `reporte_resuelto` |  |
| `titulo` | texto |  |
| `mensaje` | texto |  |
| `referencia` | objeto o null | Recurso al que lleva la notificación al tocarla. |
| `referencia.tipo` | `postulacion` \| `entrevista` \| `empresa` \| `reporte` \| `vacante` |  |
| `referencia.id` | entero |  |
| `leida` | booleano |  |
| `creado_en` | fecha-hora |  |

<a id="obj-paginanotificaciones"></a>
### PaginaNotificaciones

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [Notificacion](#obj-notificacion) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-resumennotificaciones"></a>
### ResumenNotificaciones

| Campo | Tipo | Descripción |
|---|---|---|
| `no_leidas` | entero |  |

<a id="obj-preferencianotificacion"></a>
### PreferenciaNotificacion

| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | `cambio_estado` \| `nueva_postulacion` \| `entrevista_agendada` \| `entrevista_cancelada` \| `recordatorio_entrevista` \| `empresa_validada` \| `empresa_rechazada` \| `vacante_suspendida` \| `reporte_resuelto` |  |
| `push` | booleano |  |
| `correo` | booleano |  |

<a id="obj-perfilcandidato"></a>
### PerfilCandidato

| Campo | Tipo | Descripción |
|---|---|---|
| `usuario` | objeto |  |
| `usuario.id` | entero |  |
| `usuario.nombre` | texto |  |
| `usuario.apellidos` | texto |  |
| `usuario.correo` | texto |  |
| `usuario.telefono` | texto o null |  |
| `municipio` | [Municipio](#obj-municipio) o null |  |
| `jornada` | [Ref](#obj-ref) o null |  |
| `resumen` | texto o null | (máx. 500 car.) |
| `foto_url` | texto o null |  |
| `disponible_reubicacion` | booleano |  |
| `modalidades` | arreglo de [Ref](#obj-ref) |  |
| `categorias` | arreglo de [Ref](#obj-ref) |  |
| `compartir_ajustes` | `preguntar` \| `siempre` \| `nunca` |  |
| `consentimiento_sensibles_en` | fecha-hora o null | null si no ha dado el consentimiento; entonces `necesidades` viene vacío. |
| `necesidades` | arreglo de [AjusteRef](#obj-ajusteref) |  |
| `nota_ajustes` | texto o null | (máx. 300 car.) |
| `completitud` | entero | 0 a 100. No depende de las necesidades de ajuste. (≥ 0, ≤ 100) |
| `secciones_pendientes` | arreglo de `datos_personales` \| `resumen` \| `foto` \| `preferencias` \| `formacion` \| `experiencia` \| `habilidades` |  |
| `perfil_minimo` | booleano | true si cumple lo necesario para postularse: nombre, municipio, al menos una habilidad y una formación. |
| `actualizado_en` | fecha-hora |  |

<a id="obj-perfilcandidatoentrada"></a>
### PerfilCandidatoEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | texto | (máx. 80 car.) |
| `apellidos` | texto | (máx. 120 car.) |
| `telefono` | texto o null | (patrón `^[0-9]{10}$`) |
| `municipio_id` | entero o null |  |
| `jornada_id` | entero o null |  |
| `resumen` | texto o null | (máx. 500 car.) |
| `disponible_reubicacion` | booleano |  |
| `modalidad_ids` | arreglo de entero |  |
| `categoria_ids` | arreglo de entero |  |
| `compartir_ajustes` | `preguntar` \| `siempre` \| `nunca` |  |

<a id="obj-consentimiento"></a>
### Consentimiento

| Campo | Tipo | Descripción |
|---|---|---|
| `otorgado` | booleano | true lo otorga; false lo revoca y borra las necesidades registradas. |

<a id="obj-necesidadesentrada"></a>
### NecesidadesEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `ajuste_ids` | arreglo de entero |  |
| `nota_ajustes` | texto o null | (máx. 300 car.) |

<a id="obj-necesidades"></a>
### Necesidades

| Campo | Tipo | Descripción |
|---|---|---|
| `necesidades` | arreglo de [AjusteRef](#obj-ajusteref) |  |
| `nota_ajustes` | texto o null |  |

<a id="obj-experiencia"></a>
### Experiencia

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `puesto` | texto | (máx. 100 car.) |
| `empresa` | texto | (máx. 120 car.) |
| `fecha_inicio` | fecha |  |
| `fecha_fin` | fecha o null |  |
| `actual` | booleano |  |
| `descripcion` | texto o null | (máx. 500 car.) |

<a id="obj-experienciaentrada"></a>
### ExperienciaEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `puesto` | texto | (máx. 100 car.) |
| `empresa` | texto | (máx. 120 car.) |
| `fecha_inicio` | fecha |  |
| `fecha_fin` | fecha o null | Posterior a fecha_inicio; null si actual = true. |
| `actual` | booleano |  |
| `descripcion` | texto o null | (máx. 500 car.) |

<a id="obj-formacion"></a>
### Formacion

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nivel_educativo` | [NivelEducativo](#obj-niveleducativo) |  |
| `institucion` | texto |  |
| `carrera` | texto o null |  |
| `estado` | `concluida` \| `en_curso` \| `trunca` |  |
| `fecha_inicio` | fecha o null |  |
| `fecha_fin` | fecha o null |  |

<a id="obj-formacionentrada"></a>
### FormacionEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `nivel_educativo_id` | entero |  |
| `institucion` | texto | (máx. 150 car.) |
| `carrera` | texto o null | (máx. 150 car.) |
| `estado` | `concluida` \| `en_curso` \| `trunca` |  |
| `fecha_inicio` | fecha o null |  |
| `fecha_fin` | fecha o null |  |

<a id="obj-habilidadcandidato"></a>
### HabilidadCandidato

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `nivel` | `basico` \| `intermedio` \| `avanzado` |  |

<a id="obj-habilidadesentrada"></a>
### HabilidadesEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `habilidades` | arreglo de objeto | Lista completa; reemplaza la anterior. Máximo 30, sin repetidos. (máx. 30 elementos) |
| `habilidades[].habilidad_id` | entero |  |
| `habilidades[].nivel` | `basico` \| `intermedio` \| `avanzado` |  |

<a id="obj-archivo"></a>
### Archivo

| Campo | Tipo | Descripción |
|---|---|---|
| `url` | texto | Ruta pública del archivo, relativa al servidor del API. |

<a id="obj-eliminarcuenta"></a>
### EliminarCuenta

| Campo | Tipo | Descripción |
|---|---|---|
| `contrasena` | texto | Contraseña actual, como segunda confirmación. |

<a id="obj-cv"></a>
### CV

CV tal como lo ve una empresa. No incluye necesidades de ajuste.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero | Id del candidato (= id de usuario). |
| `nombre` | texto |  |
| `apellidos` | texto |  |
| `foto_url` | texto o null |  |
| `municipio` | [Municipio](#obj-municipio) o null |  |
| `resumen` | texto o null |  |
| `modalidades` | arreglo de [Ref](#obj-ref) |  |
| `experiencias` | arreglo de [Experiencia](#obj-experiencia) |  |
| `formaciones` | arreglo de [Formacion](#obj-formacion) |  |
| `habilidades` | arreglo de [HabilidadCandidato](#obj-habilidadcandidato) |  |
| `correo` | texto o null | Solo a partir del estado «entrevista»; antes viene null. |
| `telefono` | texto o null | Solo a partir del estado «entrevista»; antes viene null. |

<a id="obj-empresapropia"></a>
### EmpresaPropia

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `razon_social` | texto |  |
| `nombre_comercial` | texto |  |
| `rfc` | texto |  |
| `sector` | [Ref](#obj-ref) |  |
| `tamano_empresa` | [TamanoEmpresa](#obj-tamanoempresa) |  |
| `municipio` | [Municipio](#obj-municipio) |  |
| `direccion` | texto o null |  |
| `descripcion` | texto o null |  |
| `sitio_web` | texto o null |  |
| `logo_url` | texto o null |  |
| `practicas_inclusion` | texto o null |  |
| `documento_url` | texto o null |  |
| `estado` | `pendiente` \| `validada` \| `rechazada` \| `suspendida` |  |
| `motivo_estado` | texto o null | Motivo del rechazo o la suspensión. |
| `validada_en` | fecha-hora o null |  |
| `datos_fiscales_editables` | booleano | false cuando la empresa ya está validada. |

<a id="obj-empresaentrada"></a>
### EmpresaEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre_comercial` | texto | (máx. 150 car.) |
| `sector_id` | entero |  |
| `tamano_empresa_id` | entero |  |
| `municipio_id` | entero |  |
| `direccion` *(opcional)* | texto o null | (máx. 255 car.) |
| `descripcion` *(opcional)* | texto o null | (máx. 1000 car.) |
| `sitio_web` *(opcional)* | texto o null | (máx. 255 car.) |
| `practicas_inclusion` *(opcional)* | texto o null | (máx. 1000 car.) |
| `razon_social` *(opcional)* | texto | Solo se acepta si la empresa no está validada. (máx. 200 car.) |
| `rfc` *(opcional)* | texto | Solo se acepta si la empresa no está validada. (patrón `^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$`) |

<a id="obj-empresaresumen"></a>
### EmpresaResumen

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre_comercial` | texto |  |
| `logo_url` | texto o null |  |
| `sector` | [Ref](#obj-ref) |  |
| `tamano_empresa` | [TamanoEmpresa](#obj-tamanoempresa) |  |
| `municipio` | [Municipio](#obj-municipio) |  |
| `vacantes_publicadas` | entero |  |

<a id="obj-paginaempresas"></a>
### PaginaEmpresas

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [EmpresaResumen](#obj-empresaresumen) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-vacanteresumen"></a>
### VacanteResumen

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `titulo` | texto |  |
| `empresa` | objeto |  |
| `empresa.id` | entero |  |
| `empresa.nombre_comercial` | texto |  |
| `empresa.logo_url` | texto o null |  |
| `empresa.validada` | booleano |  |
| `categoria` | [Ref](#obj-ref) |  |
| `modalidad` | [Ref](#obj-ref) |  |
| `jornada` | [Ref](#obj-ref) |  |
| `municipio` | [Municipio](#obj-municipio) |  |
| `salario` | objeto o null | null si la empresa no lo muestra. |
| `salario.min` | número o null |  |
| `salario.max` | número o null |  |
| `compatibilidad` | entero o null | Puntaje del candidato (con A). null si aún no se calcula. (≥ 0, ≤ 100) |
| `ajustes` | arreglo de objeto | Para los íconos de la tarjeta. |
| `ajustes[].id` | entero |  |
| `ajustes[].nombre` | texto |  |
| `ajustes[].categoria` | `movilidad` \| `visual` \| `auditiva` \| `comunicacion` \| `cognitiva_psicosocial` \| `general` |  |
| `ajustes[].tipo` | `existente` \| `bajo_solicitud` |  |
| `cubre_mis_necesidades` | booleano | true si la vacante cubre (existente o bajo solicitud) todas las necesidades del candidato. |
| `publicada_en` | fecha-hora |  |
| `postulacion_id` | entero o null | Id de la postulación si el candidato ya se postuló. |

<a id="obj-paginavacantes"></a>
### PaginaVacantes

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [VacanteResumen](#obj-vacanteresumen) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-vacantedetalle"></a>
### VacanteDetalle

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `titulo` | texto |  |
| `descripcion` | texto |  |
| `empresa` | objeto |  |
| `empresa.id` | entero |  |
| `empresa.nombre_comercial` | texto |  |
| `empresa.logo_url` | texto o null |  |
| `empresa.validada` | booleano |  |
| `categoria` | [Ref](#obj-ref) |  |
| `modalidad` | [Ref](#obj-ref) |  |
| `jornada` | [Ref](#obj-ref) |  |
| `tipo_contrato` | [Ref](#obj-ref) |  |
| `municipio` | [Municipio](#obj-municipio) |  |
| `direccion` | texto o null |  |
| `plazas` | entero |  |
| `salario` | objeto o null | Para el candidato, null si mostrar_salario = false. |
| `salario.min` | número o null |  |
| `salario.max` | número o null |  |
| `mostrar_salario` | booleano |  |
| `nivel_educativo` | [NivelEducativo](#obj-niveleducativo) o null | Formación mínima; null si no se exige. |
| `experiencia_anios` | entero |  |
| `habilidades` | arreglo de objeto |  |
| `habilidades[].id` | entero |  |
| `habilidades[].nombre` | texto |  |
| `habilidades[].obligatoria` | booleano |  |
| `ajustes` | arreglo de objeto |  |
| `ajustes[].id` | entero |  |
| `ajustes[].nombre` | texto |  |
| `ajustes[].categoria` | `movilidad` \| `visual` \| `auditiva` \| `comunicacion` \| `cognitiva_psicosocial` \| `general` |  |
| `ajustes[].descripcion` | texto |  |
| `ajustes[].tipo` | `existente` \| `bajo_solicitud` |  |
| `sin_condiciones_accesibilidad` | booleano | Declaración explícita de que el lugar no cuenta con condiciones de accesibilidad. |
| `notas_accesibilidad` | texto o null |  |
| `estado` | `borrador` \| `publicada` \| `pausada` \| `cerrada` \| `suspendida` |  |
| `motivo_estado` | texto o null |  |
| `publicada_en` | fecha-hora o null |  |
| `actualizado_en` | fecha-hora |  |
| `postulacion_id` | entero o null | Solo candidato: su postulación a esta vacante, si existe. |
| `postulados` | entero o null | Solo reclutador dueño y administrador. |

<a id="obj-vacanteentrada"></a>
### VacanteEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `titulo` | texto | (máx. 120 car.) |
| `categoria_id` | entero |  |
| `descripcion` | texto | (máx. 2000 car.) |
| `jornada_id` | entero |  |
| `tipo_contrato_id` | entero |  |
| `plazas` | entero | (≥ 1) |
| `modalidad_id` | entero |  |
| `municipio_id` | entero |  |
| `direccion` | texto o null | Obligatoria si la modalidad es presencial o híbrida. (máx. 255 car.) |
| `salario_min` | número o null |  |
| `salario_max` | número o null |  |
| `mostrar_salario` | booleano |  |
| `nivel_educativo_id` | entero o null |  |
| `experiencia_anios` | entero | (≥ 0, ≤ 50) |
| `habilidades` | arreglo de objeto | Al menos una obligatoria para publicar. |
| `habilidades[].habilidad_id` | entero |  |
| `habilidades[].obligatoria` | booleano |  |
| `ajustes` | arreglo de objeto |  |
| `ajustes[].ajuste_id` | entero |  |
| `ajustes[].tipo` | `existente` \| `bajo_solicitud` |  |
| `sin_condiciones_accesibilidad` | booleano | Para publicar: `ajustes` no vacío o este campo en true. |
| `notas_accesibilidad` | texto o null | (máx. 500 car.) |
| `estado` | `borrador` \| `publicada` | «publicada» exige empresa validada y todos los campos obligatorios. |

<a id="obj-vacanteguardada"></a>
### VacanteGuardada

| Campo | Tipo | Descripción |
|---|---|---|
| `vacante` | [VacanteDetalle](#obj-vacantedetalle) |  |
| `postulados_notificados` | entero | Postulados avisados porque cambiaron requisitos o accesibilidad (0 si no aplica). |

<a id="obj-cambioestadovacante"></a>
### CambioEstadoVacante

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | `publicada` \| `pausada` \| `cerrada` |  |

<a id="obj-vacantereclutador"></a>
### VacanteReclutador

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `titulo` | texto |  |
| `estado` | `borrador` \| `publicada` \| `pausada` \| `cerrada` \| `suspendida` |  |
| `modalidad` | [Ref](#obj-ref) |  |
| `postulados` | entero |  |
| `nuevas` | entero | Postulaciones en estado «postulada». |
| `publicada_en` | fecha-hora o null |  |
| `actualizado_en` | fecha-hora |  |

<a id="obj-paginavacantesreclutador"></a>
### PaginaVacantesReclutador

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [VacanteReclutador](#obj-vacantereclutador) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-compatibilidad"></a>
### Compatibilidad

Desglose para el candidato (incluye el componente A de accesibilidad).

| Campo | Tipo | Descripción |
|---|---|---|
| `puntaje` | entero | 0 a 100. (≥ 0, ≤ 100) |
| `componentes` | objeto | Valores de 0 a 1. |
| `componentes.h` | número |  |
| `componentes.a` | número |  |
| `componentes.m` | número |  |
| `componentes.f` | número |  |
| `habilidades` | objeto |  |
| `habilidades.obligatorias_cumplidas` | arreglo de [Habilidad](#obj-habilidad) |  |
| `habilidades.obligatorias_faltantes` | arreglo de [Habilidad](#obj-habilidad) |  |
| `habilidades.deseables_cumplidas` | arreglo de [Habilidad](#obj-habilidad) |  |
| `habilidades.deseables_faltantes` | arreglo de [Habilidad](#obj-habilidad) |  |
| `necesidades` | objeto |  |
| `necesidades.cubiertas` | arreglo de objeto |  |
| `necesidades.cubiertas[].id` | entero |  |
| `necesidades.cubiertas[].nombre` | texto |  |
| `necesidades.cubiertas[].categoria` | `movilidad` \| `visual` \| `auditiva` \| `comunicacion` \| `cognitiva_psicosocial` \| `general` |  |
| `necesidades.cubiertas[].tipo` | `existente` \| `bajo_solicitud` |  |
| `necesidades.no_cubiertas` | arreglo de [AjusteRef](#obj-ajusteref) |  |
| `modalidad` | objeto |  |
| `modalidad.vacante` | [Ref](#obj-ref) |  |
| `modalidad.coincide` | booleano |  |
| `formacion` | objeto |  |
| `formacion.requerida` | [NivelEducativo](#obj-niveleducativo) o null |  |
| `formacion.cumple` | `si` \| `cursando` \| `no` |  |
| `calculado_en` | fecha-hora |  |

<a id="obj-postulacionentrada"></a>
### PostulacionEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `vacante_id` | entero |  |
| `mensaje` | texto o null | (máx. 500 car.) |
| `compartir_ajustes` | booleano | Si el candidato acepta mostrar sus necesidades de ajuste a esta empresa. |

<a id="obj-eventohistorial"></a>
### EventoHistorial

| Campo | Tipo | Descripción |
|---|---|---|
| `estado_anterior` | `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` o null |  |
| `estado_nuevo` | `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` |  |
| `mensaje` | texto o null | Mensaje del reclutador para el candidato. |
| `creado_en` | fecha-hora |  |

<a id="obj-entrevista"></a>
### Entrevista

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `estado` | `agendada` \| `realizada` \| `no_asistio` \| `cancelada` |  |
| `inicio` | fecha-hora |  |
| `fin` | fecha-hora |  |
| `duracion_min` | `30` \| `45` \| `60` |  |
| `liga` | texto | Liga de Google Meet o Microsoft Teams. |
| `puede_cancelar` | booleano | Solo candidato: true si faltan al menos 24 h. |
| `vacante` | objeto |  |
| `vacante.id` | entero |  |
| `vacante.titulo` | texto |  |
| `empresa` | objeto |  |
| `empresa.id` | entero |  |
| `empresa.nombre_comercial` | texto |  |
| `creado_en` | fecha-hora |  |

<a id="obj-postulaciondetalle"></a>
### PostulacionDetalle

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `vacante` | objeto |  |
| `vacante.id` | entero |  |
| `vacante.titulo` | texto |  |
| `vacante.empresa` | objeto |  |
| `vacante.empresa.id` | entero |  |
| `vacante.empresa.nombre_comercial` | texto |  |
| `vacante.empresa.logo_url` | texto o null |  |
| `estado` | `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` |  |
| `mensaje` | texto o null |  |
| `comparte_ajustes` | booleano |  |
| `creado_en` | fecha-hora |  |
| `actualizado_en` | fecha-hora |  |
| `historial` | arreglo de [EventoHistorial](#obj-eventohistorial) | Del más antiguo al más reciente. |
| `entrevista` | [Entrevista](#obj-entrevista) o null | Entrevista vigente (agendada o realizada), si existe. |
| `puede_retirar` | booleano | false si ya está aceptada, no seleccionada o retirada. |

<a id="obj-postulacionresumen"></a>
### PostulacionResumen

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `vacante` | objeto |  |
| `vacante.id` | entero |  |
| `vacante.titulo` | texto |  |
| `vacante.empresa` | objeto |  |
| `vacante.empresa.id` | entero |  |
| `vacante.empresa.nombre_comercial` | texto |  |
| `vacante.empresa.logo_url` | texto o null |  |
| `estado` | `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` |  |
| `creado_en` | fecha-hora |  |
| `actualizado_en` | fecha-hora |  |
| `entrevista_inicio` | fecha-hora o null | Inicio de la entrevista agendada, si hay. |

<a id="obj-paginapostulaciones"></a>
### PaginaPostulaciones

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [PostulacionResumen](#obj-postulacionresumen) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-postulado"></a>
### Postulado

| Campo | Tipo | Descripción |
|---|---|---|
| `postulacion_id` | entero |  |
| `candidato` | objeto |  |
| `candidato.id` | entero |  |
| `candidato.nombre` | texto |  |
| `candidato.apellidos` | texto |  |
| `candidato.foto_url` | texto o null |  |
| `compatibilidad` | entero | Puntaje del reclutador: sin el componente A. (≥ 0, ≤ 100) |
| `estado` | `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` |  |
| `creado_en` | fecha-hora |  |
| `ajustes_por_confirmar` | booleano | true si compartió necesidades que la vacante no tiene como «existente». |

<a id="obj-paginapostulados"></a>
### PaginaPostulados

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [Postulado](#obj-postulado) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-postuladodetalle"></a>
### PostuladoDetalle

| Campo | Tipo | Descripción |
|---|---|---|
| `postulacion` | objeto |  |
| `postulacion.id` | entero |  |
| `postulacion.estado` | `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` |  |
| `postulacion.mensaje` | texto o null |  |
| `postulacion.creado_en` | fecha-hora |  |
| `postulacion.historial` | arreglo de [EventoHistorial](#obj-eventohistorial) |  |
| `vacante` | objeto |  |
| `vacante.id` | entero |  |
| `vacante.titulo` | texto |  |
| `candidato` | [CV](#obj-cv) |  |
| `compatibilidad` | objeto | Desglose para el reclutador: sin el componente A. |
| `compatibilidad.puntaje` | entero |  |
| `compatibilidad.componentes` | objeto |  |
| `compatibilidad.componentes.h` | número |  |
| `compatibilidad.componentes.m` | número |  |
| `compatibilidad.componentes.f` | número |  |
| `compatibilidad.habilidades` | objeto |  |
| `compatibilidad.habilidades.obligatorias_cumplidas` | arreglo de [Habilidad](#obj-habilidad) |  |
| `compatibilidad.habilidades.obligatorias_faltantes` | arreglo de [Habilidad](#obj-habilidad) |  |
| `compatibilidad.habilidades.deseables_cumplidas` | arreglo de [Habilidad](#obj-habilidad) |  |
| `compatibilidad.habilidades.deseables_faltantes` | arreglo de [Habilidad](#obj-habilidad) |  |
| `compatibilidad.modalidad` | objeto |  |
| `compatibilidad.modalidad.vacante` | [Ref](#obj-ref) |  |
| `compatibilidad.modalidad.coincide` | booleano |  |
| `compatibilidad.formacion` | objeto |  |
| `compatibilidad.formacion.requerida` | [NivelEducativo](#obj-niveleducativo) o null |  |
| `compatibilidad.formacion.cumple` | `si` \| `cursando` \| `no` |  |
| `necesidades` | arreglo de objeto o null | null si el candidato no compartió sus necesidades en esta postulación. |
| `nota_ajustes` | texto o null |  |
| `transiciones_permitidas` | arreglo de `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` | Estados a los que el reclutador puede mover la postulación ahora. |
| `entrevista` | [Entrevista](#obj-entrevista) o null |  |

<a id="obj-cambioestadopostulacion"></a>
### CambioEstadoPostulacion

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` |  |
| `mensaje` | texto o null | Visible para el candidato. (máx. 500 car.) |

<a id="obj-resultadocambioestado"></a>
### ResultadoCambioEstado

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `estado` | `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` |  |
| `historial` | arreglo de [EventoHistorial](#obj-eventohistorial) |  |
| `transiciones_permitidas` | arreglo de `postulada` \| `en_revision` \| `entrevista` \| `aceptada` \| `no_seleccionada` \| `retirada` |  |

<a id="obj-observacion"></a>
### Observacion

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `texto` | texto |  |
| `autor` | objeto |  |
| `autor.id` | entero |  |
| `autor.nombre` | texto |  |
| `autor.apellidos` | texto |  |
| `creado_en` | fecha-hora |  |

<a id="obj-observacionentrada"></a>
### ObservacionEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `texto` | texto | (máx. 1000 car.) |

<a id="obj-horarioentrada"></a>
### HorarioEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `vacante_id` | entero |  |
| `inicio` | fecha-hora | Debe ser futura. |
| `duracion_min` | `30` \| `45` \| `60` |  |
| `liga` | texto | https://meet.google.com/... o https://teams.microsoft.com/... |

<a id="obj-horario"></a>
### Horario

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `vacante_id` | entero |  |
| `inicio` | fecha-hora |  |
| `fin` | fecha-hora |  |
| `duracion_min` | entero |  |
| `estado` | `libre` \| `agendado` \| `cancelado` |  |
| `liga` | texto o null | Solo para el reclutador; el candidato la recibe al agendar. |

<a id="obj-reservaentrevista"></a>
### ReservaEntrevista

| Campo | Tipo | Descripción |
|---|---|---|
| `horario_id` | entero |  |

<a id="obj-cancelacioncandidato"></a>
### CancelacionCandidato

| Campo | Tipo | Descripción |
|---|---|---|
| `motivo` *(opcional)* | texto o null | (máx. 255 car.) |

<a id="obj-resultadoentrevista"></a>
### ResultadoEntrevista

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | `realizada` \| `no_asistio` \| `cancelada` |  |
| `motivo_cancelacion` | texto o null | Obligatorio si estado = cancelada. (máx. 255 car.) |

<a id="obj-diaagenda"></a>
### DiaAgenda

| Campo | Tipo | Descripción |
|---|---|---|
| `fecha` | fecha | Día en hora de la Ciudad de México. |
| `horarios` | arreglo de objeto |  |
| `horarios[].id` | entero |  |
| `horarios[].inicio` | fecha-hora |  |
| `horarios[].fin` | fecha-hora |  |
| `horarios[].duracion_min` | entero |  |
| `horarios[].liga` | texto |  |
| `horarios[].estado` | `libre` \| `agendado` \| `cancelado` |  |
| `horarios[].vacante` | objeto |  |
| `horarios[].vacante.id` | entero |  |
| `horarios[].vacante.titulo` | texto |  |
| `horarios[].entrevista` | objeto o null |  |
| `horarios[].entrevista.id` | entero |  |
| `horarios[].entrevista.estado` | `agendada` \| `realizada` \| `no_asistio` \| `cancelada` |  |
| `horarios[].entrevista.postulacion_id` | entero |  |
| `horarios[].entrevista.candidato` | objeto |  |
| `horarios[].entrevista.candidato.id` | entero |  |
| `horarios[].entrevista.candidato.nombre` | texto |  |
| `horarios[].entrevista.candidato.apellidos` | texto |  |

<a id="obj-reporteentrada"></a>
### ReporteEntrada

Exactamente uno de vacante_id, empresa_id o candidato_id.

| Campo | Tipo | Descripción |
|---|---|---|
| `motivo_reporte_id` | entero |  |
| `vacante_id` *(opcional)* | entero o null |  |
| `empresa_id` *(opcional)* | entero o null |  |
| `candidato_id` *(opcional)* | entero o null |  |
| `descripcion` *(opcional)* | texto o null | (máx. 500 car.) |

<a id="obj-reportecreado"></a>
### ReporteCreado

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero | Folio. |
| `estado` | `abierto` \| `en_revision` \| `resuelto` \| `descartado` |  |
| `creado_en` | fecha-hora |  |

<a id="obj-estadisticas"></a>
### Estadisticas

Solo datos agregados. Las categorías con menos de 5 registros en `brecha_ajustes` se suman en «Otros» cuando hay 5 o más candidatos; con datos de prueba se muestran tal cual.

| Campo | Tipo | Descripción |
|---|---|---|
| `periodo` | objeto |  |
| `periodo.desde` | fecha |  |
| `periodo.hasta` | fecha |  |
| `indicadores` | objeto |  |
| `indicadores.candidatos_activos` | entero |  |
| `indicadores.empresas_validadas` | entero |  |
| `indicadores.vacantes_publicadas` | entero |  |
| `indicadores.postulaciones` | entero | Postulaciones creadas en el periodo. |
| `indicadores.contrataciones` | entero | Postulaciones que pasaron a «aceptada» en el periodo. |
| `indicadores.tasa_colocacion` | número | Candidatos con al menos una postulación aceptada en el periodo ÷ candidatos que se postularon en el periodo × 100. |
| `pendientes` | objeto |  |
| `pendientes.empresas_por_validar` | entero |  |
| `pendientes.reportes_abiertos` | entero |  |
| `graficas` | objeto |  |
| `graficas.postulaciones_por_estado` | arreglo de objeto |  |
| `graficas.postulaciones_por_estado[].etiqueta` | texto |  |
| `graficas.postulaciones_por_estado[].total` | entero |  |
| `graficas.vacantes_por_modalidad` | arreglo de objeto |  |
| `graficas.vacantes_por_modalidad[].etiqueta` | texto |  |
| `graficas.vacantes_por_modalidad[].total` | entero |  |
| `graficas.vacantes_por_categoria` | arreglo de objeto |  |
| `graficas.vacantes_por_categoria[].etiqueta` | texto |  |
| `graficas.vacantes_por_categoria[].total` | entero |  |
| `graficas.evolucion_mensual` | arreglo de objeto |  |
| `graficas.evolucion_mensual[].mes` | texto | AAAA-MM |
| `graficas.evolucion_mensual[].postulaciones` | entero |  |
| `graficas.evolucion_mensual[].contrataciones` | entero |  |
| `graficas.brecha_ajustes` | arreglo de objeto |  |
| `graficas.brecha_ajustes[].etiqueta` | texto |  |
| `graficas.brecha_ajustes[].solicitados` | entero |  |
| `graficas.brecha_ajustes[].ofrecidos` | entero |  |
| `graficas.brecha_habilidades` | arreglo de objeto |  |
| `graficas.brecha_habilidades[].etiqueta` | texto |  |
| `graficas.brecha_habilidades[].demandadas` | entero |  |
| `graficas.brecha_habilidades[].registradas` | entero |  |

<a id="obj-usuarioadmin"></a>
### UsuarioAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `apellidos` | texto |  |
| `correo` | texto |  |
| `telefono` | texto o null |  |
| `rol` | `candidato` \| `reclutador` \| `administrador` |  |
| `estado` | `activo` \| `suspendido` \| `eliminado` |  |
| `empresa` | objeto o null |  |
| `empresa.id` | entero |  |
| `empresa.nombre_comercial` | texto |  |
| `creado_en` | fecha-hora |  |
| `ultimo_acceso_en` | fecha-hora o null |  |

<a id="obj-paginausuarios"></a>
### PaginaUsuarios

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [UsuarioAdmin](#obj-usuarioadmin) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-usuarioadmindetalle"></a>
### UsuarioAdminDetalle

Nunca incluye las necesidades de ajuste del candidato.

| Campo | Tipo | Descripción |
|---|---|---|
| `usuario` | [UsuarioAdmin](#obj-usuarioadmin) |  |
| `motivo_estado` | texto o null |  |
| `puesto` | texto o null | Solo reclutadores. |
| `totales` | objeto |  |
| `totales.postulaciones` | entero o null | Solo candidatos. |
| `totales.vacantes` | entero o null | Solo reclutadores. |
| `totales.reportes_recibidos` | entero |  |
| `totales.reportes_hechos` | entero |  |

<a id="obj-usuarioadminentrada"></a>
### UsuarioAdminEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `rol` | `candidato` \| `reclutador` \| `administrador` |  |
| `nombre` | texto | (máx. 80 car.) |
| `apellidos` | texto | (máx. 120 car.) |
| `correo` | texto |  |
| `telefono` *(opcional)* | texto o null | (patrón `^[0-9]{10}$`) |
| `contrasena` *(opcional)* | texto | Solo al crear. (máx. 64 car., mín. 8 car.) |
| `empresa_id` *(opcional)* | entero o null | Obligatorio si rol = reclutador. |
| `puesto` *(opcional)* | texto o null | Obligatorio si rol = reclutador. (máx. 100 car.) |

<a id="obj-cambioestadousuario"></a>
### CambioEstadoUsuario

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | `activo` \| `suspendido` \| `eliminado` |  |
| `motivo` | texto o null | Obligatorio salvo al reactivar. (máx. 255 car.) |

<a id="obj-empresaadmin"></a>
### EmpresaAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `razon_social` | texto |  |
| `nombre_comercial` | texto |  |
| `rfc` | texto |  |
| `sector` | [Ref](#obj-ref) |  |
| `estado` | `pendiente` \| `validada` \| `rechazada` \| `suspendida` |  |
| `reclutadores` | entero |  |
| `vacantes_activas` | entero |  |
| `documento` | booleano | true si ya subió la constancia. |
| `creado_en` | fecha-hora |  |

<a id="obj-paginaempresasadmin"></a>
### PaginaEmpresasAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [EmpresaAdmin](#obj-empresaadmin) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-empresaadmindetalle"></a>
### EmpresaAdminDetalle

| Campo | Tipo | Descripción |
|---|---|---|
| `empresa` | [EmpresaPropia](#obj-empresapropia) |  |
| `reclutadores` | arreglo de objeto |  |
| `reclutadores[].usuario_id` | entero |  |
| `reclutadores[].nombre` | texto |  |
| `reclutadores[].apellidos` | texto |  |
| `reclutadores[].correo` | texto |  |
| `reclutadores[].puesto` | texto |  |
| `reclutadores[].estado` | `activo` \| `suspendido` \| `eliminado` |  |
| `rfc_duplicado` | booleano | true si otra empresa tiene el mismo RFC (no debería pasar; sirve para alertar). |
| `reportes` | entero | Reportes recibidos por la empresa. |

<a id="obj-empresaadminentrada"></a>
### EmpresaAdminEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `razon_social` | texto | (máx. 200 car.) |
| `nombre_comercial` | texto | (máx. 150 car.) |
| `rfc` | texto | (patrón `^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$`) |
| `sector_id` | entero |  |
| `tamano_empresa_id` | entero |  |
| `municipio_id` | entero |  |
| `direccion` *(opcional)* | texto o null |  |
| `descripcion` *(opcional)* | texto o null | (máx. 1000 car.) |
| `sitio_web` *(opcional)* | texto o null |  |
| `practicas_inclusion` *(opcional)* | texto o null | (máx. 1000 car.) |

<a id="obj-validacion"></a>
### Validacion

| Campo | Tipo | Descripción |
|---|---|---|
| `decision` | `validada` \| `rechazada` |  |
| `motivo` | texto o null | Obligatorio si decision = rechazada. (máx. 255 car.) |

<a id="obj-cambioestadoempresa"></a>
### CambioEstadoEmpresa

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | `suspendida` \| `validada` | «validada» reactiva una empresa suspendida. |
| `motivo` | texto o null | Obligatorio al suspender. (máx. 255 car.) |

<a id="obj-resultadoestadoempresa"></a>
### ResultadoEstadoEmpresa

| Campo | Tipo | Descripción |
|---|---|---|
| `empresa` | [EmpresaPropia](#obj-empresapropia) |  |
| `vacantes_suspendidas` | entero |  |
| `postulados_notificados` | entero |  |

<a id="obj-vacanteadmin"></a>
### VacanteAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `titulo` | texto |  |
| `empresa` | objeto |  |
| `empresa.id` | entero |  |
| `empresa.nombre_comercial` | texto |  |
| `categoria` | [Ref](#obj-ref) |  |
| `modalidad` | [Ref](#obj-ref) |  |
| `estado` | `borrador` \| `publicada` \| `pausada` \| `cerrada` \| `suspendida` |  |
| `publicada_en` | fecha-hora o null |  |
| `postulados` | entero |  |
| `reportes_abiertos` | entero |  |

<a id="obj-paginavacantesadmin"></a>
### PaginaVacantesAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [VacanteAdmin](#obj-vacanteadmin) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-moderacionvacante"></a>
### ModeracionVacante

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | `suspendida` \| `publicada` | «publicada» reactiva una vacante suspendida. |
| `motivo` | texto o null | Obligatorio al suspender. (máx. 255 car.) |

<a id="obj-categoriaadmin"></a>
### CategoriaAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `descripcion` | texto o null |  |
| `activo` | booleano |  |
| `habilidades` | entero |  |
| `vacantes` | entero | Vacantes que la usan. |

<a id="obj-categoriaentrada"></a>
### CategoriaEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | texto | (máx. 80 car.) |
| `descripcion` | texto o null | (máx. 255 car.) |

<a id="obj-habilidadadmin"></a>
### HabilidadAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `categoria` | [Ref](#obj-ref) |  |
| `activo` | booleano |  |
| `candidatos` | entero | Candidatos que la registraron. |
| `vacantes` | entero | Vacantes que la requieren. |

<a id="obj-habilidadentrada"></a>
### HabilidadEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | texto | (máx. 80 car.) |
| `categoria_id` | entero |  |

<a id="obj-activacion"></a>
### Activacion

| Campo | Tipo | Descripción |
|---|---|---|
| `activo` | booleano |  |

<a id="obj-catalogoadmin"></a>
### CatalogoAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre` | texto |  |
| `activo` | booleano |  |
| `en_uso` | entero | Registros que lo usan; si es mayor que 0 no se puede eliminar. |
| `descripcion` *(opcional)* | texto o null |  |
| `categoria` *(opcional)* | texto o null |  |
| `orden` *(opcional)* | entero o null |  |
| `rango` *(opcional)* | texto o null |  |
| `aplica_a` *(opcional)* | texto o null |  |

<a id="obj-catalogoentrada"></a>
### CatalogoEntrada

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | texto | (máx. 100 car.) |
| `descripcion` *(opcional)* | texto o null | Obligatoria en ajustes. (máx. 255 car.) |
| `categoria` *(opcional)* | `movilidad` \| `visual` \| `auditiva` \| `comunicacion` \| `cognitiva_psicosocial` \| `general` o null | Obligatoria en ajustes. |
| `orden` *(opcional)* | entero o null | Obligatorio en niveles educativos. |
| `rango` *(opcional)* | texto o null | Obligatorio en tamaños de empresa. (máx. 40 car.) |
| `aplica_a` *(opcional)* | `vacante` \| `empresa` \| `candidato` \| `todos` o null | Obligatorio en motivos de reporte. |

<a id="obj-reporteadmin"></a>
### ReporteAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero | Folio. |
| `tipo` | `vacante` \| `empresa` \| `candidato` |  |
| `objeto` | objeto |  |
| `objeto.id` | entero |  |
| `objeto.nombre` | texto |  |
| `motivo` | [Ref](#obj-ref) |  |
| `reportante` | objeto |  |
| `reportante.id` | entero |  |
| `reportante.nombre` | texto |  |
| `reportante.apellidos` | texto |  |
| `estado` | `abierto` \| `en_revision` \| `resuelto` \| `descartado` |  |
| `creado_en` | fecha-hora |  |

<a id="obj-paginareportes"></a>
### PaginaReportes

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [ReporteAdmin](#obj-reporteadmin) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

<a id="obj-reporteadmindetalle"></a>
### ReporteAdminDetalle

| Campo | Tipo | Descripción |
|---|---|---|
| `reporte` | [ReporteAdmin](#obj-reporteadmin) |  |
| `descripcion` | texto o null |  |
| `resolucion` | texto o null |  |
| `accion` | `ninguna` \| `suspension` o null |  |
| `atendido_por` | objeto o null |  |
| `atendido_por.id` | entero |  |
| `atendido_por.nombre` | texto |  |
| `atendido_por.apellidos` | texto |  |
| `cerrado_en` | fecha-hora o null |  |
| `historial` | arreglo de objeto |  |
| `historial[].estado_anterior` | `abierto` \| `en_revision` \| `resuelto` \| `descartado` o null |  |
| `historial[].estado_nuevo` | `abierto` \| `en_revision` \| `resuelto` \| `descartado` |  |
| `historial[].comentario` | texto o null |  |
| `historial[].usuario` | objeto o null |  |
| `historial[].usuario.id` | entero |  |
| `historial[].usuario.nombre` | texto |  |
| `historial[].creado_en` | fecha-hora |  |
| `objeto_estado` | texto | Estado actual del elemento reportado (p. ej. «publicada», «validada», «activo»). |
| `reportes_previos` | arreglo de objeto | Otros reportes contra el mismo elemento. |
| `reportes_previos[].id` | entero |  |
| `reportes_previos[].motivo` | texto |  |
| `reportes_previos[].estado` | `abierto` \| `en_revision` \| `resuelto` \| `descartado` |  |
| `reportes_previos[].creado_en` | fecha-hora |  |

<a id="obj-seguimientoreporte"></a>
### SeguimientoReporte

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | `en_revision` \| `resuelto` \| `descartado` |  |
| `comentario` *(opcional)* | texto o null | (máx. 500 car.) |
| `resolucion` *(opcional)* | texto o null | Obligatoria al pasar a resuelto o descartado. (máx. 1000 car.) |
| `accion` *(opcional)* | `ninguna` \| `suspension` o null | Se registra al cerrar; la suspensión se hace con el endpoint del elemento. |

<a id="obj-empresapublica"></a>
### EmpresaPublica

Ficha pública: sin razón social, RFC ni documento.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | entero |  |
| `nombre_comercial` | texto |  |
| `logo_url` | texto o null |  |
| `sector` | [Ref](#obj-ref) |  |
| `tamano_empresa` | [TamanoEmpresa](#obj-tamanoempresa) |  |
| `municipio` | [Municipio](#obj-municipio) |  |
| `descripcion` | texto o null |  |
| `sitio_web` | texto o null |  |
| `practicas_inclusion` | texto o null |  |
| `vacantes` | arreglo de [VacanteResumen](#obj-vacanteresumen) | Vacantes publicadas de la empresa. |

<a id="obj-paginahabilidadesadmin"></a>
### PaginaHabilidadesAdmin

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | arreglo de [HabilidadAdmin](#obj-habilidadadmin) |  |
| `total` | entero |  |
| `page` | entero |  |
| `size` | entero |  |

