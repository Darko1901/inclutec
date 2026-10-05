import * as SecureStore from 'expo-secure-store';

const CLAVE_TOKEN = 'inclutec_token';

// El token vive en el almacén seguro del sistema; si no está disponible, la app sigue sin sesión.
export async function leerTokenGuardado(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export async function guardarToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLAVE_TOKEN, token);
  } catch {
    // Sin almacén seguro la sesión solo dura mientras la app está abierta.
  }
}

export async function borrarToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  } catch {
    // Nada que borrar.
  }
}
