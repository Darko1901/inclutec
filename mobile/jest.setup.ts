import * as SecureStore from 'expo-secure-store';

import { reiniciarMock } from './src/api/mock/datos';
import { configurarLatencia } from './src/api/mock/simulador';
import { configurarSesionApi } from './src/api/sesionApi';

// Almacén seguro en memoria (en el teléfono lo da el sistema).
jest.mock('expo-secure-store', () => {
  const valores = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (clave: string) => valores.get(clave) ?? null),
    setItemAsync: jest.fn(async (clave: string, valor: string) => {
      valores.set(clave, valor);
    }),
    deleteItemAsync: jest.fn(async (clave: string) => {
      valores.delete(clave);
    }),
  };
});

beforeEach(async () => {
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync('inclutec_token');
  configurarLatencia(0, 0);
  reiniciarMock();
  configurarSesionApi({ obtenerToken: () => null, alNoAutenticado: () => undefined });
});
