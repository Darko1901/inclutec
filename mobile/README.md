# App móvil de IncluTec

App de **candidatos** y **reclutadores** hecha con React Native + Expo (TypeScript estricto) y React Navigation. Es una sola app: la navegación cambia según el rol. El administrador usa el panel web (`web/`).

Hasta que el API exista (sprint 4), la app corre con **datos simulados** que responden igual que el contrato (`docs/api/contrato.md`).

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

## Variables de entorno

Se leen del archivo `.env` (no se sube a git; la plantilla es `.env.example`). Después de cambiarlas, reinicia con `npx expo start -c`.

| Variable               | Por omisión                    | Para qué sirve                                                                                                                                         |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_USE_MOCK` | `true`                         | `true` usa los datos simulados; `false` llama al API real.                                                                                             |
| `EXPO_PUBLIC_API_URL`  | `http://localhost:8000/api/v1` | URL base del API. En un teléfono físico `localhost` es el propio teléfono: usa la IP de tu computadora, por ejemplo `http://192.168.1.20:8000/api/v1`. |

## Cuentas de prueba

Son las de `db/semillas/S002__datos_prueba.sql`. La contraseña de todas es **Inclutec2026**.

| Correo                              | Rol                                       | Qué ocurre al entrar                                                                                                                        |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| mariana.lopez@correo.mx             | Candidata                                 | Llega a Vacantes; la pestaña Notificaciones dice «1 sin leer».                                                                              |
| jorge.ramirez@correo.mx             | Candidato                                 | Llega a Vacantes; sin notificaciones.                                                                                                       |
| rh@tecnoqro.mx                      | Reclutadora (Laura, TecnoQro)             | Llega a Mis vacantes; Notificaciones dice «1 sin leer».                                                                                     |
| rh@logibajio.mx                     | Reclutador (Roberto, LogiBajío)           | Llega a Mis vacantes; Notificaciones dice «1 sin leer» (la postulación de Jorge).                                                           |
| talento@concentro.mx                | Reclutadora (Patricia, ConCentro)         | Llega a Mis vacantes; sin notificaciones.                                                                                                   |
| contacto@estudiotrazo.mx            | Reclutador (Daniel, Estudio Trazo)        | Llega a Organización; su empresa está **pendiente** de validar (solo puede crear borradores).                                               |
| admin@inclutec.mx                   | Administrador                             | Muestra «El administrador usa el panel web» y no inicia sesión.                                                                             |
| **suspendida@correo.mx**            | Candidata suspendida                      | Responde 423: «Tu cuenta está suspendida.»                                                                                                  |
| **notificaciones@correo.mx**        | Candidata (Lucía)                         | Llega a Vacantes; tiene 45 notificaciones (5 sin leer) para probar el desplazamiento infinito y «Marcar todas como leídas».                 |
| **rechazada@constructorarivera.mx** | Reclutador (Ernesto, Constructora Rivera) | Llega a Mis vacantes; su empresa está **rechazada** (con motivo): sirve para ver el banner rojo y subir la constancia (pasa a «pendiente»). |
| **suspendida@academiaalameda.mx**   | Reclutadora (Gabriela, Academia Alameda)  | Llega a Mis vacantes; su empresa está **suspendida** (con motivo) y no puede subir constancia (409).                                        |

Las cuentas `suspendida@correo.mx`, `notificaciones@correo.mx`, `rechazada@constructorarivera.mx` y `suspendida@academiaalameda.mx` **existen solo en el mock** (no están en la base de datos de prueba). Sus ids son **100 a 103** (los de S002 van del 1 al 7) para que nunca choquen con la base de datos; las dos de reclutador tienen además las empresas 100 (Constructora Rivera, rechazada) y 101 (Academia Alameda, suspendida). Las cuentas que se registren en la app reciben ids desde el 104. Jorge no tiene notificaciones: sirve para ver el estado vacío. Las notificaciones extra del mock tienen id 90 en adelante (la de Roberto, id 3, sí es de S002).

