// Formato práctico de correo (subconjunto de RFC 5322 que usa el API: local@dominio.tld).
const REGEX_CORREO =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const LONGITUD_MIN_CONTRASENA = 8;
export const LONGITUD_MAX_CONTRASENA = 64;

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

export function esCorreoValido(correo: string): boolean {
  const valor = correo.trim();
  return valor.length > 0 && valor.length <= 254 && REGEX_CORREO.test(valor);
}

/** Para el inicio de sesión basta la longitud; la política completa solo aplica al registrar. */
export function esContrasenaDeLogin(contrasena: string): boolean {
  return (
    contrasena.length >= LONGITUD_MIN_CONTRASENA && contrasena.length <= LONGITUD_MAX_CONTRASENA
  );
}

/** Política de registro y recuperación: 8 a 64 caracteres con al menos una letra y un número. */
export function esContrasenaValida(contrasena: string): boolean {
  return (
    esContrasenaDeLogin(contrasena) &&
    /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(contrasena) &&
    /\d/.test(contrasena)
  );
}

export function esTelefonoValido(telefono: string): boolean {
  return /^[0-9]{10}$/.test(telefono);
}

export function esCodigoValido(codigo: string): boolean {
  return /^[0-9]{6}$/.test(codigo);
}

export function esRfcValido(rfc: string): boolean {
  return /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc);
}

// Mensajes de error en lenguaje claro: dicen qué falla y cómo corregirlo.
export function mensajeCorreo(correo: string): string | null {
  if (correo.trim().length === 0) return 'Escribe tu correo electrónico.';
  if (!esCorreoValido(correo)) return 'Escribe un correo válido, por ejemplo nombre@correo.mx.';
  return null;
}

export function mensajeContrasenaDeLogin(contrasena: string): string | null {
  if (contrasena.length === 0) return 'Escribe tu contraseña.';
  if (contrasena.length < LONGITUD_MIN_CONTRASENA) {
    return `La contraseña tiene al menos ${LONGITUD_MIN_CONTRASENA} caracteres.`;
  }
  if (contrasena.length > LONGITUD_MAX_CONTRASENA) {
    return `La contraseña tiene máximo ${LONGITUD_MAX_CONTRASENA} caracteres.`;
  }
  return null;
}
