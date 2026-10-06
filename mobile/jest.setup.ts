import * as SecureStore from 'expo-secure-store';

import { reiniciarMock } from './src/api/mock/datos';
import { configurarLatencia } from './src/api/mock/simulador';
import { configurarSesionApi } from './src/api/sesionApi';
import { limpiarCatalogosGuardados } from './src/api/useCatalogo';

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

// Por omisión, sin permiso de notificaciones: así las pruebas no registran dispositivos ni
// disparan las advertencias de expo-notifications.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[prueba]' })),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync('inclutec_token');
  configurarLatencia(0, 0);
  reiniciarMock();
  limpiarCatalogosGuardados();
  configurarSesionApi({ obtenerToken: () => null, alNoAutenticado: () => undefined });
});