Las dos cuentas solo del mock tienen el perfil vacío (sin habilidades ni formación), así que sirven para probar que «Postularme» se bloquea cuando el perfil está incompleto. Igual pasa con cualquier cuenta que se registre en la app.

### Datos de prueba de vacantes

Los datos simulados de negocio son los de S002: 4 empresas (TecnoQro, LogiBajío y ConCentro validadas; Estudio Trazo pendiente), 8 vacantes (6 publicadas y 2 borradores), la postulación de Mariana a la vacante 1 (en «Entrevista»), la de Jorge a la 3 y el reporte 1 de la vacante 5. La compatibilidad no se lee de una tabla: la calcula el motor de `src/api/mock/compatibilidad.ts` con las reglas del contrato, y su prueba comprueba que reproduce las 12 filas guardadas en S002.

| Vacante | Empresa   | Modalidad  | Para probar                                                               |
| ------- | --------- | ---------- | ------------------------------------------------------------------------- |
| 1       | TecnoQro  | Híbrido    | Mariana: 88 %, ya postulada («Ver mi postulación»); Jorge: 57 %           |
| 2       | LogiBajío | Presencial | Cubre las necesidades de Mariana; ofrece intérprete de LSM bajo solicitud |
| 3       | LogiBajío | Híbrido    | Jorge ya se postuló (79 %)                                                |
| 4       | ConCentro | Remoto     | No muestra salario                                                        |
| 5       | ConCentro | Presencial | Declara que el lugar **no** cuenta con condiciones de accesibilidad       |
| 6       | TecnoQro  | Remoto     | Con intérprete de LSM bajo solicitud                                      |
| 7 y 8   | —         | —          | Borradores: nunca aparecen en la lista del candidato                      |

### Datos de prueba de postulaciones, entrevistas y empresas

Además de los de S002, el mock agrega (ids desde 100) lo necesario para probar CAN-05 a CAN-07. Todas las fechas son relativas a la hora en que abres la app.

| Dato                                              | Cuenta  | Para probar                                                                                                                                                                                                                              |
| ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postulación 1 (S002), vacante 1, «Entrevista»     | Mariana | Entrevista agendada dentro de 3 días (45 min, Google Meet): se puede cancelar. Al cancelarla, «Elige un horario» y volver a agendar.                                                                                                     |
| Postulación 101, vacante 6, «Aceptada»            | Mariana | Historial con mensaje de felicitación y una entrevista ya «Realizada» (sin liga ni botones).                                                                                                                                             |
| Postulación 102, vacante 3, «No seleccionada»     | Mariana | Historial con el mensaje «Por ahora avanzamos con otros perfiles…».                                                                                                                                                                      |
| Postulación 103, vacante 4, «Retirada»            | Mariana | Estado «Retirada» y sin botón de retirar.                                                                                                                                                                                                |
| Postulación 100, vacante 6, «Entrevista»          | Jorge   | Entrevista que empieza en 5 horas (Teams): **no se puede cancelar** y la pantalla explica por qué.                                                                                                                                       |
| Horarios libres de la vacante 1 (ids 2 y 100–104) | Mariana | Dentro de 3, 27, 30, 73 (el horario 2 de S002), 120 y 121 horas, agrupados por día («Hoy» o «Mañana» según la hora a la que abras la app). El de 30 h y 60 min (id 102) **lo toma otro candidato** justo cuando intentas agendarlo: 409. |

Las vacantes 2 y 5 se dejaron libres a propósito (Mariana puede postularse a ellas). Un retiro **sin** entrevista agendada no genera notificación porque el contrato no define ninguna; con entrevista, el reclutador recibe «Entrevista cancelada».

El directorio de empresas solo muestra las validadas (ConCentro, LogiBajío y TecnoQro); **Estudio Trazo** (pendiente) no aparece ni tiene ficha. Cada empresa trae el sector, tamaño, descripción y prácticas de inclusión de S002; el sitio web de TecnoQro es el del ejemplo del contrato, el de LogiBajío se agregó solo en el mock y ConCentro no tiene (para ver la ficha sin enlace).

