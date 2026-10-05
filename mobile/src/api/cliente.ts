import { create, type AxiosInstance } from 'axios';

import { API_URL } from './config';
import { ApiError } from './errores';
import { manejarError, obtenerToken } from './sesionApi';

const TIEMPO_MAXIMO_MS = 15000;

export function crearCliente(baseURL: string = API_URL): AxiosInstance {
  const instancia = create({
    baseURL,
    timeout: TIEMPO_MAXIMO_MS,
    headers: { Accept: 'application/json' },
  });

  instancia.interceptors.request.use((config) => {
    const token = obtenerToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  instancia.interceptors.response.use(
    (respuesta) => respuesta,
    (error: unknown) => {
      const apiError = ApiError.desde(error);
      manejarError(apiError);
      return Promise.reject(apiError);
    },
  );

  return instancia;
}

export const cliente = crearCliente();
