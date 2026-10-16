// Las variables EXPO_PUBLIC_* se leen con acceso directo para que Expo las sustituya al empaquetar.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/** Datos simulados mientras el API no exista; se apaga con EXPO_PUBLIC_USE_MOCK=false. */
export const USAR_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true').toLowerCase() !== 'false';

/** Los archivos (fotos y logotipos) se sirven fuera de /api/v1: http://localhost:8000/archivos/… */
export function urlArchivo(ruta: string): string {
  if (/^(https?|file|content|data):/.test(ruta)) return ruta;
  const origen = API_URL.replace(/\/api\/v\d+\/?$/, '');
  return `${origen}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
}