Otras pruebas con el mock:

- **429:** escribe una contraseña incorrecta 5 veces con el mismo correo; el siguiente intento, aunque sea correcto, responde «Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.» (el bloqueo dura mientras la app esté abierta).
- **Código de recuperación de contraseña:** en el mock el código válido es siempre **`123456`** (vence a los 15 minutos; después de 5 intentos incorrectos responde 410; el reenvío solo se permite 60 s después del envío anterior). No llega ningún correo.
- **Registro:** en el mock, `mariana.lopez@correo.mx` (o cualquier correo de la tabla de arriba) responde «correo ya registrado» y el RFC `TQU150312AB1` responde «RFC ya registrado». Cualquier otro dato válido crea la cuenta (el candidato llega a Perfil y el reclutador a Organización; su empresa queda «pendiente»).
- **Notificaciones push:** el registro del dispositivo (`POST /dispositivos`) se omite en Expo Go, porque ahí las push remotas ya no existen (Android desde el SDK 53). Funciona en una _development build_.
- **Habilidades solo del mock:** el catálogo de S001 tiene 15; el mock agrega las de id 16 a 33 (Nómina, Ventas, Almacenamiento…) para poder llegar al límite de 30 de CAN-04.
- Los cambios (registros, notificaciones leídas, contraseñas nuevas, perfil y CV) se guardan **en memoria**: al cerrar la app por completo vuelven los datos originales. La sesión sí se conserva (el token está en `expo-secure-store`).

## Comandos

| Comando            | Qué hace                                                          |
| ------------------ | ----------------------------------------------------------------- |
| `npm start`        | Servidor de Expo.                                                 |
| `npm run lint`     | ESLint (con reglas de Expo y Prettier).                           |
| `npx tsc --noEmit` | Revisión de tipos.                                                |
| `npm test`         | Pruebas con Jest y Testing Library.                               |
| `npm run format`   | Da formato con Prettier.                                          |
| `npm run tipos`    | Regenera `src/api/esquema.d.ts` desde `../docs/api/openapi.yaml`. |

## Dependencias y auditoría

`npm audit` en `mobile/` reporta **60 hallazgos (47 altos y 13 moderados, ninguno crítico)**. Ninguno es del código de la app: todos salen de cuatro paquetes que llegan de forma indirecta, y el resto del conteo son paquetes que solo los arrastran.

