import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { crearCliente } from '../cliente';
import { ApiError } from '../errores';
import { configurarSesionApi } from '../sesionApi';

type Respuesta = { status: number; data?: unknown; headers?: Record<string, string> };

/** Cliente con un adaptador falso: registra las peticiones y responde lo que se le pida. */
function clienteConRespuesta(respuesta: Respuesta | 'red') {
  const peticiones: InternalAxiosRequestConfig[] = [];
  const cliente = crearCliente('http://api.prueba/api/v1');
  cliente.defaults.adapter = async (config) => {
    peticiones.push(config);
    if (respuesta === 'red') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const completa = { data: null, headers: {}, statusText: '', config, ...respuesta };
    if (respuesta.status >= 400) {
      throw new AxiosError('fallo', 'ERR_BAD_RESPONSE', config, undefined, completa);
    }
    return completa;
  };
  return { cliente, peticiones };
}

describe('cliente HTTP', () => {
  it('usa la URL base indicada', () => {
    expect(crearCliente('http://api.prueba/api/v1').defaults.baseURL).toBe(
      'http://api.prueba/api/v1',
    );
  });

  it('agrega Authorization: Bearer cuando hay token en la sesión', async () => {
    configurarSesionApi({ obtenerToken: () => 'token-123' });
    const { cliente, peticiones } = clienteConRespuesta({ status: 200, data: {} });

    await cliente.get('/auth/me');

    expect(peticiones[0].headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('no manda Authorization sin sesión', async () => {
    const { cliente, peticiones } = clienteConRespuesta({ status: 200, data: {} });

    await cliente.get('/catalogos/modalidades');

    expect(peticiones[0].headers.get('Authorization')).toBeFalsy();
  });

  it('convierte las respuestas de error en ApiError', async () => {
    const { cliente } = clienteConRespuesta({
      status: 409,
      data: { detail: 'Ese correo ya está registrado.', codigo: 'correo_duplicado' },
    });

    const error = await cliente.post('/auth/registro/candidato', {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, codigo: 'correo_duplicado', campos: null });
  });

  it('avisa a la sesión ante un 401 no_autenticado', async () => {
    const alNoAutenticado = jest.fn();
    configurarSesionApi({ alNoAutenticado });
    const { cliente } = clienteConRespuesta({
      status: 401,
      data: { detail: 'Tu sesión venció.', codigo: 'no_autenticado' },
    });

    await expect(cliente.get('/auth/me')).rejects.toMatchObject({ codigo: 'no_autenticado' });
    expect(alNoAutenticado).toHaveBeenCalledTimes(1);
  });

  it('no cierra la sesión ante un 401 de credenciales inválidas', async () => {
    const alNoAutenticado = jest.fn();
    configurarSesionApi({ alNoAutenticado });
    const { cliente } = clienteConRespuesta({
      status: 401,
      data: { detail: 'Correo o contraseña incorrectos.', codigo: 'credenciales_invalidas' },
    });

    await expect(cliente.post('/auth/login', {})).rejects.toMatchObject({
      codigo: 'credenciales_invalidas',
    });
    expect(alNoAutenticado).not.toHaveBeenCalled();
  });

  it('convierte un error de red en error_interno', async () => {
    const { cliente } = clienteConRespuesta('red');

    await expect(cliente.get('/auth/me')).rejects.toMatchObject({
      codigo: 'error_interno',
      detail: 'El servicio no está disponible; intenta más tarde',
    });
  });

  it('convierte un 500 en error_interno', async () => {
    const { cliente } = clienteConRespuesta({ status: 500, data: { detail: 'Traceback...' } });

    await expect(cliente.get('/auth/me')).rejects.toMatchObject({
      status: 500,
      codigo: 'error_interno',
      detail: 'El servicio no está disponible; intenta más tarde',
    });
  });
});
