import * as DocumentPicker from 'expo-document-picker';

import type { ArchivoLocal } from '../../../api';
import { MAX_CONSTANCIA_MB } from './textosOrganizacion';

type ResultadoConstancia =
  | { tipo: 'archivo'; archivo: ArchivoLocal }
  | { tipo: 'cancelado' }
  /** El selector de archivos falló al abrirse. */
  | { tipo: 'error' };

/** Abre el selector de archivos del sistema, limitado a PDF. */
export async function elegirConstancia(): Promise<ResultadoConstancia> {
  let resultado: DocumentPicker.DocumentPickerResult;
  try {
    resultado = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    return { tipo: 'error' };
  }
  if (resultado.canceled || resultado.assets.length === 0) return { tipo: 'cancelado' };
  const activo = resultado.assets[0];
  return {
    tipo: 'archivo',
    archivo: {
      uri: activo.uri,
      nombre: activo.name,
      tipo: activo.mimeType ?? 'application/pdf',
      tamano: activo.size,
    },
  };
}

/** Revisa tipo y tamaño antes de subir (el API vuelve a revisarlos). */
export function mensajeConstancia(archivo: ArchivoLocal): string | null {
  const esPdf = archivo.tipo
    ? archivo.tipo.toLowerCase() === 'application/pdf'
    : /\.pdf$/i.test(archivo.nombre);
  if (!esPdf) return 'La constancia debe ser un archivo PDF. Elige otro archivo.';
  if (archivo.tamano !== undefined && archivo.tamano > MAX_CONSTANCIA_MB * 1024 * 1024) {
    return `La constancia pesa más de ${MAX_CONSTANCIA_MB} MB. Elige un PDF más ligero.`;
  }
  return null;
}
