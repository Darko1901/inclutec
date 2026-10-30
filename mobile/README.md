# App móvil de IncluTec

App de **candidatos** y **reclutadores** hecha con React Native + Expo (TypeScript estricto) y React Navigation. Es una sola app: la navegación cambia según el rol de quien inicia sesión. El administrador usa el panel web (`web/`); si entra a la app se le avisa y se cierra su sesión.

- **Candidato:** busca vacantes, ve qué tan compatibles son con su perfil, se postula, lleva su CV y sus necesidades de ajuste (nunca diagnósticos), agenda entrevistas y recibe notificaciones.
- **Reclutador:** administra la organización y sus vacantes, revisa postulados ordenados por compatibilidad, cambia su estado, publica horarios de entrevista y lleva la agenda.

Hasta que el API exista (sprint 4), la app corre con **datos simulados** que responden igual que el contrato (`docs/api/contrato.md`). Qué hace cada pantalla: `docs/diseno/requerimientos.md` y `docs/diseno/pantallas.md`.

## Índice

1. [Requisitos](#requisitos) · 2. [Instalación](#instalación) · 3. [Correr en Expo Go](#correr-en-expo-go) · 4. [Datos simulados o API real](#datos-simulados-o-api-real) · 5. [Cuentas de prueba y datos extra del mock](#cuentas-de-prueba-y-datos-extra-del-mock) · 6. [Mapa de pantallas](#mapa-de-pantallas) · 7. [Recorrido para la demostración](#recorrido-para-la-demostración) · 8. [Arquitectura](#arquitectura) · 9. [Accesibilidad](#accesibilidad) · 10. [Lista de verificación con VoiceOver y TalkBack](#lista-de-verificación-con-voiceover-y-talkback) · 11. [Qué falta probar en dispositivo](#qué-falta-probar-en-dispositivo) · 12. [Calidad](#calidad) · 13. [Dependencias y auditoría](#dependencias-y-auditoría) · 14. [Decisiones importantes](#decisiones-importantes)

## Requisitos

| Herramienta | Versión                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------ |
| Node.js     | 20.19.4 o superior (22.13+ o 24.3+ recomendado; probado con 24.21)                         |
| npm         | 10 o superior                                                                              |
| Expo SDK    | 57 (ya viene en `package.json`)                                                            |
| Teléfono    | Android 8+ o iOS 15+ con la app **Expo Go** actualizada a la versión que soporta el SDK 57 |

## Instalación

```bash
cd mobile
npm install
cp .env.example .env   # opcional: los valores por omisión ya usan los datos simulados
```

## Correr en Expo Go

1. Conecta el teléfono y la computadora a la **misma red Wi-Fi**.
2. Inicia el servidor en modo Expo Go: `npx expo start --go`. El QR debe mostrar una URL `exp://` con la IP de tu computadora.
3. Escanea el código QR con Expo Go (Android) o con la cámara (iOS).

Si no conecta:

- **Firewall:** en Linux con `firewalld` abre el puerto de Metro: `sudo firewall-cmd --add-port=8081/tcp`.
- **Aislamiento de clientes** (redes de escuela, oficina o algunos módems): conecta la computadora al punto de acceso (hotspot) del teléfono y repite el paso 2.
- **`--tunnel`:** funciona aunque la red aísle los equipos, pero exige una cuenta gratuita de Expo (`npx expo login`). Úsalo solo si no hay otra opción.
- **«Development build» en lugar de Expo Go:** si la terminal dice «Using development build», presiona `s` o arranca con `--go`. Este proyecto no usa `expo-dev-client`.

También funciona en emulador: `npm run android` / `npm run ios` (este último solo en macOS).

**Límites de Expo Go:** las notificaciones push remotas no existen en Expo Go (Android desde el SDK 53), así que el registro del dispositivo (`POST /dispositivos`) se omite; funciona en una _development build_. Las demás funciones (galería, cámara, documentos, portapapeles, liga de entrevista) sí corren.

## Datos simulados o API real

Las pantallas y los componentes **nunca** importan datos de prueba; solo usan los servicios de `src/api`. Cada servicio tiene una interfaz y dos implementaciones, y `src/api/servicios.ts` elige una según `EXPO_PUBLIC_USE_MOCK`:

| Implementación | Qué hace                                                                                                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mock**       | `src/api/mock/`: responde con las mismas rutas lógicas, códigos HTTP, `codigo` de error y JSON del contrato, con una latencia de 300 a 700 ms. Los datos son los de `db/semillas/S002__datos_prueba.sql` más datos extra solo del mock.             |
| **HTTP**       | `src/api/*.ts`: usa el cliente Axios de `cliente.ts`, que agrega `Authorization: Bearer`, convierte toda respuesta de error en `ApiError { status, codigo, detail, campos }` y, ante un `401 no_autenticado`, avisa a la sesión para que se cierre. |

Los errores de red y los 5xx se convierten en `error_interno` con el mensaje «El servicio no está disponible; intenta más tarde». ESLint impide importar `api/mock/` desde `pantallas/`, `componentes/`, `navegacion/` y `sesion/`.

### Variables de entorno

Se leen del archivo `.env` (no se sube a git; la plantilla es `.env.example`). Después de cambiarlas, reinicia con `npx expo start -c`.

| Variable               | Por omisión                    | Para qué sirve                                                                                                                                         |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_USE_MOCK` | `true`                         | `true` usa los datos simulados; `false` llama al API real.                                                                                             |
| `EXPO_PUBLIC_API_URL`  | `http://localhost:8000/api/v1` | URL base del API. En un teléfono físico `localhost` es el propio teléfono: usa la IP de tu computadora, por ejemplo `http://192.168.1.20:8000/api/v1`. |

Para pasar al API real: `EXPO_PUBLIC_USE_MOCK=false`, la URL de tu computadora y `npx expo start -c`. Las fotos y los logotipos se sirven fuera de `/api/v1` (`http://…:8000/archivos/…`); `urlArchivo()` arma la dirección completa.

### Tipos del API

`src/api/esquema.d.ts` se **genera** con `openapi-typescript` a partir de `docs/api/openapi.yaml`; no se edita a mano. Cuando cambie el contrato, corre `npm run tipos` y revisa los errores de TypeScript que aparezcan. `src/api/tipos.ts` solo les pone nombre (`Usuario`, `Sesion`, …).

## Cuentas de prueba y datos extra del mock

Son las de `db/semillas/S002__datos_prueba.sql`. La contraseña de todas es **Inclutec2026**.

| Correo                              | Rol                                       | Qué ocurre al entrar                                                                                                                        |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| mariana.lopez@correo.mx             | Candidata                                 | Llega a Vacantes; la pestaña Notificaciones dice «1 sin leer».                                                                              |
| jorge.ramirez@correo.mx             | Candidato                                 | Llega a Vacantes; sin notificaciones.                                                                                                       |
| rh@tecnoqro.mx                      | Reclutadora (Laura, TecnoQro)             | Llega a Mis vacantes; Notificaciones dice «1 sin leer» (la entrevista de Mariana).                                                          |
| rh@logibajio.mx                     | Reclutador (Roberto, LogiBajío)           | Llega a Mis vacantes; Notificaciones dice «1 sin leer» (la postulación de Jorge).                                                           |
| talento@concentro.mx                | Reclutadora (Patricia, ConCentro)         | Llega a Mis vacantes; sin notificaciones.                                                                                                   |
| contacto@estudiotrazo.mx            | Reclutador (Daniel, Estudio Trazo)        | Llega a Organización; su empresa está **pendiente** de validar (solo puede crear borradores).                                               |
| admin@inclutec.mx                   | Administrador                             | Muestra «El administrador usa el panel web» y no inicia sesión.                                                                             |
| **suspendida@correo.mx**            | Candidata suspendida                      | Responde 423: «Tu cuenta está suspendida.»                                                                                                  |
| **notificaciones@correo.mx**        | Candidata (Lucía)                         | Llega a Vacantes; tiene 45 notificaciones (5 sin leer) para probar el desplazamiento infinito y «Marcar todas como leídas».                 |
| **rechazada@constructorarivera.mx** | Reclutador (Ernesto, Constructora Rivera) | Llega a Mis vacantes; su empresa está **rechazada** (con motivo): sirve para ver el banner rojo y subir la constancia (pasa a «pendiente»). |
| **suspendida@academiaalameda.mx**   | Reclutadora (Gabriela, Academia Alameda)  | Llega a Mis vacantes; su empresa está **suspendida** (con motivo) y no puede subir constancia (409).                                        |

Las cuentas en **negritas** existen solo en el mock. Sus ids son **100 a 103** (los de S002 van del 1 al 7) para que nunca choquen con la base de datos; las dos de reclutador tienen además las empresas 100 (Constructora Rivera, rechazada) y 101 (Academia Alameda, suspendida). Los candidatos de relleno de REC-04 tienen ids de 110 a 145. Las cuentas que se registren en la app reciben ids desde el 104 (saltando las que ya existen). Las notificaciones extra del mock tienen id 90 en adelante. Las cuentas solo del mock tienen el perfil vacío (sin habilidades ni formación), así que sirven para probar que «Postularme» se bloquea cuando el perfil está incompleto; igual pasa con cualquier cuenta que se registre en la app.

### Los datos son relativos a hoy y viven en memoria

- Todas las fechas se calculan al abrir la app: la entrevista de Mariana es **dentro de 3 días**, los horarios libres van de unas horas a 5 días y las postulaciones, notificaciones y reportes de S002 quedan «hace unos días» (`src/api/mock/fechasS002.ts` las mueve todas juntas conservando su distancia; ninguna queda en el futuro). Así el video se puede grabar cualquier día sin preparar nada.
- Los cambios (registros, notificaciones leídas, contraseñas, perfil, CV, vacantes, estados, horarios) se guardan **en memoria**: al cerrar la app por completo vuelven los datos originales. La sesión sí se conserva (el token está en `expo-secure-store`).

### Vacantes

Los datos de negocio son los de S002: 4 empresas (TecnoQro, LogiBajío y ConCentro validadas; Estudio Trazo pendiente), 8 vacantes (6 publicadas y 2 borradores) y el reporte 1 de la vacante 5. La compatibilidad no se lee de una tabla: la calcula el motor de `src/api/mock/compatibilidad.ts`, y su prueba comprueba que reproduce las 12 filas guardadas en S002.

| Vacante | Empresa   | Modalidad  | Para probar                                                               |
| ------- | --------- | ---------- | ------------------------------------------------------------------------- |
| 1       | TecnoQro  | Híbrido    | Mariana: 88 %, ya postulada («Ver mi postulación»); Jorge: 57 %           |
| 2       | LogiBajío | Presencial | Cubre las necesidades de Mariana; ofrece intérprete de LSM bajo solicitud |
| 3       | LogiBajío | Híbrido    | Jorge ya se postuló (79 %)                                                |
| 4       | ConCentro | Remoto     | No muestra salario                                                        |
| 5       | ConCentro | Presencial | Declara que el lugar **no** cuenta con condiciones de accesibilidad       |
| 6       | TecnoQro  | Remoto     | Con intérprete de LSM bajo solicitud                                      |
| 7 y 8   | —         | —          | Borradores: nunca aparecen en la lista del candidato                      |

### Postulaciones, entrevistas y empresas

Además de los de S002, el mock agrega (ids desde 100) lo necesario para probar CAN-05 a CAN-07:

| Dato                                              | Cuenta  | Para probar                                                                                                                                                                                                                              |
| ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postulación 1 (S002), vacante 1, «Entrevista»     | Mariana | Entrevista agendada dentro de 3 días (45 min, Google Meet): se puede cancelar. Al cancelarla, «Elige un horario» y volver a agendar.                                                                                                     |
| Postulación 101, vacante 6, «Aceptada»            | Mariana | Historial con mensaje de felicitación y una entrevista ya «Realizada» (sin liga ni botones).                                                                                                                                             |
| Postulación 102, vacante 3, «No seleccionada»     | Mariana | Historial con el mensaje «Por ahora avanzamos con otros perfiles…».                                                                                                                                                                      |
| Postulación 103, vacante 4, «Retirada»            | Mariana | Estado «Retirada» y sin botón de retirar.                                                                                                                                                                                                |
| Postulación 100, vacante 6, «Entrevista»          | Jorge   | Entrevista que empieza en 5 horas (Teams): **no se puede cancelar** y la pantalla explica por qué.                                                                                                                                       |
| Horarios libres de la vacante 1 (ids 2 y 100–104) | Mariana | Dentro de 3, 27, 30, 73 (el horario 2 de S002), 120 y 121 horas, agrupados por día («Hoy» o «Mañana» según la hora a la que abras la app). El de 30 h y 60 min (id 102) **lo toma otro candidato** justo cuando intentas agendarlo: 409. |

Para REC-04 a REC-06 el mock agrega **28 postulados a la vacante 1 de TecnoQro** (ids de postulación 110 a 145 más la de Mariana; sus candidatos son cuentas solo del mock y cualquiera puede entrar con su correo, `nombre.apellido@correo.mx`, y `Inclutec2026`):

| Postulación | Candidato        | Para probar                                                                                                                        |
| ----------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1 (S002)    | Mariana          | 83 % para la reclutadora, «Entrevista», necesidades que el lugar ya cubre y una entrevista agendada (horario 1, dentro de 3 días). |
| 110         | Carlos Mendoza   | 100 %, «Postulada», **no compartió** necesidades («El candidato no compartió esta información.») y contacto oculto.                |
| 112         | Fernando Silva   | «Postulada» con **ajustes por confirmar** (lector de pantalla y documentos accesibles que la vacante no declara) y una nota.       |
| 114         | Héctor Ramírez   | «En revisión»: una necesidad cubierta y una que la vacante ofrece **bajo solicitud**.                                              |
| 115         | Irene Salazar    | «Entrevista» con la entrevista (horario 110) **empezada hace una hora**: se puede marcar como realizada o «No asistió».            |
| 117 y 113   | Karla y Gabriela | «Aceptada» y «No seleccionada»: no tienen transiciones. 117 empata en 100 % con Carlos (se ordena antes quien se postuló primero). |
| 118         | Luis Herrera     | «Retirada»: solo sale con el filtro «Retirada»; no cuenta en «28 postulados».                                                      |
| 130 a 145   | Relleno          | Casi todos «Postulada» con compatibilidades repartidas: hacen falta dos páginas (20 + 8) y sirven para los filtros.                |

Los horarios de Laura (ids 1, 2, 100 a 104 y 110) y los de la vacante 6 (105 y 106) alimentan la agenda. Las vacantes 2 y 5 se dejaron libres a propósito (Mariana puede postularse a ellas). Un retiro **sin** entrevista agendada no genera notificación porque el contrato no define ninguna; con entrevista, el reclutador recibe «Entrevista cancelada».

El directorio de empresas solo muestra las validadas (ConCentro, LogiBajío y TecnoQro); **Estudio Trazo** (pendiente) no aparece ni tiene ficha. Cada empresa trae el sector, tamaño, descripción y prácticas de inclusión de S002; el sitio web de TecnoQro es el del ejemplo del contrato, el de LogiBajío se agregó solo en el mock y ConCentro no tiene (para ver la ficha sin enlace).

### Otras pruebas con el mock

- **429:** escribe una contraseña incorrecta 5 veces con el mismo correo; el siguiente intento, aunque sea correcto, responde «Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.» (el bloqueo dura mientras la app esté abierta).
- **Código de recuperación de contraseña:** el código válido es siempre **`123456`** (vence a los 15 minutos; después de 5 intentos incorrectos responde 410; el reenvío solo se permite 60 s después del envío anterior). No llega ningún correo.
- **Registro:** `mariana.lopez@correo.mx` (o cualquier correo de la tabla de arriba) responde «correo ya registrado» y el RFC `TQU150312AB1` responde «RFC ya registrado». Cualquier otro dato válido crea la cuenta (el candidato llega a Perfil y el reclutador a Organización; su empresa queda «pendiente»).
- **Habilidades solo del mock:** el catálogo de S001 tiene 15; el mock agrega las de id 16 a 33 (Nómina, Ventas, Almacenamiento…) para poder llegar al límite de 30 de CAN-04.

## Mapa de pantallas

Todas están terminadas y conectadas a los servicios. Los nombres de ruta son los de `src/navegacion/tipos.ts`.

| Código | Pantalla                                                                       | Ruta (navegador)                   | Quién la ve            |
| ------ | ------------------------------------------------------------------------------ | ---------------------------------- | ---------------------- |
| MOV-00 | Splash: valida la sesión guardada (máximo 3 s)                                 | `Splash`                           | Todos                  |
| MOV-01 | Inicio de sesión                                                               | `InicioSesion`                     | Sin sesión             |
| MOV-02 | Registro en 3 pasos (candidato o reclutador) y aviso de privacidad completo    | `Registro`, `AvisoPrivacidad`      | Sin sesión             |
| MOV-03 | Recuperar contraseña (correo, código de 6 dígitos y nueva contraseña)          | `RecuperarContrasena`              | Sin sesión             |
| MOV-04 | Notificaciones: lista paginada, marcar leídas y preferencias de aviso          | Pestaña `Notificaciones`           | Candidato y reclutador |
| CAN-01 | Vacantes: recomendadas, búsqueda, filtros y «cubre mis necesidades»            | Pestaña `Vacantes`                 | Candidato              |
| CAN-02 | Detalle de vacante: desglose de compatibilidad, postulación y reporte          | `DetalleVacante`                   | Candidato              |
| CAN-03 | Mi perfil: completitud, foto, datos, preferencias, necesidades y cuenta        | Pestaña `Perfil`                   | Candidato              |
| CAN-04 | Mi CV: experiencia, formación, habilidades y vista previa                      | `MiCV`                             | Candidato              |
| CAN-05 | Mis postulaciones: Activas y Finalizadas, filtro por estado                    | Pestaña `Postulaciones`            | Candidato              |
| CAN-06 | Detalle de postulación: historial, agendar, cancelar entrevista y retirar      | `DetallePostulacion`               | Candidato              |
| CAN-07 | Empresas: directorio y ficha con prácticas de inclusión y reporte              | Pestaña `Empresas`, `FichaEmpresa` | Candidato              |
| REC-01 | Organización: banner de validación, logo, datos, constancia y cuenta           | Pestaña `Organizacion`             | Reclutador             |
| REC-02 | Mis vacantes: filtro por estado, menú de acciones, duplicar                    | Pestaña `MisVacantes`              | Reclutador             |
| REC-03 | Crear o editar vacante en 4 pasos, publicar y recálculo de compatibilidad      | `EditarVacante`                    | Reclutador             |
| REC-04 | Postulados: orden por compatibilidad, filtros y paginación                     | `Postulados`                       | Reclutador             |
| REC-05 | Detalle del postulado: desglose, CV, contacto, estado, observaciones y reporte | `DetallePostulado`                 | Reclutador             |
| REC-06 | Agenda de entrevistas: publicar, eliminar, resultado y cancelar                | Pestaña `Agenda`                   | Reclutador             |

Barras inferiores: candidato (Vacantes, Postulaciones, Empresas, Notificaciones, Perfil) y reclutador (Mis vacantes, Agenda, Notificaciones, Organización); la pestaña de notificaciones anuncia «Notificaciones, n sin leer».

**Notificaciones.** Al tocar una se abre la pantalla de su referencia pasándole el id (`src/pantallas/compartidas/notificaciones/destino.ts`, tabla de notificaciones del contrato): postulación → CAN-06 (candidato) o REC-05 (reclutador), entrevista → REC-06, empresa → REC-01, vacante → REC-02 o CAN-02. REC-06 y CAN-06 **resaltan lo que cambió** con un borde y el texto «Desde tu notificación», se desplazan hasta ahí y llevan el foco del lector de pantalla:

- REC-06 acepta `entrevista_id` u `horario_id`; si el horario ya no está en la agenda (se canceló o queda más allá de los días mostrados) avisa «No encontramos ese horario…» en lugar de resaltar otra cosa.
- CAN-06 recibe el tipo de la notificación (`desde`): un recordatorio de entrevista resalta «Tu entrevista»; una entrevista cancelada, «Elige un horario»; cualquier otro aviso (por ejemplo, «Tu postulación avanzó»), el último paso del historial.

## Recorrido para la demostración

Dura unos 10 minutos con las cuentas del mock (todas con `Inclutec2026`). **Antes de grabar, cierra Expo Go por completo y ábrelo otra vez**: así los datos vuelven a su estado inicial y las fechas se recalculan a hoy. Activa el modo «No molestar» y deja la letra del sistema en su tamaño normal.

### Parte 1 · Candidata (`mariana.lopez@correo.mx`)

1. **MOV-01.** Inicia sesión. La pestaña Notificaciones dice «1 sin leer».
2. **CAN-01 Vacantes.** «Técnico de soporte de TI» con **88 %** y «Ya te postulaste». Escribe «soporte» en el buscador y quita la búsqueda; abre **Filtros**, elige «Remoto» y aplica; toca **Limpiar**. Activa el chip «Solo las que cubren mis necesidades» (quedan las vacantes 1 y 2) y desactívalo.
3. **CAN-02 Detalle.** Abre «Auxiliar de almacén»: el desglose dice en palabras qué cumple y qué no, y la accesibilidad va en dos grupos («El lugar cuenta con» y «La empresa puede ofrecer bajo solicitud»). Toca **Postularme**, elige compartir tus necesidades, confirma y el botón cambia a «Ver mi postulación».
4. **CAN-05 Postulaciones.** «Activas» muestra «Técnico de soporte de TI» en **Entrevista** con la fecha y la hora; abre «Finalizadas» para ver Aceptada, No seleccionada y Retirada.
5. **CAN-06 Detalle de postulación.** Historial en línea de tiempo con el mensaje del reclutador, «Estado actual» y **Tu entrevista** con **Abrir liga** y **Copiar liga**. Toca **Cancelar entrevista** (faltan 3 días, se puede), confirma y aparece **Elige un horario** con los días agrupados. Toca **Agendar** en un horario, confirma y la tarjeta de la entrevista regresa con la liga nueva.
6. **CAN-03 Perfil.** «Tu perfil está al 90 % · Falta: foto». Expande **Necesidades de ajuste** (casillas por categoría y las tres opciones para compartir; sin diagnósticos) y **Preferencias laborales**. **Cambiar foto › Elegir de la galería** lleva el perfil a 100 %.
7. **CAN-04 Mi CV.** Pestañas Experiencia, Formación y Habilidades; **+ Agregar** una habilidad (el contador dice «n de 30») y **Vista previa de mi CV** (sin correo ni teléfono).
8. **CAN-07 Empresas.** ConCentro, LogiBajío y TecnoQro (no Estudio Trazo, que está pendiente). Abre TecnoQro: prácticas de inclusión, vacantes con la compatibilidad de Mariana y **⋮ › Reportar empresa**.
9. **MOV-04 Notificaciones.** Toca «Tu postulación avanzó»: se abre CAN-06 con el último paso del historial resaltado («Desde tu notificación»). Cierra sesión desde Perfil.

### Parte 2 · Reclutadora (`rh@tecnoqro.mx`)

1. **Notificaciones.** Dice «1 sin leer» («Nueva entrevista»). Tócala: **REC-06 Agenda** se desplaza al horario de Mariana y lo marca («Desde tu notificación»). Se ve su entrevista con **Abrir liga**, **Copiar liga**, **Marcar como realizada** y **No asistió** deshabilitados con su explicación (todavía no empieza), y **Cancelar**.
2. **REC-02 Mis vacantes.** «Técnico de soporte de TI», «Desarrollador web junior» y «Diseñador gráfico» (borrador), cada una con «n postulados · m nuevos». Filtra por estado con los chips y abre **⋮** de una vacante (el menú solo ofrece lo que permite su estado).
3. **REC-04 Postulados.** Toca «Técnico de soporte de TI»: **28 postulados** ordenados por compatibilidad laboral (que solo considera habilidades, formación y modalidad). Filtra por «En revisión» y por «70 % o más»; **Quitar filtros**. Desplázate hasta el final: carga la segunda página.
4. **REC-05 Detalle del postulado.** Abre a **Mariana** (83 %: desglose con ✓ y ✕, CV, necesidades «Ya cubierto por la vacante», contacto con **Escribir** y **Llamar**, entrevista). Abre a **Carlos Mendoza** («El candidato no compartió esta información.») y a **Fernando Silva** (necesidades «Por confirmar con la empresa»). En Carlos toca **Cambiar estado**: solo ofrece los pasos permitidos; elige «En revisión», escribe un mensaje y guarda. Agrega una **observación interna**.
5. **REC-06 Agenda.** **+ Publicar horarios**: elige la vacante, día, hora, duración y la liga de Meet o Teams; marca «Repetir en los siguientes días hábiles» para publicar varios. Los nuevos horarios aparecen libres para los candidatos.
6. **REC-03 Nueva vacante.** **+ Nueva vacante**: «Paso 1 de 4» (se anuncia), requisitos obligatorios y deseables, modalidad en tarjetas y, en el paso 4, los dos bloques de accesibilidad; **Guardar borrador** y **Publicar** (pide confirmar).
7. **REC-01 Organización.** Banner verde «Empresa validada»; razón social y RFC bloqueados. Cierra sesión.

### Parte 3 · Empresa pendiente (`contacto@estudiotrazo.mx`)

Entra a **Organización** con el banner «Estamos revisando tu empresa. Puedes crear borradores, pero no publicar.»; **Subir constancia (PDF)** está disponible, y en REC-03 **Publicar** está deshabilitado con su explicación mientras **Guardar borrador** funciona. Para ver el banner rojo y subir constancia, usa `rechazada@constructorarivera.mx`; para el de suspendida, `suspendida@academiaalameda.mx`.

## Arquitectura

### Estructura de carpetas

```
mobile/
├── App.tsx                 Proveedores (sesión, navegación) y punto de entrada
├── jest.setup.ts           Configuración común de las pruebas
└── src/
    ├── api/                Cliente HTTP, tipos, errores y servicios
    │   ├── esquema.d.ts    Generado del openapi.yaml (no editar)
    │   ├── tipos.ts        Nombres de los tipos del contrato
    │   ├── errores.ts      ApiError
    │   ├── cliente.ts      Cliente Axios
    │   ├── auth.ts · catalogos.ts · notificaciones.ts · vacantes.ts · postulaciones.ts · horarios.ts · entrevistas.ts · empresas.ts · reportes.ts · candidatos.ts   Interfaz + implementación HTTP
    │   ├── servicios.ts    Elige HTTP o mock según EXPO_PUBLIC_USE_MOCK
    │   ├── index.ts        Lo único que importan las pantallas
    │   ├── useCatalogo.ts  Hook para cargar catálogos (con caché en memoria)
    │   └── mock/           Datos simulados (S002), motor de compatibilidad y simulador de respuestas
    ├── componentes/        Componentes base accesibles (Boton, CampoTexto, Selector, Casilla, …)
    ├── contenido/          Textos largos, como el aviso de privacidad
    ├── navegacion/         Navegador raíz, barras inferiores por rol y contador de no leídas
    ├── pantallas/
    │   ├── compartidas/    MOV-00 a MOV-04
    │   ├── candidato/      CAN-01 a CAN-07 (con subcarpetas vacantes/, detalle/, perfil/, cv/, postulaciones/ y empresas/)
    │   └── reclutador/     REC-01 a REC-06 (con subcarpetas organizacion/, vacantes/, vacante/, postulados/, postulado/ y agenda/)
    ├── pruebas/            Auditoría de accesibilidad que usan las pruebas (no se empaqueta en la app)
    ├── sesion/             Contexto de sesión y token en expo-secure-store
    ├── tema/               Colores, tipografía y espaciado
    └── utilidades/         Fechas, formatos, validaciones, useCarga y lista paginada (useListaPaginada)
```

Las pruebas viven junto al código, en carpetas `__tests__/`.

### Capa de servicios y mock

Servicios: `auth`, `catalogos`, `notificaciones`, `vacantes`, `postulaciones`, `horarios`, `entrevistas`, `empresas`, `reportes` y `candidatos`.

```ts
import { auth, ApiError } from '../../api';

const sesion = await auth.login({ correo, contrasena });
```

El mock guarda su estado en memoria (`src/api/mock/datos.ts`), valida igual que el contrato (códigos 401, 403, 404, 409, 410, 422, 423, 429 con `campos` y `Retry-After`) y copia las respuestas para que nadie modifique el estado sin pasar por un servicio. `simulador.ts` aplica la latencia (en las pruebas es 0).

### Motor de compatibilidad

`src/api/mock/compatibilidad.ts` implementa las reglas de `docs/CONTEXTO.md` y de `db/pruebas/P002__compatibilidad.sql`: H (habilidades: obligatorias valen el doble), A (necesidades de ajuste cubiertas, 1 si no registró ninguna), M (modalidad) y F (formación). Para el candidato `round(100·(0.40H + 0.30A + 0.15M + 0.15F))` y para el reclutador `round(100·(0.40H + 0.15M + 0.15F)/0.70)`, sin A, para no penalizar a quien tiene más necesidades. Es una función pura; su prueba reproduce las 12 filas de S002 (Mariana con «Técnico de soporte de TI»: **88 %** y **83 %**). Cuando una vacante cambia (REC-03), el mock recalcula las compatibilidades y avisa a los postulados con proceso en curso.

### Navegación

`RaizNavegador` elige qué se ve según la sesión: splash, acceso sin sesión (MOV-01 a MOV-03) o el navegador del rol (`CandidatoTabs` o `ReclutadorTabs` más sus pantallas de detalle apiladas). `NoLeidasContext` mantiene el contador de la pestaña de notificaciones y se reinicia al cambiar de usuario. Un registro nuevo aterriza en Perfil (candidato) u Organización (reclutador). `src/navegacion/tipos.ts` declara todos los parámetros de ruta.

### Componentes

Todos están en `src/componentes/` y se importan de `componentes/index.ts`:

| Familia         | Componentes                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto y botones | `Texto` (respeta el tamaño de letra hasta el 200 %), `Boton` (primario, secundario, peligro y texto), `Pantalla`                                                 |
| Campos          | `CampoTexto`, `CampoCodigo`, `Casilla`, `Interruptor`, `GrupoRadio`, `Selector`, `SelectorUbicacion`, `SelectorMesAnio`, `BuscadorHabilidades`, `FiltroEstado`   |
| Estados         | `Cargando`, `EstadoVacio`, `EstadoError` (con «Reintentar»), `ErrorCatalogo` (una lista de un formulario no cargó), `Aviso`, `ChipEstado` (texto, ícono y color) |
| Contenedores    | `Tarjeta`, `SeccionDesplegable`, `BarraProgreso`, `Avatar`, `LogoEmpresa`, `Logotipo`, `ResaltadoNotificacion`                                                   |
| Ventanas        | `VentanaModal`, `ModalFormulario`, `ModalConfirmacion`, `EncabezadoModal`                                                                                        |
| Foco            | `useFocoEnTitulo`, `useRetornoFoco` (devuelve el foco al botón que abrió un modal) y `useMarcaDeNotificacion`                                                    |

Utilidades comunes: `fechas.ts` (todas las fechas y horas en hora de la Ciudad de México, también «habladas» para el lector de pantalla), `formatos.ts` (porcentajes «88 %» / «88 por ciento», duraciones «45 min» / «45 minutos» y `capitalizar`), `validaciones.ts`, `useCarga` y `useListaPaginada`. **Regla:** ninguna pantalla formatea fechas, porcentajes o duraciones por su cuenta.

### Estados de carga, error y vacío

Toda pantalla que pide datos muestra `Cargando` mientras espera, `EstadoError` con el botón **Reintentar** si falla (el mismo texto en todas) y `EstadoVacio` con una acción cuando no hay nada («Quitar filtros», «Ver vacantes», «Crear vacante»…). Las listas paginadas añaden «Cargando más…» y, si falla la siguiente página, un aviso con **Reintentar**. Los selectores que dependen de un catálogo (entidad, sector, modalidad, ajustes…) muestran `ErrorCatalogo` si la lista no cargó.

## Accesibilidad

WCAG 2.1 AA (`docs/CONTEXTO.md`, sección 6): contraste de 4.5:1 (una prueba lo comprueba con la paleta), áreas táctiles de al menos 44 pt (la app usa 48), texto que respeta el tamaño de letra del sistema hasta el 200 %, `accessibilityLabel`, `accessibilityRole` y `accessibilityState` en todo lo interactivo, estados con texto e ícono (nunca solo color) y errores anunciados con `AccessibilityInfo.announceForAccessibility`.

**Qué revisan las pruebas** (`src/pruebas/auditoria.ts`, que usan `src/navegacion/__tests__/accesibilidadPantallas.test.tsx` y `src/componentes/__tests__/escalaDeTexto.test.tsx`):

- Recorren las pantallas del candidato y del reclutador con el mock (pestañas, detalles, modales, los cuatro pasos de REC-03) y revisan el árbol que leerían VoiceOver y TalkBack. Un hallazgo nuevo hace fallar la prueba y dice la pantalla y el elemento.
- **Todo lo tocable** tiene rol, nombre y un área de al menos 44 pt; las pestañas dicen si están seleccionadas y las casillas, interruptores y radios, si están marcados.
- **Los íconos** son decorativos: están ocultos para el lector de pantalla o forman parte de un elemento agrupado con nombre. Las imágenes (logotipos, fotos) se ocultan salvo que describan algo.
- **El texto escala:** ningún `Text` apaga `allowFontScaling` ni limita `maxFontSizeMultiplier` por debajo de 2, y ninguna caja con texto tiene alto fijo que lo corte. Para `Texto`, `Boton`, `CampoTexto`, `Tarjeta`, `ChipEstado`, `Aviso` y `Casilla` se calcula el tamaño con el sistema al 200 %. Las únicas excepciones son las iniciales decorativas de `Avatar` y `LogoEmpresa` (dentro de un círculo fijo y ocultas al lector de pantalla).
- **Nada se comunica solo con color:** cada estado (`ChipEstado`), cada línea del desglose de compatibilidad y cada error llevan texto e ícono.

**Lo que las pruebas no pueden decir** es cómo suena ni si el orden de lectura es cómodo: eso se revisa en el teléfono con la lista de abajo.

**Patrones que conviene reutilizar:** `SeccionDesplegable` (botón con estado expandido o contraído; el contenido sigue montado para no perder lo escrito), `ModalFormulario` (título al que va el foco, contenido con scroll y botón fijo dentro del área segura), `useRetornoFoco`, `BarraProgreso` (barra con valor dicho en voz alta, por ejemplo «90 por ciento»), `SelectorMesAnio` (fecha de mes y año con listas accesibles, sin el selector nativo), `BuscadorHabilidades`, `SelectorUbicacion`, `FiltroEstado` (opciones excluyentes con palomita), `ModalContrasena` y `CvCandidato` (el CV como lo ve una empresa, compartido entre la vista previa de Mi CV y REC-05; en `pantallas/compartidas/`) y `ResaltadoNotificacion` + `useMarcaDeNotificacion` (resaltar lo que cambió).

## Lista de verificación con VoiceOver y TalkBack

Para seguirla en el teléfono, con Expo Go y el mock. Marca solo lo que se oyó bien; si algo falla, anota la pantalla y el elemento.

**Preparación**

- **iPhone:** Ajustes › Accesibilidad › VoiceOver (o triple clic del botón lateral). Deslizar a la derecha o izquierda cambia de elemento; doble toque activa.
- **Android:** Ajustes › Accesibilidad › TalkBack (o mantener los dos botones de volumen). Mismos gestos.
- **Letra al 200 %:** en iPhone, Ajustes › Accesibilidad › Pantalla y tamaño de texto › Texto más grande › Tamaños de accesibilidad mayores (máximo). En Android, Ajustes › Pantalla › Tamaño de fuente y de pantalla (máximo).
- Cierra y abre Expo Go para partir de los datos iniciales. Cuentas: Mariana (candidata), Laura (reclutadora) y Daniel (empresa pendiente).

**Siempre, en cada pantalla**

- [ ] Lo primero que se lee es el título o el encabezado de la pantalla.
- [ ] El orden de lectura va de arriba abajo, igual que lo visual (no salta a un botón fijo ni a otro bloque).
- [ ] Cada botón dice qué hace («Guardar», «Postularme»), no «botón» ni el nombre del ícono; los deshabilitados lo dicen.
- [ ] Los estados se dicen con palabras («Entrevista», «Publicada», «Retirada»), no solo por color.
- [ ] Con la letra al 200 % no se corta ningún texto y se puede llegar a todos los botones (se desplaza).

**Por pantalla**

| Pantalla                      | Cuenta     | Qué comprobar                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MOV-01 Inicio de sesión       | Sin sesión | Se leen «Correo» y «Contraseña» como campos de texto; con una contraseña incorrecta el error se anuncia solo; «Mostrar contraseña» dice su estado.                                                                                                                                              |
| MOV-02 Registro               | Sin sesión | Al cambiar de paso se anuncia «Paso 2 de 3»; las dos tarjetas del paso 1 se leen como botones con su descripción; la casilla del aviso dice si está marcada; cada error se lee debajo del campo.                                                                                                |
| MOV-03 Recuperar contraseña   | Sin sesión | «Paso 1 de 2»; el campo del código se lee como «Código de 6 dígitos»; el reenvío explica cuánto falta para poder usarlo.                                                                                                                                                                        |
| MOV-04 Notificaciones         | Mariana    | La pestaña dice «Notificaciones, 1 sin leer»; cada notificación es un solo elemento («Nueva. Tu postulación avanzó…»); «Marcar todas como leídas» anuncia el resultado; en Preferencias los interruptores dicen activado o desactivado.                                                         |
| CAN-01 Vacantes               | Mariana    | Cada tarjeta se lee completa («Técnico de soporte de TI, TecnoQro, empresa validada, híbrido… compatibilidad 88 por ciento… Ya te postulaste»); «Filtros, ninguno activo»; el chip «Solo las que cubren mis necesidades» es una casilla; en Jorge dice por qué está deshabilitado.              |
| CAN-02 Detalle de vacante     | Mariana    | El encabezado dice «Compatibilidad 88 por ciento»; cada línea del desglose se lee con palabras («Habilidades: 2 de 3 obligatorias · te falta SQL»); la accesibilidad se lee en sus dos grupos; «Postularme» abre un modal cuyo título es lo primero que se oye; «Más opciones» abre el reporte. |
| CAN-03 Mi perfil              | Mariana    | La barra dice «Completitud del perfil, 90 por ciento»; cada sección es un botón «expandida» o «contraída»; al guardar se anuncia «Datos personales guardados»; las tres opciones para compartir necesidades son radios con su estado.                                                           |
| CAN-04 Mi CV                  | Mariana    | Las pestañas dicen «seleccionada»; «Agregar» abre un modal con su título; el selector de mes y año se maneja con listas; el contador de habilidades dice «n de 30».                                                                                                                             |
| CAN-05 Mis postulaciones      | Mariana    | «Activas (1)» y «Finalizadas (3)» son pestañas; cada tarjeta se lee completa con su estado y la fecha de la entrevista.                                                                                                                                                                         |
| CAN-06 Detalle de postulación | Mariana    | El historial es una lista; el último paso dice «Estado actual»; «Agendar» dice fecha, hora y duración; al cancelar, el foco vuelve a «Elige un horario»; **desde la notificación** se oye primero «Desde tu notificación».                                                                      |
| CAN-07 Empresas               | Mariana    | Cada empresa es un elemento con sector y número de vacantes; en la ficha, «Sitio web» y «Prácticas de inclusión» se leen; «Reportar empresa» está en el menú.                                                                                                                                   |
| REC-01 Organización           | Daniel     | Al abrir se anuncia el banner («Estamos revisando tu empresa…»); razón social y RFC dicen que no se pueden editar; «Subir constancia (PDF)» se lee como botón.                                                                                                                                  |
| REC-02 Mis vacantes           | Laura      | Cada tarjeta es un elemento con título, modalidad, estado y «n postulados, m nuevos»; «Más opciones de…» es un botón aparte; el menú solo ofrece acciones permitidas.                                                                                                                           |
| REC-03 Vacante                | Laura      | «Paso n de 4» se anuncia al cambiar; las tarjetas de modalidad son radios; cada habilidad dice «obligatoria» o «deseable»; «Publicar» deshabilitado explica por qué (Daniel); al salir con cambios pide confirmar.                                                                              |
| REC-04 Postulados             | Laura      | «28 postulados»; cada tarjeta dice nombre, compatibilidad, estado y fecha (y «Ajustes por confirmar» si aplica); al filtrar se anuncia «Mostrando n postulados…».                                                                                                                               |
| REC-05 Detalle del postulado  | Laura      | El desglose se lee en palabras; las necesidades dicen «Ya cubierto» o «Por confirmar con la empresa»; «Cambiar estado» solo ofrece pasos permitidos; «Escribir» y «Llamar» son botones.                                                                                                         |
| REC-06 Agenda                 | Laura      | Cada día es un encabezado con la fecha completa («jueves 5 de noviembre de 2026»); cada horario se lee con hora, duración, vacante y candidato; «Marcar como realizada» deshabilitado dice desde cuándo; **desde la notificación** se oye «Desde tu notificación» antes del horario.            |

## Qué falta probar en dispositivo

Todo lo de arriba son pruebas automáticas sobre el árbol de accesibilidad; **falta oírlo en un teléfono**:

- **TalkBack en Android nunca se ha probado.** Hay que recorrer la lista completa en un dispositivo Android (con Expo Go) y revisar el foco, los anuncios y el comportamiento de los modales.
- **VoiceOver en iPhone:** falta un recorrido completo con la lista de arriba (no hay registro de uno).
- **Letra al 200 % en teléfono real:** la barra inferior (sin alto fijo, pero sin ver en un aparato), las tarjetas con mucho texto, los chips de estado y los modales. En iPhone, React Navigation no escala las etiquetas de las pestañas (usa el visor de contenido grande de iOS); en Android sí.
- **Foco al abrir desde una notificación** (`AccessibilityInfo.setAccessibilityFocus` tras el desplazamiento, 600 ms): se comprueba que se pide el foco, no que el lector lo respete en cada versión del sistema.
- **Notificaciones push** reales (necesitan una _development build_), **cámara** y **galería** con los permisos reales, y **abrir la liga** de Meet o Teams.
- **Orientación horizontal** (`app.json` la permite) y **tabletas** (`supportsTablet`): no se han revisado.
- **API real:** nada se ha probado contra el API (aún no existe); con `EXPO_PUBLIC_USE_MOCK=false` los servicios HTTP solo tienen pruebas con respuestas del contrato.

## Calidad

| Comando                          | Qué hace                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `npm start`                      | Servidor de Expo.                                                            |
| `npm run lint`                   | ESLint (con reglas de Expo y Prettier).                                      |
| `npx tsc --noEmit`               | Revisión de tipos.                                                           |
| `npm test`                       | Pruebas con Jest y Testing Library (la suite completa tarda unos 2 minutos). |
| `npx expo install --check`       | Compara las dependencias con las que pide el SDK 57.                         |
| `npx expo export --platform ios` | Empaqueta la app para iOS: comprueba que el bundle se arma.                  |
| `npm run format`                 | Da formato con Prettier.                                                     |
| `npm run tipos`                  | Regenera `src/api/esquema.d.ts` desde `../docs/api/openapi.yaml`.            |

Las pruebas cubren los servicios (mock y HTTP), cada pantalla, los componentes base, la sesión, la navegación por rol, el motor de compatibilidad contra las filas de S002, los datos de la demostración (`demostracion.test.ts`) y la accesibilidad.

## Dependencias y auditoría

`npx expo install --check` dice «Dependencies are up to date».

`npm audit` en `mobile/` reporta **18 hallazgos (3 altos, 2 moderados y 13 bajos; ninguno crítico)**. Ninguno es del código de la app: salen de tres paquetes que llegan de forma indirecta, y el resto del conteo son paquetes que solo los arrastran.

| Paquete con el aviso | Aviso                                                              | Severidad | Instalado | Versión corregida                      | Quién lo trae                                      |
| -------------------- | ------------------------------------------------------------------ | --------- | --------- | -------------------------------------- | -------------------------------------------------- |
| `zod`                | GHSA-mrhx-c7xc-m3w5 (memoria con colecciones enormes al validar)   | Alta      | 3.25.76   | 4.6.6 (otra versión mayor)             | `eslint-plugin-react-hooks` (ESLint) y `@expo/cli` |
| `uuid`               | GHSA-w5hq-g745-h8pq (límites del búfer en v3, v5 y v6)             | Moderada  | 3.4.0     | 11.1.1 o superior (otra versión mayor) | `@expo/ngrok` (el túnel de `expo start --tunnel`)  |
| `deepmerge`          | GHSA-gcqx-w48m-w2h4 (contaminación de prototipos en `mergeObject`) | Baja      | 4.3.1     | ninguna publicada en la rama 4         | `@expo/config` (Expo) y `jest-config` (Jest)       |

**Por qué no afectan la app instalada.** Son herramientas de desarrollo (ESLint, la CLI de Expo, Jest, el túnel) que corren en la computadora de quien programa; no se empaquetan en la app. Se comprobó con el mapa de fuentes de `npx expo export --platform ios --source-maps`: ni `zod` ni `deepmerge` ni el paquete `uuid` están en el bundle (solo entra el `uuid` propio de `expo-modules-core`).

**Overrides: no hay ninguno, a propósito.** Un `overrides` solo sirve si existe una versión corregida dentro de la misma versión mayor que pide el dependiente. Para `zod` y `uuid` la corrección está en otra versión mayor que sus dependientes no piden, y para `deepmerge` no hay corrección; forzarlas puede romper `@expo/cli` o `@expo/ngrok` sin tener cómo probarlo. **`npm audit fix` (sin `--force`)** no elimina ningún hallazgo. Los hallazgos se corregirán cuando los paquetes de arriba publiquen una versión corregida y Expo, ESLint o Jest la adopten; conviene correr `npm audit` en cada subida de SDK.

**`@expo/ngrok`** se conserva porque este README documenta `npx expo start --tunnel`; es lo que trae `uuid` 3.4.0. Si alguien deja de usar el túnel, se puede quitar de `devDependencies`.

**Regla: nunca uses `npm audit fix --force`.** Propone bajar `expo` a 51 y destruye el proyecto. Si ya lo corriste, restaura con `git checkout package.json package-lock.json && npm ci`. Después de tocar dependencias, `npx expo install --check` debe decir «Dependencies are up to date».

## Decisiones importantes

- **Una sola app para dos roles.** La navegación cambia según el rol del token; el administrador usa el panel web (la app se lo indica y cierra su sesión).
- **Necesidades de ajuste, nunca diagnósticos.** El candidato elige necesidades del catálogo `ajuste` con consentimiento expreso y decide si las comparte con cada empresa (`preguntar`, `siempre`, `nunca`). La compatibilidad del reclutador **no** incluye las necesidades (`/0.70`), para no penalizar a quien tiene más; REC-04 solo marca «Ajustes por confirmar».
- **Servicios intercambiables.** Las pantallas solo conocen la interfaz; mock y HTTP responden igual. El mock vive en memoria a propósito: así cada grabación parte de cero.
- **Fechas relativas a hoy** (`fechasS002.ts`): las de S002 se mueven juntas para que la demostración se vea igual cualquier día, sin cambiar textos ni estados; los datos extra (entrevistas, horarios, postulados) ya eran relativos.
- **Una notificación lleva al elemento que cambió.** REC-06 y CAN-06 lo resaltan con borde y el texto «Desde tu notificación» (no solo color), se desplazan hasta él y piden el foco del lector. Si el elemento ya no existe, se avisa.
- **Texto que crece y cajas que no lo cortan.** Nada de alto fijo con texto adentro; la barra inferior no tiene alto fijo y la insignia de «sin leer» es propia (la de React Navigation tiene alto fijo y cortaría el número al 200 %). Las iniciales decorativas de avatares y logos no se escalan.
- **Los mismos textos para lo mismo:** «Reintentar» (error), «Quitar filtros» (lista sin resultados por filtros), «Liga copiada.» y los formatos de fecha, hora, porcentaje y duración salen de utilidades comunes.
- **Sin push en Expo Go.** El registro del dispositivo se omite ahí; se prueba en una _development build_.
- **Sin `overrides` en las dependencias** (ver arriba) y sin `npm audit fix --force`.
