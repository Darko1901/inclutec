import * as ImagePicker from 'expo-image-picker';

import type { ArchivoLocal } from '../../../api';

export type OrigenFoto = 'galeria' | 'camara';

export type ResultadoFoto =
  { tipo: 'archivo'; archivo: ArchivoLocal } | { tipo: 'cancelado' } | { tipo: 'sin_permiso' };

const OPCIONES = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  // Una calidad de 0.7 deja la foto muy por debajo del límite de 2 MB del API.
  quality: 0.7,
} satisfies ImagePicker.ImagePickerOptions;

function aArchivoLocal(activo: ImagePicker.ImagePickerAsset): ArchivoLocal {
  const esPng = activo.mimeType === 'image/png' || /\.png$/i.test(activo.uri);
  const tipo = activo.mimeType ?? (esPng ? 'image/png' : 'image/jpeg');
  return {
    uri: activo.uri,
    nombre: activo.fileName ?? `foto-perfil.${esPng ? 'png' : 'jpg'}`,
    tipo,
    tamano: activo.fileSize,
  };
}

/**
 * Abre la galería o la cámara. La galería no pide permiso (el sistema muestra su propio
 * selector); la cámara sí, y la explicación de para qué se usa va en el diálogo que la precede.
 */
export async function elegirFoto(origen: OrigenFoto): Promise<ResultadoFoto> {
  if (origen === 'camara') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return { tipo: 'sin_permiso' };
  }
  const resultado =
    origen === 'camara'
      ? await ImagePicker.launchCameraAsync(OPCIONES)
      : await ImagePicker.launchImageLibraryAsync(OPCIONES);
  if (resultado.canceled || resultado.assets.length === 0) return { tipo: 'cancelado' };
  return { tipo: 'archivo', archivo: aArchivoLocal(resultado.assets[0]) };
}
