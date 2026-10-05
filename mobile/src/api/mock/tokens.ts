import type { RolUsuario } from '../tipos';

// Token con la misma forma que el JWT del contrato (sub, rol, exp). No se firma: el mock lo
// reconoce por su contenido, así la sesión guardada sigue siendo válida al reiniciar la app.
export const VIGENCIA_TOKEN_MS = 8 * 60 * 60 * 1000;

interface CargaToken {
  sub: string;
  rol: RolUsuario;
  exp: number;
}

function aBase64Url(texto: string): string {
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): string {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
}

export function crearToken(usuarioId: number, rol: RolUsuario, ahora = Date.now()) {
  const exp = Math.floor((ahora + VIGENCIA_TOKEN_MS) / 1000);
  const carga: CargaToken = { sub: String(usuarioId), rol, exp };
  const token = [
    aBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    aBase64Url(JSON.stringify(carga)),
    'firma-simulada',
  ].join('.');
  return { token, expiraEn: new Date(exp * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z') };
}

/** Devuelve la carga si el token es del mock y no ha vencido; si no, null. */
export function leerToken(token: string | null, ahora = Date.now()): CargaToken | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 3 || partes[2] !== 'firma-simulada') return null;
  try {
    const carga = JSON.parse(deBase64Url(partes[1])) as CargaToken;
    if (typeof carga.sub !== 'string' || typeof carga.exp !== 'number') return null;
    return carga.exp * 1000 > ahora ? carga : null;
  } catch {
    return null;
  }
}
