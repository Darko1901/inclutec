import * as ImagePicker from 'expo-image-picker';

import type { ArchivoLocal } from '../../../api';

export type OrigenFoto = 'galeria' | 'camara';

export type ResultadoFoto =
  | { tipo: 'archivo'; archivo: ArchivoLocal }
  | { tipo: 'cancelado' }
  | { tipo: 'sin_permiso' }
  /** El selector del sistema falló al abrirse. */
  | { tipo: 'error' };

const OPCIONES = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  // Una calidad de 0.7 deja la foto muy por debajo del límite de 2 MB del API.
  quality: 0.7,
  // Fotos de iPhone en HEIC: con la representación compatible iOS entrega JPEG.
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
} satisfies ImagePicker.ImagePickerOptions;

/** Tipo MIME del archivo: el que informa el sistema o, si no lo da, el que indica la extensión. */
function tipoDe(activo: ImagePicker.ImagePickerAsset): string {
  if (activo.mimeType) return activo.mimeType;
  const extension = /\.([a-z0-9]+)(?:\?.*)?$/i
    .exec(activo.fileName ?? activo.uri)?.[1]
    ?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'heic' || extension === 'heif') return `image/${extension}`;
  return 'image/jpeg';
}

function aArchivoLocal(activo: ImagePicker.ImagePickerAsset, nombreBase: string): ArchivoLocal {
  const tipo = tipoDe(activo);
  const extension = tipo.split('/')[1] === 'jpeg' ? 'jpg' : tipo.split('/')[1];
  return {
    uri: activo.uri,
    nombre: activo.fileName ?? `${nombreBase}.${extension}`,
    tipo,
    tamano: activo.fileSize,
  };
}

/**
 * Abre la galería o la cámara. La galería no pide permiso (el sistema muestra su propio
 * selector); la cámara sí, y la explicación de para qué se usa va en el diálogo que la precede.
 */
export async function elegirFoto(
  origen: OrigenFoto,
  nombreBase = 'foto-perfil',
): Promise<ResultadoFoto> {
  if (origen === 'camara') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return { tipo: 'sin_permiso' };
  }
  let resultado: ImagePicker.ImagePickerResult;
  try {
    resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync(OPCIONES)
        : await ImagePicker.launchImageLibraryAsync(OPCIONES);
  } catch {
    return { tipo: 'error' };
  }
  if (resultado.canceled || resultado.assets.length === 0) return { tipo: 'cancelado' };
  return { tipo: 'archivo', archivo: aArchivoLocal(resultado.assets[0], nombreBase) };
}
