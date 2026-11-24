import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { urlArchivo } from '../api';
import { colores, radio } from '../tema';
import { Texto } from './Texto';

interface LogoEmpresaProps {
  logoUrl: string | null;
  nombre: string;
  tamano?: number;
  testID?: string;
}

/** Hasta dos iniciales: «Estudio Trazo» → «ET», «TecnoQro» → «T». */
function inicialesDeEmpresa(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');
}

/**
 * Logotipo de la empresa, o sus iniciales si no tiene o no se puede descargar. Es decorativo: el
 * nombre de la empresa siempre aparece como texto junto a él, así que el lector de pantalla lo omite.
 */
export function LogoEmpresa({ logoUrl, nombre, tamano = 48, testID }: LogoEmpresaProps) {
  // Se recuerda qué URL falló: si llega otra (por ejemplo, tras subir un logotipo nuevo), se reintenta.
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  const caja = { width: tamano, height: tamano, borderRadius: radio.sm };
  const uri = logoUrl ? urlArchivo(logoUrl) : null;

  return (
    <View
      testID={testID}
      style={[estilos.caja, caja]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {uri && uri !== urlFallida ? (
        <Image
          testID={testID ? `${testID}-imagen` : undefined}
          source={{ uri }}
          style={caja}
          resizeMode="contain"
          onError={() => setUrlFallida(uri)}
        />
      ) : (
        <Texto
          variante="subtitulo"
          allowFontScaling={false}
          style={{ color: colores.primario, fontSize: tamano / 2.4, lineHeight: tamano / 1.8 }}
        >
          {inicialesDeEmpresa(nombre)}
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.infoFondo,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    overflow: 'hidden',
  },
});
