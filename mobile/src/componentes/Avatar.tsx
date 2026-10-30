import { Image, StyleSheet, View } from 'react-native';

import { urlArchivo } from '../api';
import { colores } from '../tema';
import { Texto } from './Texto';

interface AvatarProps {
  /** Ruta de la foto (la del API o una local); sin ella se muestran las iniciales. */
  fotoUrl: string | null;
  nombre: string;
  apellidos: string;
  tamano?: number;
  /** Con foto, la describe para el lector de pantalla; las iniciales y las fotos decorativas no se leen. */
  descripcion?: string;
  testID?: string;
}

const inicial = (texto: string) => texto.trim().charAt(0).toUpperCase();

export function Avatar({
  fotoUrl,
  nombre,
  apellidos,
  tamano = 88,
  descripcion,
  testID,
}: AvatarProps) {
  const caja = { width: tamano, height: tamano, borderRadius: tamano / 2 };
  if (fotoUrl) {
    return (
      <Image
        testID={testID}
        source={{ uri: urlArchivo(fotoUrl) }}
        style={[estilos.foto, caja]}
        accessible={Boolean(descripcion)}
        accessibilityRole={descripcion ? 'image' : undefined}
        accessibilityLabel={descripcion}
        importantForAccessibility={descripcion ? 'yes' : 'no'}
      />
    );
  }
  return (
    <View
      testID={testID}
      style={[estilos.iniciales, caja]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Decorativas y dentro de un círculo fijo: no crecen con la letra del sistema (no se leen). */}
      <Texto
        variante="subtitulo"
        allowFontScaling={false}
        style={{ color: colores.primario, fontSize: tamano / 2.6, lineHeight: tamano / 2 }}
      >
        {`${inicial(nombre)}${inicial(apellidos)}`}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: { backgroundColor: colores.fondoSuave },
  iniciales: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.infoFondo,
    borderWidth: 2,
    borderColor: colores.primario,
  },
});
