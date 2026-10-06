import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Notificaciones from 'expo-notifications';
import { Platform } from 'react-native';

import { notificaciones } from '../../api';
import { obtenerTokenPush, olvidarTokenPush, registrarDispositivoPush } from '../dispositivoPush';

// Se simula el entorno de ejecución: Expo Go (storeClient) o una development build (bare).
jest.mock('expo', () => ({ isRunningInExpoGo: jest.fn(() => false) }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare', expoConfig: null, easConfig: null },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const constantes = Constants as unknown as { executionEnvironment: string };
const enExpoGo = isRunningInExpoGo as jest.Mock;

const permisos = Notificaciones.getPermissionsAsync as jest.Mock;
const pedirPermiso = Notificaciones.requestPermissionsAsync as jest.Mock;
const obtenerToken = Notificaciones.getExpoPushTokenAsync as jest.Mock;

describe('registro del dispositivo para push', () => {
  beforeEach(() => {
    constantes.executionEnvironment = 'bare';
    enExpoGo.mockReturnValue(false);
    olvidarTokenPush();
    jest.spyOn(notificaciones, 'registrarDispositivo').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('en Expo Go no pide permiso ni registra nada y no lanza errores', async () => {
    constantes.executionEnvironment = 'storeClient';

    await expect(registrarDispositivoPush()).resolves.toBeUndefined();

    expect(permisos).not.toHaveBeenCalled();
    expect(obtenerToken).not.toHaveBeenCalled();
    expect(notificaciones.registrarDispositivo).not.toHaveBeenCalled();
  });

  it('también lo omite si la librería detecta Expo Go', async () => {
    enExpoGo.mockReturnValue(true);
    await registrarDispositivoPush();
    expect(notificaciones.registrarDispositivo).not.toHaveBeenCalled();
  });

  it('con el permiso ya concedido obtiene el token y llama a POST /dispositivos', async () => {
    permisos.mockResolvedValueOnce({ status: 'granted' });

    await registrarDispositivoPush();

    expect(pedirPermiso).not.toHaveBeenCalled();
    expect(notificaciones.registrarDispositivo).toHaveBeenCalledWith({
      expo_push_token: 'ExponentPushToken[prueba]',
      plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    expect(obtenerTokenPush()).toBe('ExponentPushToken[prueba]');
  });

  it('pide el permiso y, si lo dan, registra el dispositivo', async () => {
    pedirPermiso.mockResolvedValueOnce({ status: 'granted' });

    await registrarDispositivoPush();

    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    expect(notificaciones.registrarDispositivo).toHaveBeenCalledTimes(1);
  });

  it('si no dan el permiso, no registra nada ni muestra errores', async () => {
    await expect(registrarDispositivoPush()).resolves.toBeUndefined();

    expect(pedirPermiso).toHaveBeenCalledTimes(1);
    expect(obtenerToken).not.toHaveBeenCalled();
    expect(notificaciones.registrarDispositivo).not.toHaveBeenCalled();
    expect(obtenerTokenPush()).toBeNull();
  });

  it('si algo falla (sin red, sin proyecto), lo omite sin lanzar', async () => {
    permisos.mockResolvedValueOnce({ status: 'granted' });
    obtenerToken.mockRejectedValueOnce(new Error('sin proyecto'));

    await expect(registrarDispositivoPush()).resolves.toBeUndefined();

    expect(obtenerTokenPush()).toBeNull();
  });
});
