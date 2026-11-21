import Constants from 'expo-constants';

const PUERTO_API = 8000;
const RUTA_API = '/api/v1';

/**
 * URL base del API.
 *
 * - Si `EXPO_PUBLIC_API_URL` tiene valor, se usa tal cual.
 * - Si está vacía, en desarrollo se usa la misma computadora desde la que el teléfono descargó la
 *   app (el `hostUri` de Expo, por ejemplo `192.168.100.37:8081`) con el puerto del API. Así,
 *   si el módem le da otra IP a la computadora, la app la sigue sin tocar el `.env`.
 * - Sin ninguna de las dos (por ejemplo, en las pruebas), `localhost`.
 */
export function resolverApiUrl(configurada: string | undefined, hostUri: string | undefined) {
  const valor = configurada?.trim();
  if (valor) return valor;
  const host = hostUri?.split(':')[0];
  return host
    ? `http://${host}:${PUERTO_API}${RUTA_API}`
    : `http://localhost:${PUERTO_API}${RUTA_API}`;
}

// Las variables EXPO_PUBLIC_* se leen con acceso directo para que Expo las sustituya al empaquetar.
export const API_URL = resolverApiUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.hostUri,
);

/** Datos simulados mientras el API no exista; se apaga con EXPO_PUBLIC_USE_MOCK=false. */
export const USAR_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true').toLowerCase() !== 'false';

/** Los archivos (fotos y logotipos) se sirven fuera de /api/v1: http://localhost:8000/archivos/… */
export function urlArchivo(ruta: string): string {
  if (/^(https?|file|content|data):/.test(ruta)) return ruta;
  const origen = API_URL.replace(/\/api\/v\d+\/?$/, '');
  return `${origen}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
}
