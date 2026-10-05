import { AxiosError, type AxiosResponse } from 'axios';

import { ApiError, MENSAJE_SERVICIO_NO_DISPONIBLE } from '../errores';

function errorHttp(status: number, data: unknown, headers: Record<string, string> = {}) {
  const respuesta = { status, data, headers, statusText: '', config: {} } as AxiosResponse;
  return new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

describe('ApiError', () => {
  it('conserva status, codigo, detail y campos del cuerpo del contrato', () => {
    const error = ApiError.desde(
      errorHttp(422, {
        detail: 'Revisa los datos marcados.',
        codigo: 'validacion',
        campos: { telefono: 'Debe tener 10 dígitos.' },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.codigo).toBe('validacion');
    expect(error.detail).toBe('Revisa los datos marcados.');
    expect(error.message).toBe('Revisa los datos marcados.');
    expect(error.campos).toEqual({ telefono: 'Debe tener 10 dígitos.' });
  });

  it('deja campos en null cuando el error no es de validación', () => {
    const error = ApiError.desde(
      errorHttp(401, {
        detail: 'Correo o contraseña incorrectos.',
        codigo: 'credenciales_invalidas',
      }),
    );
    expect(error.campos).toBeNull();
    expect(error.reintentarEn).toBeNull();
  });

  it('lee el encabezado Retry-After en los 429', () => {
    const error = ApiError.desde(
      errorHttp(
        429,
        { detail: 'Demasiados intentos.', codigo: 'demasiados_intentos' },
        { 'retry-after': '900' },
      ),
    );
    expect(error.codigo).toBe('demasiados_intentos');
    expect(error.reintentarEn).toBe(900);
  });

  it('convierte un error de red en error_interno con el mensaje genérico', () => {
    const error = ApiError.desde(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(error.codigo).toBe('error_interno');
    expect(error.detail).toBe(MENSAJE_SERVICIO_NO_DISPONIBLE);
    expect(error.detail).toBe('El servicio no está disponible; intenta más tarde');
  });

  it('convierte cualquier 5xx en error_interno sin exponer el cuerpo', () => {
    const error = ApiError.desde(errorHttp(503, '<html>Bad gateway</html>'));
    expect(error.status).toBe(503);
    expect(error.codigo).toBe('error_interno');
    expect(error.detail).toBe(MENSAJE_SERVICIO_NO_DISPONIBLE);
  });

  it('tolera el 422 con la forma por omisión de FastAPI', () => {
    const error = ApiError.desde(errorHttp(422, { detail: [{ loc: ['body'], msg: 'x' }] }));
    expect(error.codigo).toBe('validacion');
    expect(error.detail).toBe('Revisa los datos marcados.');
  });

  it('no envuelve dos veces un ApiError', () => {
    const original = ApiError.servicioNoDisponible();
    expect(ApiError.desde(original)).toBe(original);
  });
});
