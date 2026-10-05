import { formatearFecha, formatearFechaHora, formatearHora, formatearRelativo } from '../fechas';
import {
  esContrasenaValida,
  esCorreoValido,
  esTelefonoValido,
  mensajeContrasenaDeLogin,
  mensajeCorreo,
} from '../validaciones';

describe('validaciones', () => {
  it.each(['mariana.lopez@correo.mx', 'rh@tecnoqro.mx', 'a+b@sub.dominio.com'])(
    'acepta %s',
    (correo) => {
      expect(esCorreoValido(correo)).toBe(true);
    },
  );

  it.each(['', 'sin-arroba', 'a@b', '@correo.mx', 'a b@correo.mx', 'a@correo..mx'])(
    'rechaza «%s»',
    (correo) => {
      expect(esCorreoValido(correo)).toBe(false);
    },
  );

  it('explica cómo corregir el correo y la contraseña', () => {
    expect(mensajeCorreo('')).toBe('Escribe tu correo electrónico.');
    expect(mensajeCorreo('x')).toBe('Escribe un correo válido, por ejemplo nombre@correo.mx.');
    expect(mensajeCorreo('a@b.mx')).toBeNull();
    expect(mensajeContrasenaDeLogin('corta')).toBe('La contraseña tiene al menos 8 caracteres.');
    expect(mensajeContrasenaDeLogin('Inclutec2026')).toBeNull();
  });

  it('aplica la política de contraseña: 8 a 64, con letra y número', () => {
    expect(esContrasenaValida('Inclutec2026')).toBe(true);
    expect(esContrasenaValida('sololetras')).toBe(false);
    expect(esContrasenaValida('12345678')).toBe(false);
    expect(esContrasenaValida('Ab1')).toBe(false);
    expect(esContrasenaValida('a1'.repeat(33))).toBe(false);
  });

  it('el teléfono tiene 10 dígitos', () => {
    expect(esTelefonoValido('4427654321')).toBe(true);
    expect(esTelefonoValido('442765432')).toBe(false);
    expect(esTelefonoValido('442 765 4321')).toBe(false);
  });
});

describe('fechas', () => {
  it('muestra la hora de la Ciudad de México a partir de UTC', () => {
    // 16:30 UTC = 10:30 en la Ciudad de México (UTC−6, sin horario de verano).
    expect(formatearHora('2026-10-02T16:30:00Z')).toMatch(/^10:30\s?a\.\s?m\.$/);
    expect(formatearFecha('2026-10-02T16:30:00Z')).toBe('2 oct 2026');
    expect(formatearFechaHora('2026-10-02T16:30:00Z')).toMatch(/^2 oct 2026, 10:30/);
  });

  it('formatea fechas sin hora sin moverlas de día', () => {
    expect(formatearFecha('2023-02-01')).toBe('1 feb 2023');
  });

  it('devuelve texto vacío con una fecha inválida', () => {
    expect(formatearFecha('no es fecha')).toBe('');
    expect(formatearHora('')).toBe('');
  });

  it('da tiempos relativos para listas', () => {
    const ahora = new Date('2026-10-02T18:00:00Z');
    expect(formatearRelativo('2026-10-02T17:59:30Z', ahora)).toBe('ahora');
    expect(formatearRelativo('2026-10-02T17:30:00Z', ahora)).toBe('hace 30 min');
    expect(formatearRelativo('2026-10-02T15:00:00Z', ahora)).toBe('hace 3 h');
    expect(formatearRelativo('2026-10-01T12:00:00Z', ahora)).toBe('ayer');
    expect(formatearRelativo('2026-09-20T12:00:00Z', ahora)).toBe('20 sep 2026');
  });
});