| Paquete con el aviso | Aviso                                                        | Severidad | Instalado     | Versión corregida                                      | Quién lo trae                                                |
| -------------------- | ------------------------------------------------------------ | --------- | ------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `braces`             | GHSA-vfj7-8cjw-p6xm (pila agotada con patrones muy anidados) | Alta      | 3.0.3         | ninguna publicada (3.0.3 es la última)                 | `micromatch` → Jest, Metro, `jest-haste-map`                 |
| `node-forge`         | GHSA-86w9-cpqp-85rv (verificación de firmas RSA PKCS#1)      | Alta      | 1.4.0         | ninguna publicada (1.4.0 es la última)                 | `@expo/code-signing-certificates` → `@expo/cli`              |
| `sprintf-js`         | GHSA-hp3w-g68c-fv3c (precisión sin límite)                   | Moderada  | 1.0.3         | ninguna publicada (1.1.3 es la última y también falla) | `argparse` → `js-yaml` 3 → `babel-plugin-istanbul` (Jest)    |
| `uuid`               | GHSA-w5hq-g745-h8pq (límites del búfer en v3, v5 y v6)       | Moderada  | 3.4.0 y 7.0.3 | 11.1.1, 12.0.1 o 13.0.1 (otra versión mayor)           | `@expo/ngrok` (3.x) y `xcode` → `@expo/config-plugins` (7.x) |

**Por qué no afectan la app instalada.** Son herramientas de desarrollo (servidor de Metro, CLI de Expo, Jest, plugins de configuración) que corren en la computadora de quien programa; no se empaquetan en la app. Se comprobó con el mapa de fuentes de `npx expo export --platform ios`: ninguno de estos paquetes está en el bundle (solo entra un `require.js` mínimo de `@expo/cli`, sin `node-forge`).

**Overrides: no hay ninguno, a propósito.** Un `overrides` solo sirve si existe una versión corregida dentro de la misma versión mayor que pide el dependiente. Para `braces`, `node-forge` y `sprintf-js` no existe ninguna versión corregida; para `uuid` la corrección está en la mayor 11 o superior, y sus dependientes piden la 3 y la 7. Forzar otra mayor puede romper `@expo/ngrok` y `xcode` sin tener cómo probarlo.

**`npm audit fix` (sin `--force`)** solo reordena el `package-lock.json` (sube `@expo/cli` al primer nivel) y no elimina ningún hallazgo, así que no se aplica. Los hallazgos se corregirán cuando los paquetes de arriba publiquen una versión corregida y Expo o Jest la adopten; con el SDK 58 siguen los mismos cuatro avisos (se comprobó en un proyecto de prueba aparte), así que subir de SDK no es la solución hoy. Conviene correr `npm audit` en cada subida de SDK.

**`@expo/ngrok`** se conserva porque este README documenta `npx expo start --tunnel`; es lo que trae `uuid` 3.4.0. Si alguien deja de usar el túnel, se puede quitar de `devDependencies`.

**Regla: nunca uses `npm audit fix --force`.** Propone bajar `expo` a 44 y `react-native` a 0.72 (o saltar de mayor en Jest) y destruye el proyecto. Si ya lo corriste, restaura con `git checkout package.json package-lock.json && npm ci`. Después de tocar dependencias, `npx expo install --check` debe decir «Dependencies are up to date».

## Tipos del API

`src/api/esquema.d.ts` se **genera** con `openapi-typescript` a partir de `docs/api/openapi.yaml`; no se edita a mano. Cuando cambie el contrato, corre `npm run tipos` y revisa los errores de TypeScript que aparezcan. `src/api/tipos.ts` solo les pone nombre (`Usuario`, `Sesion`, …).

## Capa de servicios

Las pantallas y los componentes **nunca** importan datos de prueba; solo usan los servicios de `src/api` (`auth`, `catalogos`, `notificaciones`, `vacantes`, `postulaciones`, `horarios`, `entrevistas`, `empresas`, `reportes`, `candidatos`):

```ts
import { auth, ApiError } from '../../api';

const sesion = await auth.login({ correo, contrasena });
```

Cada servicio tiene una interfaz y dos implementaciones, y `src/api/index.ts` elige una según `EXPO_PUBLIC_USE_MOCK`:

- **HTTP** (`auth.ts`, `catalogos.ts`, `notificaciones.ts`, `vacantes.ts`, `postulaciones.ts`, `reportes.ts`, `candidatos.ts`): usa el cliente Axios de `cliente.ts`, que agrega `Authorization: Bearer`, convierte toda respuesta de error en `ApiError { status, codigo, detail, campos }` y, ante un `401 no_autenticado`, avisa a la sesión para que se cierre. Los errores de red y los 5xx se convierten en `error_interno` con el mensaje «El servicio no está disponible; intenta más tarde».
- **Mock** (`api/mock/`): responde con las mismas rutas lógicas, códigos HTTP, `codigo` de error y JSON del contrato, con latencia de 300 a 700 ms. ESLint impide importar `api/mock/` desde `pantallas/`, `componentes/`, `navegacion/` y `sesion/`.

## Estructura de carpetas

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
    ├── pantallas/
    │   ├── compartidas/    MOV-00 a MOV-04
    │   ├── candidato/      CAN-01 a CAN-07 (con subcarpetas vacantes/, detalle/, perfil/, cv/, postulaciones/ y empresas/)
    │   └── reclutador/     REC-01 a REC-06 (con subcarpetas organizacion/, vacantes/ y vacante/)
    ├── navegacion/         Navegador raíz y barras inferiores por rol
    ├── sesion/             Contexto de sesión y token en expo-secure-store
    ├── tema/               Colores, tipografía y espaciado
    └── utilidades/         Formato de fechas, validaciones y lista paginada (useListaPaginada)
```

Las pruebas viven junto al código, en carpetas `__tests__/`.

## Estado de las pantallas

| Pantalla                                                                               | Estado                                                    |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| MOV-00 Splash · MOV-01 Inicio de sesión                                                | Listas                                                    |
| MOV-02 Registro (3 pasos, candidato y reclutador) y el aviso de privacidad completo    | Listas                                                    |
| MOV-03 Recuperar contraseña (correo, código de 6 dígitos y nueva contraseña)           | Lista                                                     |
| MOV-04 Notificaciones (lista paginada, marcar leídas y preferencias)                   | Lista                                                     |
| Barras inferiores de candidato y reclutador (con contador de notificaciones no leídas) | Listas                                                    |
| CAN-01 Vacantes (recomendadas, búsqueda, filtros y «cubre mis necesidades»)            | Lista                                                     |
| CAN-02 Detalle de vacante (desglose, postulación y reporte)                            | Lista                                                     |
| CAN-03 Mi perfil (completitud, foto, datos, preferencias, necesidades y cuenta)        | Lista                                                     |
| CAN-04 Mi CV (experiencia, formación, habilidades y vista previa)                      | Lista                                                     |
| CAN-05 Mis postulaciones (Activas y Finalizadas, filtro por estado)                    | Lista                                                     |
| CAN-06 Detalle de postulación (historial, agendar, cancelar entrevista y retirar)      | Lista                                                     |
| CAN-07 Empresas (directorio y ficha con prácticas de inclusión y reporte)              | Lista                                                     |
| REC-01 Organización (banner de validación, logo, datos, constancia y cuenta)           | Lista                                                     |
| REC-02 Mis vacantes (filtro por estado, menú de acciones, duplicar)                    | Lista                                                     |
| REC-03 Crear o editar vacante (4 pasos, publicar y recálculo de compatibilidad)        | Lista                                                     |
| REC-04 a REC-06                                                                        | Marcador «Pendiente» (se llenan en las siguientes tareas) |

### Cómo probar CAN-01 y CAN-02 en el teléfono

1. Entra como **mariana.lopez@correo.mx**: la lista abre con «Técnico de soporte de TI» (88 %) y su tarjeta dice «Ya te postulaste». Escribe «soporte» en el buscador (busca 400 ms después de dejar de escribir) y queda solo esa vacante.
2. Abre **Filtros**: elige Modalidad «Remoto» y toca «Aplicar» (quedan las vacantes 4 y 6; el botón dice «Filtros (1)»). Con el ajuste «Intérprete de Lengua de Señas Mexicana» quedan la 2 y la 6. «Limpiar» y «Aplicar» regresan a la lista completa.
3. Activa el chip **«Solo las que cubren mis necesidades»**: quedan las vacantes 1 y 2.
4. Entra como **jorge.ramirez@correo.mx** (sin consentimiento): el chip se ve deshabilitado y explica por qué, con acceso a Perfil.
5. Abre una vacante: el detalle muestra el desglose en texto y la accesibilidad en sus dos grupos. «Ejecutivo de atención telefónica» (ConCentro) muestra la declaración de «sin condiciones».
6. Como Mariana, abre «Auxiliar de almacén» y toca **Postularme**: elige Sí o No (su preferencia es «preguntar»), confirma y el botón cambia a «Ver mi postulación».
7. Menú **⋮ › Reportar vacante**: elige un motivo, envía y aparece «Gracias, revisaremos tu reporte».
8. Para ver el bloqueo por perfil incompleto entra como **notificaciones@correo.mx** (perfil vacío): «Postularme» queda deshabilitado y dice qué falta.

Al tocar una notificación se abre la pantalla de su referencia pasándole el id (CAN-06, REC-05, REC-06, REC-01 o REC-02); CAN-06, REC-01 y REC-02 ya son las pantallas reales y REC-05 y REC-06 siguen siendo marcadores que muestran el id recibido.

### Cómo probar CAN-03 y CAN-04 en el teléfono

Todo se guarda en memoria: al cerrar la app por completo vuelven los datos de S002.

1. Entra como **mariana.lopez@correo.mx** y abre **Perfil**. Arriba dice «Tu perfil está al 90 % · Falta: foto» y la barra se anuncia como «Completitud del perfil, 90 por ciento».
2. Toca **Cambiar foto › Elegir de la galería** (o **Tomar una foto**, que pide permiso de cámara con una explicación). Con la foto llega a **100 %**; **Quitar foto** (con confirmación) regresa a 90 %.
3. Expande **Datos personales**, cambia el teléfono a 3 dígitos y toca **Guardar**: el error aparece bajo el campo. Corrígelo, guarda y se anuncia «Datos personales guardados. Tu perfil está al … por ciento.».
4. Expande **Necesidades de ajuste**: arriba dice «No te pedimos diagnóstico…», las casillas van agrupadas por categoría y hay tres opciones para compartir. **Retirar mi consentimiento** pide confirmar y borra las necesidades y la nota.
5. Cierra sesión y entra como **jorge.ramirez@correo.mx** (80 %, sin consentimiento): en **Necesidades de ajuste** ve la explicación y el enlace al aviso de privacidad. **Dar mi consentimiento** confirma antes de enviar; después marca «Intérprete de Lengua de Señas Mexicana» y guarda. En **Vacantes** el chip «Solo las que cubren mis necesidades» ya se puede usar.
6. En Perfil, los botones de pendientes llevan a su lugar: «Agregar experiencia» abre **Mi CV** en esa pestaña.
7. **Mi CV › Experiencia**: **+ Agregar**, elige mes y año de inicio (guarda el día 1) y marca «Trabajo aquí actualmente» (la fecha de fin se oculta). Una fecha de fin anterior al inicio se marca en su campo. Edita y elimina (con confirmación).
8. **Formación**: igual; si el estado es «En curso», la fecha de fin es opcional.
9. **Habilidades**: escribe «pyth» (sugerencias desde 2 letras), toca «Agregar Python», cambia su nivel y toca **Guardar habilidades**. El contador dice «5 de 30»; para llegar a 30 agrega más (el mock tiene 33 habilidades) y el buscador se deshabilita con su explicación.
10. **Vista previa de mi CV**: modal de solo lectura, sin correo ni teléfono y con la aclaración del contacto.
11. En Perfil, **Cambiar contraseña** (error «La contraseña actual no es correcta…» con una incorrecta) y **Eliminar mi cuenta**: primero explica qué se borra y que las postulaciones activas se retiran; después pide la contraseña. Al terminar vuelves a MOV-01 con un aviso, y esa cuenta responde 423 al iniciar sesión.

Con TalkBack o VoiceOver recorre el perfil de arriba abajo: cada sección es un botón «expandida/contraída», los campos tienen etiqueta y los errores se anuncian.

### Cómo probar CAN-05, CAN-06 y CAN-07 en el teléfono

Los cambios se guardan en memoria: al cerrar la app por completo vuelven los datos de S002 y del mock.

1. Entra como **mariana.lopez@correo.mx** y abre **Postulaciones**. **Activas (1)** muestra «Técnico de soporte de TI» con su estado «Entrevista» (ícono y texto) y la fecha y hora de la entrevista. **Finalizadas (3)** muestra Retirada, Aceptada y No seleccionada. El filtro por estado cambia según la pestaña.
2. Jala la lista hacia abajo para actualizarla. Entra con **notificaciones@correo.mx** para ver «Aún no te has postulado» con el botón «Ver vacantes».
3. Abre la postulación de «Técnico de soporte de TI». El **Historial** es una lista: cada paso con fecha, hora y el mensaje del reclutador; el estado actual dice «Estado actual». «Ver vacante» abre CAN-02 y el nombre de la empresa abre su ficha.
4. En **Tu entrevista**: **Abrir liga** abre Meet, **Copiar liga** copia la liga y avisa «Liga copiada.» (pégala en cualquier campo para comprobarlo).
5. **Cancelar entrevista** (se puede: faltan 3 días) pide confirmar. Después aparece **Elige un horario** con los horarios libres agrupados («Hoy», «Mañana», «mié 21 oct»…, según el día).
6. Toca **Agendar** en el único horario de **60 min**: confirma y aparece «Ese horario acaba de ser tomado, elige otro.»; la lista se recarga sin ese horario. Agenda cualquier otro y la tarjeta de la entrevista regresa con la liga nueva.
7. **Retirar postulación** pide confirmar y, si hay entrevista, avisa que también se cancela. Al confirmar, el estado pasa a «Retirada» y la postulación aparece en Finalizadas de CAN-05. Las finalizadas no tienen el botón.
8. Entra como **jorge.ramirez@correo.mx** y abre su postulación «Desarrollador web junior»: la entrevista empieza en 5 horas, no hay botón de cancelar y se explica por qué.
9. Abre **Empresas**: aparecen ConCentro, LogiBajío y TecnoQro (no Estudio Trazo). Busca «logi» (desde 3 letras, 400 ms después de dejar de escribir) o filtra por sector «Manufactura».
10. Abre **TecnoQro**: logo (o iniciales), sector, tamaño, municipio, descripción, **sitio web** (abre el navegador), **Prácticas de inclusión** y sus vacantes con la compatibilidad de Mariana (88 % y 15 %). Menú **⋮ › Reportar empresa**: elige un motivo, envía y aparece «Gracias, revisaremos tu reporte».
11. En CAN-02, tocar el nombre de la empresa abre la misma ficha.

Con TalkBack o VoiceOver cada tarjeta de postulación y de empresa se lee como un solo elemento con todo su resumen (por ejemplo, «Técnico de soporte de TI, TecnoQro. Te postulaste el miércoles 30 de septiembre de 2026. Estado: Entrevista. Entrevista agendada el …, a las 10:00 de la mañana»); las pestañas se anuncian como pestañas con su número y los botones «Agendar» dicen la fecha, la hora y la duración.

### Cómo probar REC-01, REC-02 y REC-03 en el teléfono

Los cambios se guardan en memoria: al cerrar la app por completo vuelven los datos de S002 y del mock.

1. Entra como **rh@tecnoqro.mx** (TecnoQro, validada) y abre **Organización**. El banner verde dice «Empresa validada»; se anuncia al abrir. **Razón social** y **RFC** aparecen con candado y «Para cambiarlos, escribe a soporte.». Cambia la descripción (contador «n / 1000») y toca **Guardar cambios**: aparece «Datos de la organización guardados.». **Cambiar logo** abre la galería cuando el diálogo ya se cerró. La sección «Documento de validación» no ofrece subir constancia (ya está validada).
2. Cierra sesión y entra como **contacto@estudiotrazo.mx** (pendiente): el banner dice «Estamos revisando tu empresa. Puedes crear borradores, pero no publicar.»; ahora **Razón social** y **RFC** sí se editan (un RFC ya usado, como `TQU150312AB1`, se marca en su campo) y aparece **Subir constancia (PDF)**. Un archivo que no sea PDF o de más de 5 MB se rechaza con un mensaje.
3. Entra como **rechazada@constructorarivera.mx**: banner rojo con el motivo y qué hacer. Toca **Subir constancia (PDF)**, elige un PDF y el banner pasa a «Pendiente de validación». Con **suspendida@academiaalameda.mx** el banner dice el motivo y no se puede subir constancia.
4. En **Cuenta**: **Cambiar contraseña** (el mismo modal de CAN-03), **Aviso de privacidad** y **Cerrar sesión**.
5. Entra otra vez como Laura y abre **Mis vacantes**: «Técnico de soporte de TI» y «Desarrollador web junior» (publicadas) y «Diseñador gráfico» (borrador). Cada tarjeta dice «n postulados · m nuevos» (con Roberto, «Analista de datos de operaciones» dice «2 postulados · 1 nuevo»). Filtra por estado con los chips y jala la lista para actualizarla.
6. Toca **⋮** de una vacante: el menú solo ofrece lo que permite su estado (borrador: Editar, Publicar, Duplicar; publicada: Editar, Pausar, Cerrar, Duplicar; pausada: Editar, Reanudar, Cerrar, Duplicar; cerrada: Duplicar; suspendida: nada y la tarjeta dice «Suspendida por el administrador»). Pausar, Reanudar, Cerrar y Publicar piden confirmar. **Duplicar** crea un borrador « (copia)».
7. **+ Nueva vacante** abre el formulario de 4 pasos («Paso 1 de 4», se anuncia al cambiar). «Siguiente» solo revisa el paso actual. Paso 2: busca una habilidad (como en Mi CV) y márcala **Obligatoria** o **Deseable**. Paso 3: tarjetas Presencial, Remoto e Híbrido. Paso 4: los dos bloques de ajustes; uno que marcas en un bloque se deshabilita en el otro, y «Por ahora no contamos con condiciones» limpia los dos.
8. **Publicar** pide confirmar. Si falta algo (por ejemplo, ninguna habilidad obligatoria o la dirección de una vacante presencial) el formulario vuelve al primer paso con error y marca el campo. Con Estudio Trazo, **Publicar** está deshabilitado con su explicación, pero **Guardar borrador** funciona.
9. Para ver el recálculo, entra primero como **mariana.lopez@correo.mx**: «Técnico de soporte de TI» tiene 88 %. Con Laura edita esa vacante y, en el paso 2, cambia **SQL** de Obligatoria a Deseable; al guardar dice «Avisamos a 1 postulado…». Mariana ve ahora **91 %** en Vacantes y en el detalle.
10. Si sales del formulario con cambios sin guardar (botón atrás o gesto), pide confirmar antes de descartarlos. Una vacante cerrada o suspendida no se edita y lo explica.

Con TalkBack o VoiceOver cada tarjeta de vacante se lee como un solo elemento con todo su resumen (por ejemplo, «Técnico de soporte de TI. Híbrido. Estado: Publicada. 1 postulado, 0 nuevos. Publicada el 20 oct») y el menú ⋮ es un botón aparte («Más opciones de Técnico de soporte de TI»).

## Accesibilidad

WCAG 2.1 AA: contraste de 4.5:1 (hay una prueba que lo comprueba con la paleta), áreas táctiles de 48 × 48 dp, texto que respeta el tamaño de fuente del sistema (hasta 200 %), `accessibilityLabel`, `accessibilityRole` y `accessibilityState` en todo lo interactivo, estados con texto e ícono y errores anunciados con `AccessibilityInfo.announceForAccessibility`.

Patrones de CAN-03 y CAN-04 que conviene reutilizar: `SeccionDesplegable` (botón con estado expandido o contraído; el contenido sigue montado para no perder lo escrito), `ModalFormulario` (título al que va el foco, contenido con scroll y botón fijo dentro del área segura), `useRetornoFoco` (devuelve el foco al botón que abrió un modal), `BarraProgreso` (barra con valor dicho en voz alta, por ejemplo «90 por ciento») `SelectorMesAnio` (fecha de mes y año con listas accesibles, sin el selector nativo), `BuscadorHabilidades` (sugerencias del catálogo; lo usan Mi CV y los requisitos de la vacante), `SelectorUbicacion` (entidad y municipio), `FiltroEstado` (opciones excluyentes con palomita) y `ModalContrasena` (en `pantallas/compartidas/`).
