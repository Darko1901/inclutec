import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { notificaciones } from '../api';

let tokenRegistrado: string | null = null;

/** Token push de este dispositivo, si ya se registró en esta sesión. */
export function obtenerTokenPush(): string | null {
  return tokenRegistrado;
}

export function olvidarTokenPush(): void {
  tokenRegistrado = null;
}

/**
 * Pide el permiso de notificaciones y, si se concede, registra el token en POST /dispositivos.
 * Nunca lanza errores ni muestra nada: sin push la app funciona igual.
 */
export async function registrarDispositivoPush(): Promise<void> {
  // Expo Go ya no incluye las push remotas (en Android desde el SDK 53) y `expo-notifications`
  // avisa con errores y advertencias al cargarse ahí. Por eso ni siquiera se importa en Expo Go;
  // el registro funciona en una development build.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || isRunningInExpoGo()) {
    return;
  }

  try {
    // Se carga aquí y no al inicio del archivo, para que no se evalúe en Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notificaciones = require('expo-notifications') as typeof import('expo-notifications');

    if (Platform.OS === 'android') {
      // En Android 13+ el permiso solo se puede pedir después de crear un canal.
      await Notificaciones.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notificaciones.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notificaciones.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notificaciones.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notificaciones.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await notificaciones.registrarDispositivo({
      expo_push_token: token,
      plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    tokenRegistrado = token;
  } catch {
    // Sin permiso, sin red o sin proyecto de EAS: se omite sin avisar al usuario.
  }
}
