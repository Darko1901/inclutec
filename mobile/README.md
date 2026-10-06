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

| Correo                       | Rol                           | Qué ocurre al entrar                                                                                                        |
| ---------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| mariana.lopez@correo.mx      | Candidata                     | Llega a Vacantes; la pestaña Notificaciones dice «1 sin leer».                                                              |
| jorge.ramirez@correo.mx      | Candidato                     | Llega a Vacantes; sin notificaciones.                                                                                       |
| rh@tecnoqro.mx               | Reclutadora (Laura, TecnoQro) | Llega a Mis vacantes; Notificaciones dice «1 sin leer».                                                                     |
| admin@inclutec.mx            | Administrador                 | Muestra «El administrador usa el panel web» y no inicia sesión.                                                             |
| **suspendida@correo.mx**     | Candidata suspendida          | Responde 423: «Tu cuenta está suspendida.»                                                                                  |
| **notificaciones@correo.mx** | Candidata (Lucía)             | Llega a Vacantes; tiene 45 notificaciones (5 sin leer) para probar el desplazamiento infinito y «Marcar todas como leídas». |

Las cuentas `suspendida@correo.mx` y `notificaciones@correo.mx` **existen solo en el mock** (no están en la base de datos de prueba). Jorge no tiene notificaciones: sirve para ver el estado vacío.

Otras pruebas con el mock:

- **429:** escribe una contraseña incorrecta 5 veces con el mismo correo; el siguiente intento, aunque sea correcto, responde «Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.» (el bloqueo dura mientras la app esté abierta).
- **Código de recuperación de contraseña:** en el mock el código válido es siempre **`123456`** (vence a los 15 minutos; después de 5 intentos incorrectos responde 410; el reenvío solo se permite 60 s después del envío anterior). No llega ningún correo.
- **Registro:** en el mock, `mariana.lopez@correo.mx` (o cualquier correo de la tabla de arriba) responde «correo ya registrado» y el RFC `TQU150312AB1` responde «RFC ya registrado». Cualquier otro dato válido crea la cuenta (el candidato llega a Perfil y el reclutador a Organización; su empresa queda «pendiente»).
- **Notificaciones push:** el registro del dispositivo (`POST /dispositivos`) se omite en Expo Go, porque ahí las push remotas ya no existen (Android desde el SDK 53). Funciona en una _development build_.
- Los cambios (registros, notificaciones leídas, contraseñas nuevas) se guardan **en memoria**: al cerrar la app por completo vuelven los datos originales. La sesión sí se conserva (el token está en `expo-secure-store`).

## Comandos

| Comando            | Qué hace                                                          |
| ------------------ | ----------------------------------------------------------------- |
| `npm start`        | Servidor de Expo.                                                 |
| `npm run lint`     | ESLint (con reglas de Expo y Prettier).                           |
| `npx tsc --noEmit` | Revisión de tipos.                                                |
| `npm test`         | Pruebas con Jest y Testing Library.                               |
| `npm run format`   | Da formato con Prettier.                                          |
| `npm run tipos`    | Regenera `src/api/esquema.d.ts` desde `../docs/api/openapi.yaml`. |

## Tipos del API

`src/api/esquema.d.ts` se **genera** con `openapi-typescript` a partir de `docs/api/openapi.yaml`; no se edita a mano. Cuando cambie el contrato, corre `npm run tipos` y revisa los errores de TypeScript que aparezcan. `src/api/tipos.ts` solo les pone nombre (`Usuario`, `Sesion`, …).

## Capa de servicios

Las pantallas y los componentes **nunca** importan datos de prueba; solo usan los servicios de `src/api` (`auth`, `catalogos`, `notificaciones`):

```ts
import { auth, ApiError } from '../../api';

const sesion = await auth.login({ correo, contrasena });
```

Cada servicio tiene una interfaz y dos implementaciones, y `src/api/index.ts` elige una según `EXPO_PUBLIC_USE_MOCK`:

- **HTTP** (`auth.ts`, `catalogos.ts`, `notificaciones.ts`): usa el cliente Axios de `cliente.ts`, que agrega `Authorization: Bearer`, convierte toda respuesta de error en `ApiError { status, codigo, detail, campos }` y, ante un `401 no_autenticado`, avisa a la sesión para que se cierre. Los errores de red y los 5xx se convierten en `error_interno` con el mensaje «El servicio no está disponible; intenta más tarde».
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
    │   ├── auth.ts · catalogos.ts · notificaciones.ts   Interfaz + implementación HTTP
    │   ├── servicios.ts    Elige HTTP o mock según EXPO_PUBLIC_USE_MOCK
    │   ├── index.ts        Lo único que importan las pantallas
    │   ├── useCatalogo.ts  Hook para cargar catálogos (con caché en memoria)
    │   └── mock/           Datos simulados y simulador de respuestas
    ├── componentes/        Componentes base accesibles (Boton, CampoTexto, Selector, Casilla, …)
    ├── contenido/          Textos largos, como el aviso de privacidad
    ├── pantallas/
    │   ├── compartidas/    MOV-00 a MOV-04
    │   ├── candidato/      CAN-01 a CAN-07
    │   └── reclutador/     REC-01 a REC-06
    ├── navegacion/         Navegador raíz y barras inferiores por rol
    ├── sesion/             Contexto de sesión y token en expo-secure-store
    ├── tema/               Colores, tipografía y espaciado
    └── utilidades/         Formato de fechas y validaciones
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
| «Cerrar sesión» en CAN-03 Perfil y REC-01 Organización                                 | Funcional                                                 |
| CAN-01 a CAN-07, REC-01 a REC-06                                                       | Marcador «Pendiente» (se llenan en las siguientes tareas) |

Al tocar una notificación se abre la pantalla de su referencia pasándole el id (CAN-06, REC-05, REC-06, REC-01 o REC-02); esas pantallas son marcadores que muestran el id recibido.

## Accesibilidad

WCAG 2.1 AA: contraste de 4.5:1 (hay una prueba que lo comprueba con la paleta), áreas táctiles de 48 × 48 dp, texto que respeta el tamaño de fuente del sistema (hasta 200 %), `accessibilityLabel`, `accessibilityRole` y `accessibilityState` en todo lo interactivo, estados con texto e ícono y errores anunciados con `AccessibilityInfo.announceForAccessibility`.
