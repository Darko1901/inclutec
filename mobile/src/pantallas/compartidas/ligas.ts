import { setStringAsync } from 'expo-clipboard';
import { Linking } from 'react-native';

export const TEXTO_LIGA_COPIADA = 'Liga copiada.';

/** Abre una liga; si falla devuelve el mensaje para el usuario. */
export async function abrirLiga(liga: string): Promise<string | null> {
  try {
    await Linking.openURL(liga);
    return null;
  } catch {
    return 'No pudimos abrir la liga. Cópiala y ábrela en tu navegador.';
  }
}

/** Copia una liga al portapapeles; si falla devuelve el mensaje para el usuario. */
export async function copiarLiga(liga: string): Promise<string | null> {
  try {
    await setStringAsync(liga);
    return null;
  } catch {
    return 'No pudimos copiar la liga. Intenta de nuevo.';
  }
}
